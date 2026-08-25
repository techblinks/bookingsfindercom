# Supabase Database Types

## ⚠️ GENERATED OUTPUT — DO NOT HAND-EDIT

`src/integrations/supabase/types.ts` is **generated directly from the live Supabase
database schema**. Manual edits will be silently overwritten on the next regeneration
and introduce drift between the code's view of the database and reality.

If a type looks wrong, fix the database (via forward-only migration) and regenerate —
never patch the file.

## Regeneration

```bash
npm run types:gen
```

Mechanism (as wired in `package.json`):

```
npx -y supabase@2.115.0 gen types --lang=typescript \
  --project-id pjehrnhmjrxrlrhuhqgf \
  > src/integrations/supabase/types.ts
```

- **Project is pinned explicitly** to the production ref `pjehrnhmjrxrlrhuhqgf`
  (the audit-verified project). The local `supabase/config.toml` `project_id`
  field is a different value (local CLI slug) and must not be used as reference.
- **CLI version is pinned** (`supabase@2.115.0`) so output format stays stable
  across machines. Bump deliberately and review the full diff when bumping.
- Default schema set is used (matches prior provenance): `public` + `graphql_public`.
- Requires an authenticated Supabase CLI session (`npx supabase login`) or a stored
  access token. Tokens/keys must never be committed or written into this repo.

## Team rules

1. Regenerate after **every merged migration** — stale types are treated as a defect.
2. Before accepting regenerated output, review the diff:
   - Additions of new tables/columns/RPCs → expected, accept.
   - Removals or renames of previously represented objects → **STOP and investigate**
     before accepting (this has caught real drift before; see "Known behaviour" below).
3. After regeneration, gates must pass: `npx tsc --noEmit`, `npm test`, `npm run build`.

## Known behaviour (documented 2026-08-25)

The pinned generator version does **not** emit `Relationships` annotations for
foreign keys whose target table lives outside the generated schema set
(e.g. `public.site_branding.updated_by -> auth.users.id`, which DOES exist in the
live database — verified via `pg_constraint` on 2026-08-25). This is a lossy
annotation, not evidence of a dropped constraint. It has no effect on this codebase:
no application code uses PostgREST embedded-resource (`nested select`) typing.
If a future feature needs embedded-select typing across schemas, revisit generation
options at that time.
