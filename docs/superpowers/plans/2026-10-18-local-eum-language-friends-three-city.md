# Local Eum Three-City Language Friends Demo Implementation Plan

> **For agentic workers:** Execute inline in the current `hykang` workspace. Keep each task's change isolated and verify before continuing. Do not stage or commit files.

**Goal:** Add three read-only, DRAFT language-exchange experience previews for Seoul, Busan, and Changwon, owned by existing HOST #500, and seed their matching draft records in Supabase without changing existing data or permissions.

**Architecture:** Store the presentation fixture in a focused Local Eum module and expose it only through the explicit `demo=language-friends` catalog mode. Render slug-based details with a read-only component that never routes to application/payment. Insert matching DRAFT experiences, sessions, steps, and two new places with guarded SQL; reuse existing Changdong place #8 without changing its owner. Keep verified delivery languages empty.

**Tech Stack:** React, React Router, existing Local Eum presentation/i18n utilities, Supabase PostgreSQL and CLI, Node test runner, Vite, Oxlint.

**Spec:** User-provided Local Eum language-friends three-city brief dated 2026-10-18 (`C:/Users/UserK/.codex/attachments/37a53a51-ea23-4220-a4e9-b6da7ec61ff7/붙여넣은 텍스트.txt`) and follow-up confirmation naming `beautimind01@gmail.com` and three venues.

## Global Constraints

- Preserve the 10 existing experiences owned by HOST #500 and all other existing experience rows.
- Associate all three new DRAFT experiences with existing HOST #500; do not create Auth users or HOST rows.
- Keep all new experiences and sessions DRAFT, never expose them as recruiting or accept applications/payments.
- Keep `available_languages` empty until HOST verifies real delivery languages; translations are DRAFT.
- Do not modify shared Header, `App.jsx`, Router, Oracle modules, or RLS/schema policies.
- Reuse Changdong place #8 owned by HOST #500 without updating it; insert only the Seoul Forest and Busan Citizen Park places.
- Do not add unverified coordinates, licensed-image claims, or venue-use permissions.
- Preserve all pre-existing staged, unstaged, and untracked changes. Do not stage, commit, push, merge, or reset.

---

### Task 1: Add deterministic three-city fixture and tests

**Files:**
- Create: `src/pages/local-eum/languageFriendsDemo.js`
- Test: `src/pages/local-eum/languageFriendsDemo.test.js`

**Interfaces:**
- Export `LANGUAGE_FRIENDS_DEMO` with three experiences keyed by stable slugs and `host_id: 500`.
- Export `filterLanguageFriendsDemo(filters)` for region, interest, verified-language, and recruiting-only behavior.
- Each experience has one DRAFT session, six steps totaling 90 minutes, a verified venue address/source, DRAFT translations, `available_languages: []`, and `hero_image_url: null`.

- [ ] Test exactly three entries, one per region, owner #500, empty verified languages, and translations marked DRAFT.
- [ ] Test region selection returns one entry and verified-language filters do not treat planned/demo languages as verified.
- [ ] Test recruiting-only returns zero DRAFT sessions and all timelines total 90 minutes.
- [ ] Implement the frozen fixture data and pure filter without importing Supabase or mutating records.
- [ ] Run `node --test src/pages/local-eum/languageFriendsDemo.test.js`.

### Task 2: Add isolated read-only detail screen and catalog mode

**Files:**
- Create: `src/pages/local-eum/components/LanguageFriendsDemoDetail.jsx`
- Modify: `src/pages/local-eum/ExperienceCatalog.jsx`
- Modify: `src/pages/local-eum/ExperienceDetail.jsx`
- Test: `src/pages/local-eum/languageFriendsDemo.test.js`

**Interfaces:**
- Catalog query `demo=language-friends` selects the fixture list; no fixture is added to ordinary `listExperiences()` results.
- Detail route slugs use the existing `/local-eum/experiences/:experienceId` route; no fake numeric database IDs.
- `LanguageFriendsDemoDetail({ experience, locale })` displays DRAFT warning, host #500 display name, timeline, address, official source, Kakao address-search link, safety, and no application/payment control.

- [ ] Render demo mode with recruiting-only off by default and clearly marked DRAFT; selecting recruiting-only yields no fixture results.
- [ ] Render a matching slug detail via a branch in `ExperienceDetail.jsx`, preserving its existing database-backed path.
- [ ] Use existing Local Eum locale state and draft EN/JA copy; show translation-review status.
- [ ] Show map search link only; do not invoke `PlaceMap`, geocode, or draw a marker for these fixtures.
- [ ] Run focused fixture tests and `npm run build`.

### Task 3: Guarded Supabase DRAFT data insert

**Files:**
- Create: `supabase/seed/20261018_local_eum_language_friends_three_city.sql`

**Interfaces:**
- One transaction verifies HOST #500 matches the supplied login account, owns exactly the existing 10 experiences, has HOST role, and remains approved/public.
- Verify active template 103 is the existing generic Local Eum culture demo template; abort if its expected identity differs.
- Insert Seoul and Busan places for HOST #500 with official source URLs and null coordinates; validate and reuse existing Changdong place #8.
- Insert three `is_demo=true`, `status='DRAFT'` experiences with unique `DEMO-LF-*` codes, empty `available_languages`, DRAFT translations, three DRAFT sessions, and 18 steps.
- Abort if any seed code/title is already present unless the complete expected rows are already present and match exactly; never update or delete existing rows.

- [ ] Run a read-only preflight against `rhkaxmqdkztpbljkunxb` to confirm no seed codes exist and all ownership/address/template preconditions match.
- [ ] Review SQL for additive-only DML, transaction boundaries, and identity-generated IDs.
- [ ] Execute the approved SQL once against the explicit project ref.
- [ ] Run read-only postflight confirming 15 total experiences, original 10 unchanged, 3 new DRAFT experiences, 3 DRAFT sessions, 18 steps, two new places, and unchanged place #8 ownership.
- [ ] Do not modify schema, RLS, Auth, Storage, or Edge Functions.

### Task 4: Regression and working-tree review

**Files:**
- Verify: modified Local Eum source/tests and SQL seed

- [ ] Run `npm run build`, `npm run lint`, `node --test src/pages/local-eum/*.test.js`, `node --test supabase/functions/local-eum-agent/*.test.mjs`, and `npm run test:travel`.
- [ ] Confirm the existing English delivery-language filter still uses only `available_languages`.
- [ ] Confirm public recruiting queries and application/payment flow remain unchanged.
- [ ] Inspect `git status --short` and diffs to ensure only planned hunks were added and no pre-existing staged or unstaged changes were removed.
- [ ] Report DB counts, tests, warnings, remaining host/venue operating approvals, and files changed. Do not stage or commit.
