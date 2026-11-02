# CGU question module

The existing Junior Cards app remains at index.html. questoes.html adds study blocks, C/E/blank answers, confidence before feedback, optional reasoning and doubts, history, per-topic filtering and six didactic simulations. It reuses the existing device access key and authenticated Supabase Edge Function. No new browser database credentials or public table policies were introduced.

## Content status

The original 100-question interactive artifact from the other chat could not be retrieved. Its block is explicitly pending_original. A separate draft contains 100 items extracted from the current annual CGU banks (2023–2026), with their canonical IDs, source links, paired answer keys and new pedagogical comments. It must not be described as the original selection or as a fully PDF-validated official exam. Difficulty remains uncalibrated. Historical attempts from before this module were not fabricated or imported.

The draft distribution is I2.1: 26, I2.2: 26, I2.3: 20, I2.4: 22, I2.5: 6. Application years: 2026: 29, 2025: 26, 2024: 26, 2023: 19. Three items with technically broad wording (Docker namespaces, OpenShift ImageStreams and isolation) preserve the paired bank key while explicitly explaining limits.

## Data and updates

The additive schema is preserved in cgu-schema.sql and was applied through the Supabase migration cgu_question_blocks_and_attempts. The new tables use the cgu_ prefix. RLS is enabled, with access restricted to the service role behind the existing API authentication. The Edge Function dispatches study requests only after checking the original app_config key hash. Existing flashcard tables, UUIDs, FSRS state and review events are untouched.

Content is data: add/upsert a cgu_questions row by its canonical ID, increment version on substantive changes, and associate it with a cgu_blocks record through cgu_block_questions. Keep order in position. The browser requests blocks and questions from the Edge Function, so adding a block does not require a frontend deployment. New simulation types require code review and deployment.

When the original artifact is available, import only recovered statements, IDs and keys. Associate it with i2-original-chat in its original order, verify its actual count and sources, then change status to ready. Never map draft attempts to different IDs or invent earlier answers. Existing attempts keep answer, explanation and version snapshots.

## Attempts

The server calculates correctness. Each immutable attempt has its own client-generated UUID and server timestamp. Retrying a pending send is idempotent; a conflicting reuse is rejected. Draft text and queued submissions stay on the device until the server confirms. Unconfirmed attempts are excluded from the score and do not expose feedback. The first-attempt score is separate from repeated attempts. Optional justifications are recorded, not automatically evaluated by an LLM. Immediate correct answers never promote retention status.

Gap grouping is a view of this module's evidence, not a migration of the existing Drive Fila Única. Same-day gaps remain visible but are not suggested as spaced reviews. The existing Drive remains unmodified.

## Verification

npm test covers existing hierarchy behavior and new score, classification, eligibility and API validation. SQL assertions test server grading, idempotence and conflict rejection inside a rolled-back transaction. Browser verification uses three explicitly authorial demonstration items without writing to the user's database history. The existing private access key is not exported, logged or included in fixtures.

No browser-authenticated production round trip was performed without the owner's device access key. Verify it through the existing connected device when available.
