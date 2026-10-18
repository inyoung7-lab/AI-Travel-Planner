# Local Eum English/Japanese rollout

Target project: `local-eum-dev` (`rhkaxmqdkztpbljkunxb`). The schema and English/Japanese draft translations were applied on 2026-10-18 after user approval.

## Applied data

- Added `translations` JSONB fields to `lc_hosts`, `lc_experiences`, and `lc_experience_steps`, plus `available_languages` to `lc_experiences`.
- Seeded English and Japanese draft copy for both existing hosts, all 12 existing experiences, and all 50 existing itinerary steps.
- All seeded locale entries have `review_status: DRAFT`; host introductions and Korean source fields remain unchanged.
- `available_languages` remains empty on all 12 experiences until each host confirms the language they can actually use to lead it. Translation availability does not imply spoken-language availability.
- No host, experience, session, step, or place rows were inserted, deleted, or reassigned. Ownership remains host 500 → experiences 101–110 and host 501 → experiences 111–112; the 16 existing sessions remain.

Applied SQL records:

- `docs/local-eum/migrations/20261017_local_eum_languages.applied.sql`
- `docs/local-eum/migrations/20261018_local_eum_translation_seed.applied.sql`

The `.draft.sql` schema file remains as the original review artifact. The `.applied.sql` files record the versions executed against the target project.

## Host review and delivery-language flow

1. Sign in as the owning host and open `/local-eum/host/profile` to review the English and Japanese bio drafts.
2. Open each owned experience editor to review its title, summary, detailed introduction, and itinerary translations. Saving a locale as reviewed should happen only after a human host checks it.
3. Set an experience's `available_languages` only when the host confirms they can lead it in that language. The catalog filters follow this field independently from the selected display language.
4. Check the traveler catalog and detail page in ko/en/ja. Missing translated fields fall back to Korean and show the localized draft/review notice.

## Verification recorded

Read-only checks against the target database confirmed:

- 2 hosts have English and Japanese draft bios.
- 12/12 experiences have English and Japanese draft translations.
- 50/50 itinerary steps have English and Japanese draft translations.
- Host ownership counts remain 10 experiences for host 500 and 2 for host 501; 16 sessions remain.
- All 12 `available_languages` arrays are empty pending host confirmation.

Run `npm run build` and `npm run lint` after source changes. Do not commit or push these changes until the user reviews the mixed existing `hykang` worktree and authorizes Git operations.
