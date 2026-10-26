# Local Eum data, translation, and documentation implementation plan

> Historical plan drafted before the 2026-10-20 rollout. It records the original scope and constraints; it is not the current execution status. See `docs/local-eum/README.md` and the dated applied records under `docs/local-eum/migrations/` for the current state.

**Goal:** Make public Local Eum catalog data Supabase-led, restrict synthetic language-friends fixtures to explicit demo mode, prepare draft translations for the 18 new itinerary steps, and update local execution documentation.

**Architecture:** Keep the existing React Router and Supabase repository. Derive catalog records from published Supabase rows, append synthetic fixtures only when `demo=language-friends` is explicitly present, and require that same query flag for fixture detail routes. Add a guarded review-only SQL file that updates exactly the known 18 draft itinerary rows without executing it.

**Tech Stack:** React 19, Vite, JavaScript modules, Supabase PostgreSQL, SQL review file, Node test runner.

**Spec:** User request dated 2026-10-20 — “루나 작업 지시 — 로컬이음 프론트엔드·데이터·문서 정리”.

## Global Constraints

- Do not commit, push, merge, modify remote DB, or deploy Edge Functions.
- Do not modify another teammate's branch or server code.
- Keep Local Eum on Supabase.
- Keep draft translations marked `DRAFT`; do not populate `available_languages`.
- Keep SQL as a review-only file and do not execute it.

### Task 1: Safe shared execution instructions

- Update `docs/local-eum/supabase-setup-guide.md` with safe `origin/main` synchronization steps that preserve local work, and explain how to configure Supabase URL and publishable key for local and hosted frontend environments.
- Verify `/local-eum`, `/local-eum/host/profile?demo=1`, common Header navigation, and React routes without changing shared deployment settings.

### Task 2: Catalog source-of-truth

- Add focused unit tests for the catalog data selector.
- Query all public `PUBLISHED` experiences from Supabase.
- Add language-friends synthetic fixtures only for explicit `demo=language-friends` mode; ensure fixture detail routes also require that flag.
- Preserve region, recruiting, translation, and actual delivery-language filters.

### Task 3: Draft itinerary translations

- Prepare English and Japanese draft translations for the 18 itinerary rows under experience IDs 113–115.
- Add guarded SQL under `docs/local-eum/migrations/` with per-row identity checks and exact affected-row count.
- Do not execute SQL or alter verified host-language metadata.

### Task 4: Documentation and validation

- Refresh `docs/local-eum/README.md` with accurate Supabase, shared execution, demo, and data-state guidance.
- Run Local Eum tests, AI Edge Function tests, build, lint, and `git diff --check`; report failures and warnings.
