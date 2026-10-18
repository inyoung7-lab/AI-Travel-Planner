# Local Eum English and Japanese Support — Design

**Status:** Draft for user review  
**Date:** 2026-10-17

## Goal

Let visitors switch the Local Eum experience between Korean, English, and Japanese from the language controls currently shown in the catalog filter. Translate Local Eum interface text and published Local Eum content, while keeping a separate way to filter experiences by the languages hosts can actually use during the program.

## Confirmed scope

- Apply only to Local Eum routes: catalog, experience detail/application, host profile editor, and host session/experience editor.
- The Korean, English, and Japanese controls switch the Local Eum display language. They do not filter experiences by delivery language.
- Remember the display language in browser storage and apply it across Local Eum routes. Do not change the shared site header or unrelated pages.
- Translate Local Eum labels, help/error/status messages, application flow, and host editing interface.
- Translate visible host profile and experience content, including experience title and summary, detailed introduction, itinerary steps, inclusions, preparation items, and precautions.
- Create English and Japanese draft translations from Korean content. Hosts can review and edit the translated content.
- Store translations as JSON on the existing host, experience, and experience-step records. Do not add host or experience rows or change their ownership relations.
- Store host-delivery languages separately on each experience and keep a distinct catalog filter for those languages.
- Leave the common header, unrelated routes, and non-Local-Eum pages unchanged.

## Current state

- The catalog already renders Korean, English, and Japanese buttons as a `사용 언어` filter. The filter currently encodes its choice as `lang` in the URL, while `filterCatalogExperiences` only returns Korean-language results.
- There is no existing localization library or locale provider.
- `lc_experiences` and `lc_hosts` hold Korean display text. `lc_experience_steps` stores Korean step titles and descriptions.
- Host editing already allows a host to edit `lc_experiences.detail_description`; its update is protected by the existing owner-or-admin RLS policy. Step editing is also protected by owner-or-admin RLS.
- Existing host and experience records must remain intact. Current worktree changes in unrelated feature files must be preserved and excluded from this feature.

## User experience

1. The existing buttons in the catalog panel become the **display language** selector, labelled in the selected language where practical (e.g. `화면 언어`, `Display language`, `表示言語`).
2. Choosing a language immediately updates the Local Eum screen, persists the choice in `localStorage`, and retains current page/experience/application context. A selected language should not overwrite region, interest, sort, recruitment, or host-delivery-language filters.
3. A separate **program language** filter lists languages a host can use to conduct the experience. It is backed by experience metadata, supports multiple selected languages, and matches an experience when it supports any selected language.
4. Detail and application pages expose the same locale selector in their Local Eum page controls. Host profile and session editors also expose it, without changing the shared application header.
5. If a translation is missing, use Korean for that individual field and show a small localized “translation being prepared” notice. Do not render blank text or hide the experience.
6. Host editing presents Korean, English, and Japanese fields together or through language tabs. Saving one language must preserve other language values and the existing Korean source.

## Data design

Additive migration for the existing Local Eum tables:

- `lc_hosts.translations jsonb not null default '{}'`: localized host bio keyed by `en` and `ja`. The host's canonical display name remains unchanged unless product review later requests localized display names.
- `lc_experiences.translations jsonb not null default '{}'`: localized title, summary, detailed introduction, inclusions, preparation items, and precautions.
- `lc_experiences.available_languages text[] not null default array[]::text[]`: canonical language codes (`ko`, `en`, `ja`) that the host has explicitly confirmed they can use during the experience. Do not infer host ability from the language of existing copy.
- `lc_experience_steps.translations jsonb not null default '{}'`: localized step title and description.

Use JSON objects with explicit, stable keys, e.g. `{"en":{"title":"...","description":"...","review_status":"DRAFT"},"ja":{"title":"...","description":"...","review_status":"DRAFT"}}`. Keep review status per locale and let the host mark a locale reviewed in the editor. Validate supported locale keys and review statuses in the migration or repository layer. Keep existing Korean columns as canonical source values; never copy translated values over them.

Migration requirements:

- Target only the confirmed `local-eum-dev` schema and be additive/idempotent where safe.
- Do not change primary keys, host ownership, approval status, published state, session records, place ownership, or existing Korean copy.
- Add narrow `UPDATE` column grants for the new editable fields while reusing the existing row-level owner/admin policies. Do not grant table-wide update or let one host edit another host's content.
- Use an explicit transaction and preconditions. If the expected tables or relevant policies differ, stop rather than guess.
- Seed translations only after reviewing the target project's current row counts and IDs. Preserve missing/empty translation values without destructive replacement.

## Application design

- Add a Local Eum-only locale dictionary/module and a small shared hook/component that reads/writes `localStorage`. Avoid adding a site-wide i18n framework for this scoped feature.
- Resolve localized experience, host, and step fields from `translations[locale]`, falling back per field to the canonical Korean column.
- Treat legacy `lang=ko|en|ja` links as display-language selections when no saved Local Eum preference exists. Persist the chosen display locale separately. Use the unambiguous `programLanguage` query key only for host-delivery-language filtering.
- Update catalog filtering to test `available_languages`; keep all existing region, interest, recruiting, and sorting behavior.
- Extend existing host editors to edit localized fields and supported program languages. Saving must not erase unknown JSON keys or other locale content.
- Do not modify `src/components/header.jsx`, shared header styling, or unrelated application routes.

## Translation rollout

- Prepare English and Japanese draft copy for all currently published Local Eum host profiles, experience content, and itinerary steps, based on the current Korean records.
- Mark drafts as needing host review in the host editor. Until reviewed, show a discreet, localized pending-review note to travelers while allowing the translated text to be read.
- Leave `available_languages` empty until each host confirms their delivery languages. Translation availability alone must never imply that a host can conduct the program in that language.

## Acceptance criteria

1. Clicking each of the three language buttons changes visible Local Eum UI and keeps the choice after reload and route navigation.
2. The shared site header and non-Local-Eum routes are unchanged.
3. Detail and application pages display the selected experience/host/step translations with per-field Korean fallback.
4. Host editors can review/edit their profile and owned experience translations and set delivery-language availability.
5. A host cannot read or modify another host's private editing data or update another host's content through translation fields.
6. The program-language filter reflects `available_languages` and operates independently from the display-language selector.
7. Existing Korean data, host ownership, experience IDs, sessions, and place relations remain unchanged.
8. All Local Eum pages remain usable in Korean when translation data is absent or malformed.

## Risks and open implementation checks

- Existing RLS policies and column-level grants must be verified in the actual target schema before drafting/applying SQL.
- Current worktree contains unrelated staged and unstaged changes. Implementation must touch only the necessary Local Eum localization files and preserve the user's existing changes; do not stage or commit unrelated work.
- Translation copy is a draft, not a certified translation. Hosts must be able to correct it before treating a language as supported for program delivery.
- This document does not authorize applying a Supabase migration, updating remote content, committing, or pushing.

## Alternatives considered

1. **JSON translations on current rows (recommended):** smallest additive database change, keeps each translation beside the record and under the existing ownership policy. This is the selected design.
2. **Separate translation tables:** offers more normalized locale rows and easier language-specific querying, but adds tables, policies, joins, and editor complexity for the current fixed three-language scope.
3. **UI-only localization:** avoids database changes but cannot deliver translated experience and host content, so it does not satisfy the requested scope.
