# BF-0R-5 — Data API / RLS Least-Privilege Hardening (round 4)

Branch: `fix/bf0r5-data-api-rls-hardening` (based on fresh `origin/main`, independent of PR #65), PR #66.
Migrations — **both applied to production** (`pjehrnhmjrxrlrhuhqgf`):
- `supabase/migrations/20260820000000_bf0r5_data_api_rls_hardening.sql` —
  applied after a full read-only pre-apply audit and fresh backup. The
  production postflight that ran immediately afterward returned 54 PASS /
  1 FAIL (`user_roles: anon has no write privilege`).
- `supabase/migrations/20260820170000_bf0r5_user_roles_grant_hardening.sql`
  — the postflight correction for that one FAIL, addressing `user_roles`
  only. See §6a. Forward-only; does not modify `20260820000000`.

**Current production state:** both migrations live; production migration
history is **32/32 applied, zero pending, zero drift**; the final
production postflight (re-run after the correction, including the new
`user_roles` checks) is **58 PASS / 0 FAIL**.

**Cloudflare deployment (human-confirmed from the dashboard):** production
frontend deploys from `techblinks/bookingsfindercom`, branch `main`, via a
Git-connected Worker build — merging PR #66 **will** trigger an automatic
production frontend build/deploy.

Status: **Database hardening is fully live in production (both migrations
applied, postflight clean). PR #66 is NOT yet merged. The frontend has NOT
yet been production-deployed. No Edge Function deployment, no secret
changes.**

## Round 4 corrections (summary)

Round 4's pre-commit review found two real defects surviving from round 3,
plus completed the final scope items from the round-4 instructions:

1. **`service_role` privileges were only ever GRANTed, never REVOKEd
   first.** GRANT is additive — a `GRANT SELECT, INSERT, UPDATE ... TO
   service_role` does not remove any broader privilege `service_role` may
   already hold from Supabase's untracked, platform-level bootstrap grant
   (which differs, and is not guaranteed to match, between local and
   production). Every table that claims an "exactly X, Y" service_role
   privilege set — `subscriptions`, `user_profiles`,
   `optimizer_requests`, `optimizer_results`, `saved_searches`,
   `price_history`, `subscribers` — now runs `REVOKE ALL ...  FROM
   service_role` immediately before its `GRANT ... TO service_role`, so the
   GRANT is the complete and only source of that role's privileges on the
   table, not an addition on top of an unknown baseline.
2. **`subscribe_email` was a subscriber-status/existence oracle, and
   silently reactivated opted-out addresses.** The round-3 design returned
   `true` for both a brand-new email and a reactivated previously-
   unsubscribed email, `false` only when the email was already actively
   subscribed — a two-way oracle over any third party's subscription
   state — and its `ON CONFLICT ... DO UPDATE ... WHERE is_subscribed =
   false` silently flipped a previously-unsubscribed row back to
   subscribed with no proof of ownership. Fixed: `ON CONFLICT (email) DO
   NOTHING` (never touches an existing row of either kind) and `RETURNS
   void` (identical, non-distinguishing response for new / already-active
   / previously-unsubscribed). See §4 below for the full contract.
3. **The frontend's welcome-email trigger was itself a second, oracle-
   shaped existence check.** `usePriceAlerts.ts`'s `addSubscriber()`
   branched on `subscribe_email`'s boolean to decide whether to invoke the
   (separately unauthenticated) `send-welcome-email` Edge Function. That
   branch is removed; the welcome email is temporarily withheld from the
   browser entirely rather than replaced with another state-inferring
   mechanism. See §4/§10 below.
4. **`optimizer_requests`/`optimizer_results` client SELECT dropped.** A
   final repository-wide search confirmed no frontend code reads either
   table (only `run-optimizer`, under `service_role`, does). The
   pre-existing owner-scoped SELECT policies on both tables — carried
   forward unchanged through rounds 1-3 — are now dropped, and SELECT is
   revoked from `anon`/`authenticated` at the grant layer. Historical rows
   are not deleted. See §5a below.
5. **BF-0R-6 formally recorded** (documented, not fixed here): the item
   round 3 had informally noted (`send-welcome-email`'s unauthenticated
   Resend relay, plus its caller-controlled origin/destination HTML), plus
   three further items — `check-price-alerts` running with no
   scheduler/admin verification; anonymous `create_saved_search` permitting
   unverified-email alert creation; and anonymous `subscribe_email`
   permitting an arbitrary, previously-unknown third-party email to be
   enrolled as a new subscriber with no proof of ownership (distinct from,
   and not fixed by, this round's oracle/reactivation correction — see
   item 2 above). See §10.

## Round 3 corrections (summary)

Round 2 shipped with two real defects, found by external line-by-line review:

1. **Alert creation would have broken in production.** Round 2 kept a raw
   `GRANT INSERT ON saved_searches TO anon, authenticated` while removing all
   SELECT. `usePriceAlerts.ts`'s `createAlert()` does
   `.insert({...}).select().single()` — PostgREST's `.select()` after an
   INSERT requires RLS SELECT visibility on the new row to return it. With
   SELECT fully revoked, every real INSERT would have come back empty/errored.
   Fixed by replacing the raw grant with a single `SECURITY DEFINER` RPC,
   `create_saved_search(...)`, that performs the insert as the table owner
   (exempt from RLS) and returns only `{id, created_at}`. `usePriceAlerts.ts`
   now calls this RPC.
2. **`subscribers` was missed entirely in rounds 1-2.** Live production
   migration `20260113154936` defines `"Anyone can unsubscribe with token"`
   as `FOR UPDATE USING (true) WITH CHECK (true)` — no token predicate at
   all despite the name — plus `"Anyone can subscribe"` (`FOR INSERT WITH
   CHECK (true)`). Together these would let any caller holding a raw table
   grant rewrite any subscriber's email, `is_subscribed`, or
   `unsubscribe_token`. Fixed by dropping both policies and adding a single
   RPC, `subscribe_email(...)`, as the only client-reachable write path. The
   real unsubscribe flow (`supabase/functions/unsubscribe`) already runs
   under `service_role` and needed neither policy in the first place.

Two hardening corrections were also applied:

3. `ad_placements`'s two tracking RPCs now use `SET search_path = ''`
   instead of `SET search_path = public` (every relation was already fully
   schema-qualified, so this is a strictly safer, behavior-equivalent
   change).
4. Every "exactly" service_role privilege claim in the local test plan now
   also asserts the *forbidden* privileges are `false` (e.g. `DELETE =
   false`), not just that the required ones are `true`.

All required frontend call sites are updated **in this same branch** so the
migration does not silently break product behavior:
`src/hooks/usePriceAlerts.ts`, `src/hooks/useHomeAds.ts`,
`src/components/home/HeroEmailCapture.tsx`, `src/components/ExitIntentPopup.tsx`,
`src/components/flights/SavedSearchesPanel.tsx`,
`src/integrations/supabase/types.ts` (added the four new RPC signatures).

---

## §1. Live production evidence (unchanged from rounds 1-2, reconfirmed)

Read-only audit against `pjehrnhmjrxrlrhuhqgf` found, and this round re-confirmed:

| Table | Dangerous policy | Effective exposure |
|---|---|---|
| `subscriptions` | `"Service can manage subscriptions"` `FOR ALL USING(true) WITH CHECK(true)`, no `TO` clause (→ PUBLIC) | Any caller can read/write/delete any user's billing/entitlement row |
| `user_profiles` | `"Users can update their own profile"` — no column scoping | Any authenticated user can set their own `plan`, `monthly_optimizer_uses`, `last_optimizer_reset` |
| `optimizer_results` | `"Service can manage results"` `FOR ALL USING(true) WITH CHECK(true)` | Any caller can fabricate/tamper/delete optimizer results |
| `admin_profiles` | `"Users can create their own admin profile"` `WITH CHECK (auth.uid()=user_id)` | Any authenticated user can insert a row into a table named `admin_profiles` (not currently exploitable — table is unread by any auth path — but closed as defense-in-depth) |
| `saved_searches` / `price_history` | `USING (true)` on SELECT/UPDATE/DELETE, no ownership scoping | Any caller can enumerate every user's email + full search history, or tamper with/delete any alert |
| **`subscribers`** (new this round) | `"Anyone can unsubscribe with token"` `FOR UPDATE USING(true) WITH CHECK(true)`, **no token predicate** | Any caller can rewrite any subscriber's email/is_subscribed/unsubscribe_token |

## §2. `saved_searches` / `price_history` — final design

**A. Final design:** Anonymous alert **creation** goes through
`create_saved_search(p_email, p_origin, p_destination, p_departure_date,
p_return_date, p_passengers, p_cabin_class, p_target_price,
p_current_price)` — a `SECURITY DEFINER` RPC, `SET search_path = ''`, fully
schema-qualified, validates required fields, writes one `saved_searches` row
and (if `p_current_price` was supplied) one `price_history` row in the same
transaction, and returns only `{id, created_at}`. `anon`/`authenticated`
have **zero raw table grant** on either table — not even INSERT. All prior
client-facing policies on both tables are dropped; no policy is recreated
(the RPC runs as the table owner, which is exempt from RLS by default,
exactly like the existing `increment_ad_*` design).

**B. My Alerts functionality: REDUCED, not preserved and not fully
disabled** (unchanged conclusion from round 2, now correctly implemented for
creation too). `MyAlerts.tsx`'s "find my alerts by email" flow has no
trustworthy ownership mechanism anywhere in the codebase — email is not
authorization, and the row `id`, while a genuine high-entropy
`gen_random_uuid()`, is never used as a bearer credential by the app (the
flow is fundamentally email-indexed, not id-indexed). Per instruction, a
weak id+email scheme was **not** invented. Creating a new alert works
end-to-end. Viewing, pausing/resuming, deleting existing alerts, and the
price-history chart are unavailable until a dedicated secure-ownership
design (e.g. a per-alert bearer token minted at creation) is built as a
separate product decision. `SavedSearchesPanel.tsx` now renders an honest
"Alert Management Temporarily Unavailable" card instead of attempting calls
that would 403/return nothing.

## §3. `ad_placements` — final architecture

**C. Final architecture:** RPC-only tracking, no trigger. `anon` gets
`SELECT` only (plus `EXECUTE` on the two RPCs). `authenticated` keeps
`SELECT, INSERT, UPDATE, DELETE` at the grant layer (necessary for the admin
path to be reachable at all) but the **only** INSERT/UPDATE/DELETE policy is
`"Admins can manage ad placements"`, gated by `has_role(auth.uid(),
'admin')`. Two `SECURITY DEFINER` RPCs, `increment_ad_impression(p_ad_id)` /
`increment_ad_click(p_ad_id)`, `SET search_path = ''`, fully qualified, are
the only way a non-admin can touch the table — each can only add exactly
`+1` to one named counter on one row where `is_active = true`; no other
column, no arbitrary value.

**D. Exact reason:** column-level grants alone were re-confirmed
insufficient — Postgres cannot distinguish "admin" from "non-admin" within
the single `authenticated` role (admin-ness is data-driven via
`user_roles`), so a column-restricted grant would still let every
authenticated user reach the granted columns; RLS is the only enforcement
mechanism available, and a trigger was judged unnecessary once the
direct-UPDATE path is removed entirely for non-admins — no permissive
policy remains through which a non-admin could even attempt a raw UPDATE,
so there's nothing left for a trigger to guard.

**Documented, not fixed:** an anonymous caller can still call
`increment_ad_impression`/`increment_ad_click` repeatedly to inflate a
counter. This is classified as analytics-abuse (P1), not a security
boundary — impressions/clicks drive no billing or access decision anywhere
in this codebase. The RPC comments say this explicitly; rate-limiting
bot-driven inflation is a separate, out-of-scope follow-up.

**Pre-merge correction (PR #66 review):** migration `20260113151333`
already created three admin-only write policies on this table —
`"Admins can insert ads"`, `"Admins can update ads"`, `"Admins can delete
ads"`, each `has_role(auth.uid(), 'admin')`-gated — before this migration
was ever written. This migration added `"Admins can manage ad placements"`
(the combined `FOR ALL` policy) alongside them without dropping the three
originals. That was never itself a vulnerability — every one of the four
policies required the admin role, so no non-admin write path was ever
open — but it left four redundant permissive policies on the same rows
and made the "the **only** INSERT/UPDATE/DELETE policy" claim above
inaccurate until this correction. All three legacy policies (and this
migration's own combined policy, dropped defensively for idempotency) are
now dropped and exactly one combined policy is recreated, so the "only"
claim above is now literally true, verified by a Part A2 check that
counts exactly one write-capable policy on the table.

## §4. `subscribers` — forensic audit and final contract

**Forensic audit performed before writing any SQL** (see the migration's
§9 preamble for the full ten-point writeup): final local policies
(`pg_policies`), frontend readers/writers (`usePriceAlerts.ts`,
`HeroEmailCapture.tsx`, `ExitIntentPopup.tsx`, `AdminSubscribers.tsx`), every
Edge Function touching the table (`unsubscribe`, `send-bulk-email` — both
`service_role`), unsubscribe-link generation and transmission path, the
welcome-email flow, whether `unsubscribe_token` ever reaches the browser
(no), and confirmation no later migration modifies the original policies.

**Classification:** the exploit requires BOTH the dangerous RLS policy AND
a table-level grant. This repository has never made the
`anon`/`authenticated` grant on `subscribers` explicit, so live-production
exploitability depends on Supabase's untracked platform bootstrap grant —
same caveat as every other table in this migration. Treated as
CONFIRMED-exploitable for planning purposes (the correct conservative
assumption); the local test suite proves it exploitable in a from-scratch
schema regardless of the bootstrap-grant question.

**F. Final contract (round 4, `subscribe_email` corrected):**
- `anon`: zero raw table privilege of any kind. Signing up is possible only
  via `subscribe_email(p_email, p_source)`. Round 4 correction: it now
  **inserts a genuinely new row only** (`ON CONFLICT (email) DO NOTHING`)
  and **returns `void`** — no boolean, no row, no `unsubscribe_token`. A
  previously-unsubscribed email is never reactivated by this RPC no matter
  how many times it is resubmitted, and the caller observes the identical
  outcome (successful completion, nothing returned) whether the email was
  new, already actively subscribed, or previously unsubscribed. See "Round
  4 corrections" above for why the round-3 boolean design was a
  subscriber-status oracle and an unverified-reactivation vector.
- `authenticated`: holds the raw `SELECT`/`UPDATE`/`DELETE` table grant
  (needed so the admin path — `AdminSubscribers.tsx` — is reachable at
  all) but no raw `INSERT` grant — subscriber creation is RPC-only for
  every client role, admin included, same as `anon`. For a **non-admin**
  authenticated caller that grant is inert: the pre-existing
  `has_role`-gated policies (unchanged) are the only `SELECT`/`UPDATE`/
  `DELETE` policies on this table, so RLS — not the grant — is what
  actually stops a non-admin from reading or writing any row. The raw
  grant is retained for the same admin/non-admin-same-role reason as
  `ad_placements`.
- `service_role`: `SELECT, UPDATE` explicitly (`unsubscribe`,
  `send-bulk-email`), preceded by an explicit `REVOKE ALL ... FROM
  service_role` (round 4 — see summary above). No `INSERT` (creation is
  RPC-only), no `DELETE` (no Edge Function deletes subscribers).
- **No client-facing `unsubscribe_by_token(...)` RPC was added.** The real
  unsubscribe flow already runs entirely under `service_role` and needs no
  RLS policy or grant at all; a parallel client-callable version would be
  new, unused surface area with no current caller.
- **No verified-email resubscription flow exists, and none is invented
  here.** A previously-unsubscribed address stays unsubscribed until a
  future, deliberate product decision builds one (proof of ownership —
  e.g. a confirmation link — before flipping `is_subscribed` back to
  `true`). Tracked as a BF-0R-6 item (§10).

**Frontend welcome-email change (round 4):** `usePriceAlerts.ts`'s
`addSubscriber()` previously branched on `subscribe_email`'s boolean result
to decide whether to invoke `send-welcome-email`. Because `subscribe_email`
now returns `void`, and because that branch was itself a second,
Edge-Function-triggering existence oracle even before the return-type
change, the branch is removed entirely — `createAlert()` now calls
`addSubscriber()` and never calls `send-welcome-email` from the browser.
The welcome email is **temporarily withheld**, not replaced with another
state-inferring mechanism. Re-enabling it requires a non-oracle-shaped
trigger — e.g. a server-side hook keyed off a genuine new-row `INSERT`,
not off anything a client can observe — designed as part of BF-0R-6 (§10).

**Known, out-of-scope, not-fixed finding:** `supabase/functions/
send-welcome-email` has no authentication and will send a real email via
Resend to any `email` supplied in the request body, with caller-controlled
`origin`/`destination` interpolated into the HTML — an unauthenticated
email-relay/spam-abuse vector and a potential HTML-injection vector into a
real outbound email. This is an Edge Function authorization issue, not a
database/RLS issue; no evidence was gathered this round on rate limits or
product impact of restricting it, so it is reported, not fixed, per
instruction not to expand scope without evidence. See §10.

## §5. Explicit `service_role` grants added (round 4: exact-privilege design)

| Table | Grant | Traced to |
|---|---|---|
| `subscriptions` | SELECT, INSERT, UPDATE | `stripe-webhook` |
| `user_profiles` | SELECT, INSERT, UPDATE | `stripe-webhook`, `get-subscription-status`, run-optimizer (PR #65, not yet merged) |
| `optimizer_requests` | SELECT, INSERT | `run-optimizer` (PR #65) |
| `optimizer_results` | INSERT | `run-optimizer` (PR #65) |
| `saved_searches` | SELECT, UPDATE | `check-price-alerts` (no INSERT — creation is RPC-only) |
| `price_history` | INSERT | `check-price-alerts` (ongoing price observations; the *initial* point is written by `create_saved_search()` as the table owner, not by service_role) |
| `subscribers` | SELECT, UPDATE | `unsubscribe`, `send-bulk-email` |
| `user_roles` | SELECT (postflight correction — see §6a) | `_shared/admin-auth.ts`'s `requireAdmin()` (`generate-route-page`, `generate-seo-content`), `get-admin-stats` |

**Postflight correction note:** `user_roles`'s `service_role` `SELECT` was
added in the follow-up migration `20260820170000_bf0r5_user_roles_grant_hardening.sql`,
not in `20260820000000`. The original migration's section 6 stated "No
explicit service_role grant is added: no current Edge Function writes
user_roles directly" — true about writes, but incomplete: it did not
account for the three Edge Functions that *read* `user_roles` under a
service_role-keyed client to authorize admin access. See §6a for the full
account, including why `anon`'s raw grant was also closed in the same
migration.

**Round 4 design change:** every row above is now preceded, in the
migration, by an explicit `REVOKE ALL ON <table> FROM service_role`
immediately before the `GRANT`. Rounds 1-3 granted these privileges but
never first revoked whatever `service_role` might already hold from
Supabase's untracked platform-level bootstrap grant — GRANT is additive,
so a broader pre-existing privilege (e.g. `DELETE`) would have survived
underneath an "exactly SELECT/UPDATE" GRANT. The REVOKE-then-GRANT pattern
makes each table's `service_role` privilege set exact and
self-contained, not dependent on an unknown, untracked baseline that can
legitimately differ between local and production.

Every grant above is verified `true`, and every non-listed privilege for
that role on that table is verified `false`, by the local test plan (Part
A) — this was already true before round 4 in a from-scratch local reset,
but the explicit REVOKE now makes the "exactly" claim structurally
guaranteed rather than incidentally true because service_role happened to
start from zero locally.

## §6. Final policy/grant matrix

| Table | anon | authenticated (non-admin) | authenticated (admin) | service_role |
|---|---|---|---|---|
| `subscriptions` | none | SELECT own row | SELECT own row | SELECT, INSERT, UPDATE |
| `user_profiles` | none | SELECT own row | SELECT own row | SELECT, INSERT, UPDATE |
| `optimizer_requests` | **none** (round 4: SELECT dropped) | **none** (round 4: SELECT dropped) | same | SELECT, INSERT |
| `optimizer_results` | **none** (round 4: SELECT dropped) | **none** (round 4: SELECT dropped) | same | INSERT |
| `admin_profiles` | none | none | none | (untouched) |
| `user_roles` | **none** (postflight correction) | effective SELECT own roles only; writes denied by RLS | role management via has_role-gated RLS | **SELECT only** (postflight correction) |
| `ad_placements` | SELECT active + EXECUTE tracking RPCs | SELECT active + EXECUTE tracking RPCs | full via `has_role` | (not needed; browser-only feature) |
| `saved_searches` | EXECUTE `create_saved_search` only | same | same (no special path) | SELECT, UPDATE |
| `price_history` | none (writes happen inside the RPC) | same | same | INSERT |
| `subscribers` | EXECUTE `subscribe_email` only (round 4: RPC returns void, never reactivates) | same | full via `has_role` | SELECT, UPDATE |

Every `service_role` cell above is now reached via explicit
`REVOKE ALL ... FROM service_role` + exact `GRANT` (round 4, §5), not GRANT
alone.

**§6a. `user_roles` — postflight correction (migration
`20260820170000_bf0r5_user_roles_grant_hardening.sql`), grant layer vs.
effective RLS access.** `20260820000000` (already applied to production)
made no grant change to this table — its section 6 concluded "No change
made", reasoning that RLS alone was sufficient. The production postflight
that ran immediately after applying `20260820000000` returned 54 PASS / 1
FAIL: `"user_roles: anon has no write privilege"` — direct inspection
showed `anon` held raw `SELECT`/`INSERT`/`UPDATE`/`DELETE` **table-grant**
privilege on `user_roles` (Supabase's platform bootstrap grant, the same
untracked-grant pattern documented for every other table in this project,
just never independently checked for this one). This table's **grant
layer** and its **effective access** (grant + RLS combined) had diverged,
and only the grant layer was ever documented:

| Role | Grant layer (raw table privilege) | Effective access (grant + RLS) |
|---|---|---|
| `anon` | none, post-correction (was full SELECT/INSERT/UPDATE/DELETE pre-correction — never independently exploitable, since no permissive policy exists, but never explicitly closed either) | none |
| `authenticated` (non-admin) | SELECT + INSERT/UPDATE/DELETE (**unchanged** by the postflight correction — see below) | SELECT own row only (`"Users can view their own roles"`); every write is denied — the only write-capable policy, `"Admins can manage roles"`, requires `has_role(auth.uid(), 'admin')`, which a non-admin fails |
| `authenticated` (admin) | same raw grant as above | full role management via the same `has_role`-gated `"Admins can manage roles"` policy, unchanged |
| `service_role` | **SELECT only**, post-correction (was full SELECT/INSERT/UPDATE/DELETE pre-correction via the same untracked bootstrap grant) | SELECT only — matches actual usage exactly (see below) |

**Why `authenticated`'s raw grant is deliberately left untouched:** a
repository-wide re-audit (`user_roles`, `.from("user_roles")`,
`.from('user_roles')`, `has_role(`, `requireAdmin`) found zero
INSERT/UPDATE/DELETE against `user_roles` from any client role anywhere in
`src/` or `supabase/functions/`. The RLS policy already fully blocks any
non-admin write regardless of the grant (no permissive policy exists to
combine with it), so revoking the raw `authenticated` grant would change
nothing observable — and doing so without a separately-proven functional
need would be scope creep beyond this narrow postflight correction, not a
security improvement. If a future round redesigns role management, that
grant can be revisited then, with its own evidence.

**Why `service_role` needed an explicit correction, not just documentation
of the status quo:** three Edge Functions read `user_roles` under a
`service_role`-keyed client — `supabase/functions/_shared/admin-auth.ts`'s
`requireAdmin()` (used by `generate-route-page` and `generate-seo-content`)
and `supabase/functions/get-admin-stats/index.ts`'s inline equivalent —
all performing the identical read-only, own-row
`.from('user_roles').select('role').eq('user_id', <resolved id>).eq('role',
'admin').maybeSingle()`. **The BF-0R-5 documentation previously stated
service_role has no `user_roles` requirement — that was incorrect** and is
corrected here: service_role's `SELECT` is a real, required capability for
admin authorization to function in these Edge Functions, and is now
granted explicitly (not left to an untracked bootstrap grant that also,
incorrectly, included INSERT/UPDATE/DELETE it never uses).

**Browser-side readers** (`src/hooks/useAdminAuth.ts`,
`src/lib/analytics.ts`'s internal `requireAdmin()`) use the ordinary
`authenticated` client for the same own-row, read-only pattern — unaffected
by this correction since `authenticated`'s grant is unchanged.

**The one legitimate writer**, `handle_new_user_admin_check()` (migration
`20260113145901`), is `SECURITY DEFINER` and runs `AFTER INSERT ON
auth.users` with the function owner's privilege — entirely independent of
the `anon`/`authenticated`/`service_role` grants this correction touches.
It is unaffected.

**Resolution, confirmed live:** `20260820170000` has been applied to
production. The full read-only production postflight, re-run after the
correction and extended with the granular `user_roles` checks in this
section (exact `anon`/`service_role` privileges, both policies' continued
presence and scoping, exactly-2-policies), now returns **58 PASS / 0
FAIL** — the original 1 FAIL is closed, and no other check regressed.

## §7. Local verification results

**Round 4.** Fresh `npx supabase db reset` applied all 30 pre-existing
migrations plus this one (31 total) cleanly. The round-4 test plan run initially
failed on `PART A2` with `subscribe_email still contains a DO UPDATE
clause` — a false positive: the structural check for "no reactivating
`DO UPDATE`" matched a phrase inside the function's own explanatory SQL
comment ("not DO UPDATE"), not executable code. Fixed by rewording the
comment (no logic change) and confirmed via `pg_get_functiondef` that the
deployed function body contains only `ON CONFLICT (email) DO NOTHING`.
After that fix, a fresh `supabase db reset` + the full round-4 test plan
passed cleanly:
```
NOTICE:  PART A: all catalog-based grant assertions passed.
NOTICE:  PART A2: all policy/function-definition sanity checks passed.
NOTICE:  PART B: all behavioural RLS/RPC tests passed.
```
Round-4-specific additions exercised: `service_role` "exactly" assertions
for all 7 tables now provably rest on an explicit REVOKE (not just
GRANT); `optimizer_requests`/`optimizer_results` have zero client SELECT
(catalog check) and zero client-facing policies (A2), and a live
role-switched `anon`/`authenticated` `SELECT` against both tables raises
a hard permission-denied error (Part B, tests R4-1 through R4-4);
`subscribe_email` structurally returns `void` and uses `ON CONFLICT (email)
DO NOTHING` (A2); and, behaviourally (Part B), a previously-unsubscribed
fixture row's `is_subscribed`/`unsubscribed_at`/`unsubscribe_token` are all
provably unchanged after an anonymous `subscribe_email` call for that same
address, and an already-active fixture row's `subscribed_at` is unchanged
too — proving both the opted-out-protection and the non-distinguishing-
response requirements behaviourally, not just by return-type inspection.

**Round 3.** Fresh `npx supabase db reset` applied all 30 pre-existing migrations
plus this one (31 total) cleanly, twice (once before, once after the
test-methodology fix below).

**Test-methodology bug found and fixed while writing the round-3 test
plan** (documented here honestly, not hidden — same discipline as round
2's test 9 bug): the new subscribers non-admin test initially tried to
verify "the UPDATE had no effect" by immediately re-`SELECT`ing the row
*as the same non-admin role*. But `subscribers` has no SELECT policy at all
visible to a non-admin (correctly — unlike `ad_placements`, which has a
public "view active ads" policy that happened to make the analogous
round-2 check work). The verifying `SELECT` therefore returned zero rows
(`NULL`), which the check misread as "the row changed" — a false failure,
not a real vulnerability. Fixed by moving the verification to a
superuser/RLS-exempt context, executed **before** the subsequent admin
block performs its own legitimate update to the same row (so the check
can't confuse "non-admin did nothing" with "admin later changed it back").

After that fix, a fresh `supabase db reset` + the full test plan passed
cleanly:
```
NOTICE:  PART A: all catalog-based grant assertions passed.
NOTICE:  PART A2: all policy/function-definition sanity checks passed.
NOTICE:  PART B: all behavioural RLS/RPC tests passed.
```
Part A covers all "exactly" privilege assertions (required privileges
`true` AND every other privilege `false`) plus RPC `EXECUTE` grants. Part
A2 covers policy text/has_role-scoping, absence of dangerous policies, the
round-1 trigger's removal, and `search_path=''` hardening (verified via
`pg_proc.proconfig`) for all four RPCs, plus confirms neither
`create_saved_search` nor `subscribe_email` exposes a server-managed field
as a parameter. Part B exercises real `anon`/`authenticated`
(non-admin)/`authenticated` (admin) role-switches, including genuine
`create_saved_search()` and `subscribe_email()` RPC round trips (row counts,
returned ids, the initial `price_history` write, empty/NULL-email
rejection, and — since the round-4 correction — the void/non-distinguishing
response semantics for a new, an already-active, and a previously-
unsubscribed email alike) — not just static grant checks.

Other checks (re-run in round 4, against the round-4 migration):
- `npx tsc --noEmit` — clean, exit 0. `subscribe_email`'s generated-types
  `Returns` was changed from `boolean` to `undefined` (void) to match the
  round-4 function signature; the other three RPC signatures (added in
  round 3) are unchanged.
- `npm run build` — succeeds (`vite build`, 3226 modules, no errors; the
  pre-existing >500kB chunk-size advisory is unrelated to this migration).
- `npm test` (full Vitest suite) — 2947 passed, 2 failed, out of 2949
  tests — identical pass/fail counts to round 3. Both failures are
  pre-existing and unrelated to this migration: an `outboundTracking.test.ts`
  white-label-host assertion, and a `tiqets-catalog`
  migration-filename-ordering test. Neither touches `subscribers`,
  `saved_searches`, `price_history`, `ad_placements`, `optimizer_requests`,
  `optimizer_results`, or any file changed in this branch. Six additional
  test files fail to even load, all pre-existing (missing `supabaseUrl` env
  var in that test environment) and all in unrelated feature areas
  (things-activity detail pages, destinations service, OptimizerTrust,
  MobileFlightSearch) — none reference any file this migration or its
  frontend follow-ups touch. No dedicated test files exist for
  `usePriceAlerts.ts`, `HeroEmailCapture.tsx`, `ExitIntentPopup.tsx`,
  `SavedSearchesPanel.tsx`, or `useHomeAds.ts`.
- `git diff --check` — clean, exit 0 (only harmless CRLF/LF line-ending
  notices on two files).

## §8. Files changed (committed and pushed for review, not merged)

- `supabase/migrations/20260820000000_bf0r5_data_api_rls_hardening.sql` (rewritten, round 4: service_role explicit REVOKE-then-GRANT on 7 tables; subscribe_email rewritten to ON CONFLICT DO NOTHING + RETURNS void; optimizer_requests/optimizer_results client SELECT policies dropped and grant revoked; BF-0R-6 findings section added)
- `supabase/tests/bf0r5_data_api_rls_hardening_test_plan.sql` (rewritten, round 4: new optimizer_requests/optimizer_results SELECT-forbidden assertions in Part A/A2/B; subscribe_email boolean-return tests replaced with void-return + opted-out-protection + non-distinguishing-response tests in Part B; new subscribe_email structural checks in Part A2)
- `BOOKINGSFINDER_BF0R5_DATA_API_SECURITY.md` (this file, updated for round 4)
- `src/hooks/usePriceAlerts.ts` (round 4: addSubscriber no longer returns/branches on subscriber-new-vs-existing state; welcome-email call removed from createAlert)
- `src/integrations/supabase/types.ts` (round 4: subscribe_email's Functions.Returns changed from boolean to undefined/void)
- `src/hooks/useHomeAds.ts` (unchanged since round 3: trackImpression/trackClick → RPCs)
- `src/components/home/HeroEmailCapture.tsx` (unchanged since round 3: subscribe → RPC)
- `src/components/ExitIntentPopup.tsx` (unchanged since round 3: subscribe → RPC)
- `src/components/flights/SavedSearchesPanel.tsx` (unchanged since round 3: renders the honest "temporarily unavailable" state instead of attempting denied calls)
- `supabase/.branches/` (local Supabase CLI artifact — not a project file, not tracked)

## §9. Rollout plan — DB portion complete, frontend deploy pending merge

**This change has two coupled parts that must ship together, not
independently:** a database migration (grants/policies/RPCs) and frontend
RPC callers (`usePriceAlerts.ts`, `useHomeAds.ts`, `HeroEmailCapture.tsx`,
`ExitIntentPopup.tsx`, `SavedSearchesPanel.tsx`) that assume the migration's
RPCs already exist. Deploying either half alone produces a real, if
temporary, functional regression — this section exists so that tradeoff is
explicit and deliberate, not accidental.

**Why ordering matters:**
- **Migration before frontend:** if only the migration lands, the
  *currently-deployed* (pre-BF-0R-5) frontend still performs raw
  `.from('saved_searches').insert(...).select()`,
  `.from('subscribers').insert(...)`, and `.from('ad_placements').update(...)`
  calls. After the migration, every one of those raw calls is
  permission-denied (grants are fully revoked) — price-alert creation,
  newsletter signup, and ad impression/click tracking would all silently
  break in production until the matching frontend deploy lands.
- **Frontend before migration:** the RPC calls added in this branch
  (`create_saved_search`, `subscribe_email`, `increment_ad_impression`,
  `increment_ad_click`) do not exist in production until the migration
  runs — every one of those calls would 404/PGRST-error until the DB change
  lands.
- **Conclusion:** these must ship in the **same release**, with the
  migration applied first (schema/RPCs must exist before the frontend that
  calls them goes live), immediately followed by the frontend deploy. The
  gap between the two is the "temporary degradation window" below.

**Degradation window (between migration apply and frontend deploy):**
during the interval where the migration is live but the old frontend
bundle is still served (however short — e.g. a rolling deploy, a CDN
cache still serving old assets, or a delay between migration and app
deploy steps), users hitting the old bundle will see price-alert creation,
newsletter signup, and ad-tracking silently fail (client-side errors
caught and swallowed by existing try/catch blocks in those components —
no crash, but no functional effect either). This is a functional
regression, not a security regression: nothing becomes *more* exposed
during the window, features that were working become temporarily
unavailable. Minimizing this window (deploying the frontend build
immediately after the migration, ideally as an atomic release step) is a
deployment-process decision for whoever executes this rollout, not
something this migration can eliminate on its own.

**Steps:**
1. ✅ **Done.** Fresh backup taken (schema, data, roles, migration history,
   SHA-256 manifest) at `C:\Users\MSIV\Desktop\BF-BACKUPS\bookingsfinder-20260820-pre-bf0r5\`,
   outside the git repo, prior to any production write.
2. ✅ **Done.** `20260820000000_bf0r5_data_api_rls_hardening.sql` applied
   to production, followed by `20260820170000_bf0r5_user_roles_grant_hardening.sql`
   (the postflight correction, §6a) after the first postflight run
   surfaced one FAIL. Production migration history: **32/32 applied, zero
   pending, zero drift**.
3. ✅ **Done.** The read-only production postflight (58 checks, including
   the round-4 exact-service_role-privilege, optimizer-table-lockdown, and
   postflight-correction `user_roles` checks) returns **58 PASS / 0 FAIL**.
4. ⏳ **Pending — tied to merging PR #66.** Cloudflare has been
   human-confirmed (dashboard) to build/deploy the production Worker
   automatically from `techblinks/bookingsfindercom`'s `main` branch —
   merging PR #66 **will** trigger this deploy. Because the database
   portion (steps 1-3) is already live, the ordering risk described above
   is now resolved in the safe direction: the RPCs
   (`create_saved_search`, `subscribe_email`, `increment_ad_impression`,
   `increment_ad_click`) the new frontend calls already exist in
   production, so merging and deploying the frontend now will **not**
   hit the "frontend before migration" failure mode — only the (much
   smaller, already-mitigated) "migration before frontend" window applied,
   and it has already closed now that both migrations are live.
5. Separately and later (BF-0R-6, §10): decide on a secure-ownership
   design for viewing/managing existing alerts (My Alerts); restrict/
   rate-limit `send-welcome-email`; add scheduler/admin verification to
   `check-price-alerts`; and design verified-email ownership for alert
   creation and for a future subscriber resubscription flow. All
   explicitly out of scope for this migration.

**Current state:** both migrations are live in production (step 1-3 done).
PR #66 is **not yet merged**; the frontend has **not yet** been
production-deployed; no Edge Function deployment; no secret changes.

## §10. BF-0R-6 — documented, not fixed here (next Edge/alerts security phase)

Per instruction, database/RLS hardening is this migration's full scope;
these findings are recorded for a dedicated follow-up phase rather than
folded into BF-0R-5. Two of them are anonymous email-ownership surfaces
(items 3 and 4 below) that are easy to conflate but are architecturally
distinct — both are called out explicitly so neither gets silently dropped
from the follow-up scope:

1. **`supabase/functions/send-welcome-email`** — no authentication check;
   accepts an arbitrary `email` field and sends a real email via Resend to
   whatever address is supplied, with caller-controlled `origin`/
   `destination` values interpolated into the HTML body. This is both an
   unauthenticated email-relay/spam-abuse primitive and a potential
   HTML-injection vector into a real outbound email. Edge Function
   authorization issue, not a database/RLS issue — noted in rounds 1-3 as
   well; formally tracked as a BF-0R-6 item here.
2. **`supabase/functions/check-price-alerts`** — runs as `service_role`
   (bypasses RLS unconditionally), enumerates every active alert, calls
   the Travelpayouts API, writes DB rows, and sends alert emails. No
   authenticated scheduler/admin verification of the caller was observed
   in this round's review — anyone able to reach the function's URL can
   presumably trigger a full alert-processing run.
3. **Anonymous `create_saved_search(...)` — no proof of email ownership.**
   By design (§2), this RPC lets an anonymous caller create a price alert
   for an arbitrary email address with no verification that the caller
   controls that address. Acceptable for the current, deliberately-reduced
   "creation works, management doesn't" scope of BF-0R-5, but a blocker
   for a fully-automated, production-safe alerting pipeline:
   verified-email ownership is needed before alert creation can be
   trusted, and abuse/rate controls are needed on both creation and on
   `check-price-alerts`' outbound email volume.
4. **Anonymous `subscribe_email(...)` — no proof of email ownership,
   distinct from the round-4 oracle/reactivation fix.** Round 4 correctly
   closed the subscriber-status/existence oracle and correctly prevents an
   anonymous caller from reactivating a previously-unsubscribed address
   (§4/§B above) — `subscribe_email` now returns no distinguishing state
   and never touches an existing row. That fix does **not** address a
   separate, still-open surface: an anonymous caller can submit any
   arbitrary, previously-unknown, third-party email address and create a
   brand-new `subscribers` row for it (`ON CONFLICT (email) DO NOTHING`
   still performs the INSERT when no conflicting row exists) — there is no
   proof the caller controls that address. This is not a regression to fix
   by changing `subscribe_email`'s logic again inside BF-0R-5; the correct
   fix is a verified-email/double-opt-in (or equivalent confirmation-link)
   step before a newly-created subscriber is treated as consenting to
   receive bulk/marketing email, layered on top of the existing RPC-only
   write path. Public signup also needs reasonable rate/abuse controls
   (e.g. per-IP or per-email submission throttling) to prevent database
   stuffing — mass creation of unconfirmed subscriber rows for addresses
   the submitter does not own.

These four items are the next separate BF-0R-6 Edge/alerts security phase:
send-welcome-email's unauthenticated Resend sender; check-price-alerts'
missing scheduler/admin authorization; and, together, items 3 and 4 above
mean automated alert and bulk-email delivery both require verified email
ownership plus provider/rate-abuse controls before they are
production-safe to run unattended.
No code in this migration or its frontend follow-ups addresses them.
