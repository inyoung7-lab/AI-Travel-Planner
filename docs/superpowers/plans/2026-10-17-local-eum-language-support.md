# Local Eum English and Japanese Support Implementation Plan

> **For agentic workers:** Execute this plan in order, using the checkpoints below. Keep all work limited to Local Eum localization and preserve unrelated staged and unstaged work in the existing `hykang` worktree.

**Goal:** Add Korean, English, and Japanese display support to Local Eum pages, translate Local Eum content, and keep host-delivery-language filtering independent from the display-language setting.

**Architecture:** Add a Local Eum-only locale dictionary and persisted locale store, expose one shared selector in each Local Eum page, and resolve experience/host/step translations from JSON fields on existing records. Store delivery languages separately on each experience, expose them as a catalog filter, and prepare a guarded additive SQL migration without applying it to Supabase.

**Tech Stack:** React 19, React Router 7, Supabase JS, Vite, oxlint, PostgreSQL JSONB and text arrays.

**Spec:** `docs/superpowers/specs/2026-10-17-local-eum-language-support-design.md`

## Global Constraints

- Apply only to Local Eum routes: catalog, experience detail/application, host profile editor, and host session/experience editor.
- Remember the display language in browser storage and apply it across Local Eum routes. Do not change the shared site header or unrelated pages.
- Keep existing Korean columns as canonical source values; never copy translated values over them.
- Do not change primary keys, host ownership, approval status, published state, session records, place ownership, or existing Korean copy.
- Add narrow `UPDATE` column grants for the new editable fields while reusing the existing row-level owner/admin policies. Do not grant table-wide update or let one host edit another host's content.
- Populate `available_languages` only with languages each host confirms they can use. Translation availability alone must never imply that a host can conduct the program in that language.
- This plan does not authorize applying a Supabase migration, updating remote content, committing, or pushing.

---

## File map

- Create `src/pages/local-eum/localEumI18n.js` for the Korean/English/Japanese UI dictionary, locale validation, and field-level translation fallback.
- Create `src/pages/local-eum/localEumLocaleStore.js` for a Local Eum-only persisted locale store and React hook.
- Create `src/pages/local-eum/components/LocalEumLanguageSelector.jsx` and `LocalEumLanguageSelector.css` for the reusable selector; do not put it in the common header.
- Modify `src/pages/local-eum/ExperienceCatalog.jsx` and `experiencePresentation.js` to select display locale and filter by `available_languages` independently.
- Modify `ExperienceDetail.jsx`, `components/ExperienceDetailContent.jsx`, and `components/ExperienceApplicationFlow.jsx` to localize detail and application screens and render translated records.
- Modify `HostProfileEdit.jsx`, `SessionEdit.jsx`, and `components/ExperienceTimelineEditor.jsx` to localize host workflows and let hosts edit their own translated bio, experience copy, itinerary, and delivery-language availability.
- Modify `sessionRepository.js` for owner-authorized reads and writes of host/experience/step JSON translations and `available_languages`.
- Create `docs/local-eum/migrations/20261017_local_eum_languages.draft.sql` as a guarded, additive SQL draft. Do not execute it against Supabase.
- Create `docs/local-eum/local-eum-language-rollout.md` with the draft translation review workflow and the separate remote-application checkpoint.
- Do not modify `src/App.jsx`, `src/components/header.jsx`, or files unrelated to this feature.

## Task 1: Add Local Eum locale dictionary and persisted state

**Files:**
- Create: `src/pages/local-eum/localEumI18n.js`
- Create: `src/pages/local-eum/localEumLocaleStore.js`
- Create: `src/pages/local-eum/components/LocalEumLanguageSelector.jsx`
- Create: `src/pages/local-eum/components/LocalEumLanguageSelector.css`

**Interfaces:**
- `SUPPORTED_LOCALES`: the immutable list `['ko', 'en', 'ja']`.
- `getLocalEumLocale()`: return a supported `localStorage` locale, falling back to `ko`.
- `setLocalEumLocale(locale)`: validate, persist, and notify same-tab subscribers; reject unsupported values.
- `subscribeLocalEumLocale(callback)`: subscribe to same-tab changes and browser `storage` events.
- `useLocalEumLocale()`: React hook using `useSyncExternalStore` and the locale-store interface.
- `translate(locale, key, params = {})`: return a dictionary string with simple named replacements and a Korean fallback.
- `localizedField(record, field, locale)`: return localized JSON field when present, otherwise its existing Korean field.
- `LocalEumLanguageSelector({ locale, onChange, className })`: render accessible Korean, English, and Japanese controls.

- [ ] **Step 1: Define locale and localized-field utilities.** Add the supported locale list, dictionary lookup, safe locale validation, and field-level Korean fallback without touching page components.
- [ ] **Step 2: Add persisted locale state.** Use storage key `local-eum-locale`; update same-tab subscribers after writes and subscribe to `storage` for other tabs.
- [ ] **Step 3: Add the selector component.** Use buttons with `aria-pressed`, visible language names, and a localized accessible label.
- [ ] **Step 4: Add shared UI copy.** Populate all UI keys needed by catalog, details, application form, host profile editor, and session editor in ko/en/ja before wiring pages.

## Task 2: Separate display locale from program-language filtering

**Files:**
- Modify: `src/pages/local-eum/ExperienceCatalog.jsx`
- Modify: `src/pages/local-eum/experiencePresentation.js`
- Modify: `src/pages/local-eum/Traveler.css`

**Interfaces:**
- `filtersFromParams(params)` retains `region`, `interest`, `recruitingOnly`, `sort`, and reads one or more values from `programLanguage`. Legacy `lang=ko|en|ja` initializes display locale and is not a delivery-language filter.
- `filterCatalogExperiences(items, filters)` checks selected program languages against each item's `available_languages`; when multiple languages are selected, match any selected language.
- The display selector writes only the locale store. It must not change search filter query parameters.

- [ ] **Step 1: Change catalog filter state.** Rename the existing `language` filter field to `programLanguages` and parse only `programLanguage` query values; leave `lang` available for legacy display-locale initialization.
- [ ] **Step 2: Replace the old selector in the filter panel.** Render `LocalEumLanguageSelector` under the translated display-language legend; add a separate translated `Program language` multi-select/chip group.
- [ ] **Step 3: Connect filtering to metadata.** Update `filterCatalogExperiences` to read `available_languages`, keep results unchanged when no program language is selected, and preserve existing region, interests, recruiting, and sort behavior.
- [ ] **Step 4: Localize catalog output.** Translate breadcrumbs, headings, filters, result count, loading/error/empty states, card labels, and footnote; display localized experience title/summary with Korean fallback.
- [ ] **Step 5: Preserve visual styling.** Keep the existing muted filter palette and add responsive styles for the separate selector and program-language chips.

## Task 3: Localize traveler detail and application pages

**Files:**
- Modify: `src/pages/local-eum/ExperienceDetail.jsx`
- Modify: `src/pages/local-eum/components/ExperienceDetailContent.jsx`
- Modify: `src/pages/local-eum/components/ExperienceApplicationFlow.jsx`
- Modify: `src/pages/local-eum/applicationValidation.js`
- Modify: `src/pages/local-eum/Traveler.css`

**Interfaces:**
- Detail rendering consumes `experience`, `host`, and `steps` records with `translations` JSON fields and the current locale.
- `localizedField(record, field, locale)` provides the canonical fallback behavior.

- [ ] **Step 1: Add the shared locale selector to detail controls.** Preserve the current experience ID, session query, and application state when changing display locale.
- [ ] **Step 2: Localize the detail experience.** Translate headings, host section, itinerary labels, location/map instructions, fee/session metadata, empty states, and errors; resolve experience, host bio, and step text from JSON by locale.
- [ ] **Step 3: Localize application form copy.** Translate labels, consent text, validation messages, submission progress/success/failure messages, demo payment descriptions, and account/guest application text. Preserve the form input values when locale changes.
- [ ] **Step 4: Add missing-translation notices.** When visible content falls back to Korean, render the localized preparation notice once per content section rather than repeating it for each field.
- [ ] **Step 5: Check responsive behavior.** Ensure the selector remains available at narrow widths and does not cover map controls or application actions.

## Task 4: Add the guarded additive schema draft and repository methods

**Files:**
- Create: `docs/local-eum/migrations/20261017_local_eum_languages.draft.sql`
- Modify: `src/pages/local-eum/sessionRepository.js`

**Interfaces:**
- Add `translations jsonb not null default '{}'::jsonb` to `lc_hosts`, `lc_experiences`, and `lc_experience_steps`.
- Add `available_languages text[] not null default array[]::text[]` to `lc_experiences`.
- Add narrowly scoped column grants and reuse current owner/admin row policies.
- Repository functions validate locale keys (`en`, `ja`), supported program languages (`ko`, `en`, `ja`), and preserve other locales when updating JSON.

- [ ] **Step 1: Inspect the committed schema and policies.** Verify actual column names and grants in the migration sources and current `sessionRepository.js` update paths; the draft must abort if a required table or expected policy is absent.
- [ ] **Step 2: Write only additive SQL.** Add the four columns, checks for allowed locale/language codes, narrow update grants, comments, and transactional preconditions. Do not change existing rows or data.
- [ ] **Step 3: Add profile repository operations.** Extend the existing host profile read/update functions to fetch and update translations while preserving the current Korean `bio` and all other locale JSON values.
- [ ] **Step 4: Add experience and step repository operations.** Save localized experience copy, step translations, and confirmed delivery languages through existing owner-checked rows; do not change host IDs or row IDs.
- [ ] **Step 5: Keep current schema compatible.** Keep public `select('*')` reads tolerant of absent translation fields and make host repository reads fall back to the existing columns before the migration is applied. Do not report translation saves as successful when localization columns are unavailable.

## Task 5: Add host translation and delivery-language editing

**Files:**
- Modify: `src/pages/local-eum/HostProfileEdit.jsx`
- Modify: `src/pages/local-eum/SessionEdit.jsx`
- Modify: `src/pages/local-eum/components/ExperienceTimelineEditor.jsx`
- Modify: `src/pages/local-eum/SessionEdit.css`

**Interfaces:**
- Host profile editor loads/saves `lc_hosts.translations` for English and Japanese bio while preserving Korean `bio`.
- Existing experience detail editor gains English and Japanese fields in addition to Korean `detail_description`.
- Itinerary steps use the same step IDs and order for ko/en/ja; translated title/description values are persisted in each step's JSON.
- The experience editor can set `available_languages` independently from translation review status.

- [ ] **Step 1: Add selector and translate profile form labels.** Keep the existing host authorization and save workflow intact.
- [ ] **Step 2: Add host bio locale fields.** Provide English and Japanese draft/edit controls and a review checkbox/status for each translation.
- [ ] **Step 3: Add experience locale tabs.** Extend the existing detailed-introduction editor to edit Korean, English, and Japanese content under the same experience ID.
- [ ] **Step 4: Add itinerary translations.** Extend each existing step row with English and Japanese title/description fields; do not alter timing/order behavior.
- [ ] **Step 5: Add confirmed delivery-language controls.** Let the host choose ko/en/ja, leave it empty by default, and explain that this records actual facilitation ability rather than translation availability.
- [ ] **Step 6: Translate all host editor UI.** Localize navigation labels, field hints, validation, saved/unsaved statuses, dialogs, and errors across profile and session editing.

## Task 6: Prepare translation rollout and validation

**Files:**
- Create: `docs/local-eum/local-eum-language-rollout.md`
- Modify: `docs/local-eum/migrations/20261017_local_eum_languages.draft.sql` only when the rollout update SQL requires a reviewed correction

- [ ] **Step 1: Document the exact translation review workflow.** Explain how to prepare English/Japanese drafts from Korean source fields and have each host review them before marking them reviewed.
- [ ] **Step 2: Prepare initial draft content only from confirmed current records.** Read existing Local Eum host, experience, and step rows from the confirmed dev project. Do not guess IDs or overwrite non-empty translations; put proposed updates in a separate review SQL/data artifact.
- [ ] **Step 3: Add pre- and post-condition queries.** Verify row counts and owner relationships before and after proposed updates; SQL must raise an exception on unexpected counts or ownership.
- [ ] **Step 4: Do not apply remote SQL.** Report the SQL, target project ID, and expected changes for separate explicit approval before any remote migration or content update.
- [ ] **Step 5: Run `npm run build`.** Expected: Vite production build succeeds with no unresolved imports or JSX errors.
- [ ] **Step 6: Run `npm run lint`.** Expected: oxlint completes without new diagnostics from Local Eum localization files.
- [ ] **Step 7: Inspect the final working tree.** Confirm only planned localization files changed, existing unrelated modifications remain untouched, and no files were staged or committed.

## Review checkpoints

1. Before applying SQL, present the exact migration and rollout update SQL for approval.
2. Before Git staging, show the full list of changed files and explicitly exclude unrelated pre-existing staged/unstaged work.
3. Do not commit, push, or alter the current branch history unless asked.
