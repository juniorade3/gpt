# Junior Cards

Flashcards with FSRS, Markdown, cloud synchronization and subject hierarchies.

## Study and organization

Select a subject, then use **Tudo** to study its cards and every subcategory. A subcategory includes its own nested categories. **Geral** filters cards assigned directly to the subject, when applicable. Each tab shows the number of new or due cards; the empty state distinguishes an empty category from completed reviews.

**Organizar matérias** creates subjects and nested categories, renames or reparents existing categories, and moves selected cards. Moving only changes `cards.deck_id`; it never resets `review_state`, card IDs or review events. Cycles and duplicate sibling names are rejected. Organization requires a cloud connection; cached study content still works offline.

## Current production architecture

Vercel serves `index.html`, `hierarchy.js` and the PWA assets from this directory. The browser calls the Supabase Edge Function at `supabase/functions/junior-cards-api/index.ts`, using the existing device access key. The function checks that key against the hash in `app_config` before all reads or writes. RLS is enabled and no anonymous database policies are added.

The live database uses UUID identifiers. `supabase-schema.sql` and the old Vercel `api/` handlers describe the earlier implementation; do not use the old schema to provision the current production database. New production changes are recorded in `supabase/migrations/`.

Deployment order: apply the additive hierarchy migration, deploy the updated Supabase Edge Function with the existing custom authentication and `verify_jwt=false`, then publish the static app through the repository's Vercel integration. The existing card and category UUIDs remain unchanged.

## Verification

Run `npm test` for subject aggregation, nested category filters, legacy cache compatibility and unchanged FSRS references. Verify the UI at phone and tablet widths and exercise category creation, editing and card movement against authenticated API responses before publishing.
