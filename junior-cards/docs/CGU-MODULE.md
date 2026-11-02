# CGU question module

The existing Junior Cards app remains at index.html. questoes.html adds study blocks, C/E/blank answers, confidence before feedback, optional reasoning and doubts, history, per-topic filtering and six didactic simulations. It reuses the existing device access key and authenticated Supabase Edge Function. No new browser database credentials or public table policies were introduced.

## Content status

The active block contains 100 official Cebraspe items from the CGU annual banks for application years 2023–2026. On 2026-11-02, all 100 item numbers and statements were checked in 42 original exam PDFs from Drive; the 100 answers were paired with 42 original definitive answer-key PDFs. All exam-file SHA-256 values match the Cadernos tab. Metadata now distinguishes the application date from the notice year and records the agency, full job title, original printed booklet identifier, internal bank identifier, item, page, original file name and links to the bank and PDFs. See audit/2026-11-02-provenance.json for the per-item verification record.

99 displayed statements are stored byte-for-byte from the current Enunciados cells. The TRF6 item 72 cell also includes the steps: block belonging to the following item 73. Its study statement preserves only item 72, confirmed visually in the original PDF. The untouched raw bank text and a boundary note are retained in provenance. The Drive source was not edited. Prose reflows for the screen, while the kubeconfig example and Git command sequences retain code layout and line numbers where applicable.

This is still an independent selection. The original 100-question interactive selection from the other chat was not recovered; its separate reserved block remains pending_original. No historical attempts were fabricated or remapped. The authorial demonstration entry point has been removed from the production interface so that the offered study items are official.

Distribution: I2.1: 26, I2.2: 26, I2.3: 20, I2.4: 22, I2.5: 6. Application years: 2026: 29, 2025: 26, 2024: 26, 2023: 19. Difficulty remains uncalibrated. Three technically broad items retain the definitive bank/PDF answer and their explanatory caveats.

## Data and updates

The additive schema is preserved in cgu-schema.sql and was applied through the Supabase migration cgu_question_blocks_and_attempts. The new tables use the cgu_ prefix. RLS is enabled, with access restricted to the service role behind the existing API authentication. The Edge Function dispatches study requests only after checking the original app_config key hash. Existing flashcard tables, UUIDs, FSRS state and review events are untouched.

Content is data: add/upsert a cgu_questions row by its canonical ID, increment version on substantive changes, and associate it with a cgu_blocks record through cgu_block_questions. Keep order in position. Question provenance is stored in cgu_questions.provenance and is served only after the existing access-key authentication. It contains no answer values. The browser requests blocks and questions from the Edge Function, so adding a block does not require a frontend deployment. New simulation types require code review and deployment.

When the original artifact is available, import only recovered statements, IDs and keys. Associate it with i2-original-chat in its original order, verify its actual count and sources, then change status to ready. Never map draft attempts to different IDs or invent earlier answers. Existing attempts keep answer, explanation and version snapshots.

## Attempts

The server calculates correctness. Each immutable attempt has its own client-generated UUID and server timestamp. Retrying a pending send is idempotent; a conflicting reuse is rejected. Draft text and queued submissions stay on the device until the server confirms. Unconfirmed attempts are excluded from the score and do not expose feedback. The first-attempt score is separate from repeated attempts. Optional justifications are recorded, not automatically evaluated by an LLM. Immediate correct answers never promote retention status.

Gap grouping is a view of this module's evidence, not a migration of the existing Drive Fila Única. Same-day gaps remain visible but are not suggested as spaced reviews. The existing Drive remains unmodified.

## Verification

npm test covers existing hierarchy behavior and new score, classification, eligibility and API validation. SQL assertions test server grading, idempotence and conflict rejection inside a rolled-back transaction. Browser verification uses isolated local fixtures with four source-verified official items; submission responses are mocked locally, without production access keys or writes to the user's database history. The existing private access key is not exported, logged or included in fixtures.

No browser-authenticated production round trip was performed without the owner's device access key. Verify it through the existing connected device when available.

## Focus mode and reading theme

In a question block, **Modo foco** hides navigation, score panels and filters. It uses the Fullscreen API when available and keeps the same reading layout when fullscreen is unavailable or denied. The response and confidence are collected before feedback. Confirmed correction, the question's laboratory and **Próxima questão** stay in focus; the last question returns to the summary. **Sair do foco** or Escape restores normal navigation. Optional reasoning and doubts can be expanded before submission. Text size is retained on the device.

The question module uses white and light gray surfaces, dark text and restrained periwinkle blue. Results include text labels and do not rely on green. Existing API, attempt IDs, server timestamps and grading are unchanged. Browser verification uses the isolated authorial demonstration, without sending attempts to production.

## Verification of source fidelity

The provenance audit reads current Enunciados, Gabaritos and Cadernos rows and the 84 referenced PDFs. The text check locates each requested item number and statement on its declared PDF page; whitespace is ignored only for PDF-layout comparison. Definitive keys are read from the original Item/Gabarito rows. The TRF6 boundary, the TJPA printed matrix identifier and the numbered kubeconfig source were also inspected as rendered pages. Full metadata is accessible through Dados da prova e fontes in both normal and focus layouts. Existing attempts keep their original explanation snapshots and versions; source enrichment does not rewrite responses or scores.
