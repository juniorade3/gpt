# Junior Cards

Flashcards with FSRS, Markdown, cloud synchronization and subject hierarchies.

## CGU questions and laboratories

Open **Questões CGU e laboratórios** or `questoes.html`. The module shares the current access key and Supabase function. Each official item has a source panel with its original board, agency, job, exam date, notice year, booklet, item number, PDF page and Drive references; the 100 active items and definitive keys were checked against the original PDFs on 2026-11-02. It preserves flashcards and adds question blocks, confidence, doubts, attempts and visual explanations. See [CGU module documentation](docs/CGU-MODULE.md) for content status, import workflow and verification limits.

## Revisão Inteligente por Questões

Abra **Revisão Inteligente** na página inicial ou acesse `revisao.html`. O módulo apresenta itens C/E oficiais relacionados por conceito, registra a confiança antes de mostrar o gabarito, conserva a resolução e agenda novos retornos por tentativas verificadas. Usa a mesma chave do Junior Cards, o mesmo Supabase e o mesmo deployment Vercel. A lógica de revisão por conceitos não altera o FSRS dos flashcards. É possível filtrar matéria B1–I4, tópico e subitem do edital, ano e aderência, além de alternar entre filas vencidas, novas, lacunas e mistas. A importação de aplicação 2026 catalogou 1.346 itens vinculados; 945 têm formato C/E e gabarito definitivo pareado, enquanto 401 permanecem retidos por tipo de questão ou situação do gabarito. Os itens recém-importados ainda não têm comentários pedagógicos validados em geral: a correção exibe conteúdos revisados quando presentes, e oferece **Aprofundar com GPT** com contexto da resposta e **Rever correção** no histórico. O item Funpresp-Jud 2026 Q054 tem comentário didático específico e teste autoral de transferência; a integração com o GPT abre uma conversa externa (sem API/modelo integrado no Supabase). Veja [funcionamento e limites](docs/RIQ.md) e [auditoria de importação 2026](docs/RIQ-IMPORT-2026.md).

## Study and organization

Select a subject, then use **Tudo** to study its cards and every subcategory. A subcategory includes its own nested categories. **Geral** filters cards assigned directly to the subject, when applicable. Each tab shows the number of new or due cards; the empty state distinguishes an empty category from completed reviews.

**Organizar matérias** creates subjects and nested categories, renames or reparents existing categories, and moves selected cards. Moving only changes `cards.deck_id`; it never resets `review_state`, card IDs or review events. Cycles and duplicate sibling names are rejected. Organization requires a cloud connection; cached study content still works offline.

## Current production architecture

Vercel serves `index.html`, `hierarchy.js` and the PWA assets from this directory. The browser calls the Supabase Edge Function at `supabase/functions/junior-cards-api/index.ts`, using the existing device access key. The function checks that key against the hash in `app_config` before all reads or writes. RLS is enabled and no anonymous database policies are added.

The live database uses UUID identifiers. `supabase-schema.sql` and the old Vercel `api/` handlers describe the earlier implementation; do not use the old schema to provision the current production database. New production changes are recorded in `supabase/migrations/`.

Deployment order: apply the additive hierarchy migration, deploy the updated Supabase Edge Function with the existing custom authentication and `verify_jwt=false`, then publish the static app through the repository's Vercel integration. The existing card and category UUIDs remain unchanged.

## Verification

Run `npm test` for subject aggregation, nested category filters, legacy cache compatibility and unchanged FSRS references. Verify the UI at phone and tablet widths and exercise category creation, editing and card movement against authenticated API responses before publishing.

