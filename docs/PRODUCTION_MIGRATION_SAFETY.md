# Production Migration Safety Note

_Established during BF1-B closeout verification (2026-08-25). Applies to all future
schema/data packages (BF1-C … BF1-N and beyond) on project `pjehrnhmjrxrlrhuhqgf`._

## Why BF1-B was acceptable to apply directly to production

BF1-B created five **additive reference tables** (`countries`, `cities`, `airports`,
`airlines`, `metro_airports`) plus indexes/policies. At deployment time:

- No existing table, view, function, or Edge Function referenced them.
- No application code paths touched them (first consumer arrives with BF1-C).
- RLS was enabled with world-read-only grants from the first statement.

Additive + unused ⇒ **low blast radius**: worst case was an unused namespace addition,
not altered behaviour of any production feature. This is the profile that makes a direct
production apply tolerable when local/staging validation has not been run.

## Standing rules going forward

1. **Validate locally or in staging first, whenever practical.**
   Every future migration should be applied to a local Supabase instance (`supabase
   start` + local DB) or a staging branch before production. "Whenever practical" is the
   bar — pure-additive, zero-consumer migrations like BF1-B may proceed directly when
   local validation is impractical, provided the preflight below passes.

2. **Production migrations require an explicit written preflight**, including at minimum:
   - collision scan against existing objects (table/column/index/policy names);
   - additive-only confirmation, or an explicit justification referencing the forward-only
     correction rule (BF-0R: never edit or delete an applied migration; fix by adding a new one);
   - explicit RLS/access model statement (enable RLS + least-privilege grants in the same migration);
   - data-volume and locking estimate for any backfill.

3. **Rollback / corrective-migration plan.** Forward-only culture means rollback is a
   documented **corrective migration** (e.g., `drop table …` or compensating change),
   named and registered in `supabase_migrations.schema_migrations` like any other.
   For additive tables: `DROP TABLE <t> CASCADE;` per object is an accepted corrective plan.

4. **Post-deploy verification.** After applying to production, verify: objects exist as
   expected; row counts within expected ranges; policies/grants match the access model;
   dependent app surfaces smoke-tested once consumers exist.

## Operational notes

- Migrations are applied through the Management API SQL endpoint using the stored CLI
  credential, then **manually registered** into `supabase_migrations.schema_migrations`
  (see `scripts/reference-data/apply-migration.ps1`). Keep both steps paired — an
  unregistered applied migration will drift the local migration history.
- Data imports go through the idempotent importer (`scripts/reference-data/run.ts`),
  which reports inserted/updated/unchanged/deactivated/rejected counters and must reach a
  zero-write steady state on rerun before acceptance.
