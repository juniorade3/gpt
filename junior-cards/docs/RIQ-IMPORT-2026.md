# CGU 2026 — importação para Revisão Inteligente

## Fonte e recorte
Fonte canônica em modo leitura: [CGU — Banco de questões — Aplicação 2026](https://docs.google.com/spreadsheets/d/1CGy7Ey4bH-HjFVHCBipFS0sY9PjsyGbi7FyHfe5atRg/edit).

A classificação vigente vem da aba Vínculos com edital (R2). O enunciado é copiado da coluna Enunciado integral extraído em Enunciados, pareado por ID aos Gabaritos e à identificação da aba Questões; tópicos e títulos são fornecidos pela aba Mapa do edital, conferida com os 70 tópicos do edital.

Não foram usadas tags antigas de assunto do acervo para inferir aderência. Não foram editados arquivos do Google Drive.

## Contagens da aplicação 2026
- Banco: 2.100 questões objetivas.
- Vínculo direto: 1.085.
- Vínculo parcial: 261.
- Fora do edital: 754 (não importadas ao módulo).
- Importadas ao modo Certo/Errado, com formato C/E e gabarito definitivo pareado: 945, sendo 781 diretas e 164 parciais.
- Aguardam outro tratamento: 401, sendo 228 não-C/E e 173 sem gabarito definitivo segundo a fonte. Tais itens constam no controle de auditoria, mas não têm gabarito inventado, não são convertidos e não contam no desempenho.

## Estrutura
O mesmo Supabase Junior Cards contém as tabelas cgu_syllabus_topics (70 títulos), cgu_import_audit (IDs, situação e motivo), e as tabelas já existentes cgu_questions, cgu_block_questions, cgu_concepts e cgu_concept_questions.

Dois blocos prontos organizam o lote: cgu-2026-direct e cgu-2026-partial. Questões preexistentes permanecem nos blocos originais; IDs canônicos evitam duplicação. Novos conceitos são associados à combinação de subitem auditado + conhecimento exigido normalizado, sem usar palavras isoladas da questão para determinar o assunto. Agendamento por conceito; a classificação por matéria/tópico/subitem é apenas filtro de visualização.

Todos os documentos originais e gabaritos têm links em provenance. Os metadados distinguem a data de aplicação (2026) do ano do edital da prova original.

## Integridade e limitações
A importação fez pareamento dos mesmos IDs nas quatro abas. Não houve reconferência visual, item a item, de todos os PDFs de 2026 nesta etapa. O texto integral extraído foi conservado sem reescrita na coluna statement e o contexto disponível foi mantido separadamente; imagens, tabelas e códigos podem exigir abertura da prova original. O painel exibe aviso de conferência pelo banco sem usar o selo de "conferido no PDF".

Só itens com gabarito "Definitivo pareado" aparecem no modo C/E. Comentários individuais dos novos itens não foram inventados. O feedback indica claramente que o gabarito foi pareado, mas ainda falta explicação didática revisada, e abre acesso às fontes.

A função de importação cgu_import_2026_batch é idempotente, usa o ID original, não altera questões já existentes e registra decisões de exclusão. Foi revogado seu EXECUTE dos papéis públicos e seu uso é reservado à operação de migração. As tabelas adicionais usam RLS, sem políticas anônimas.

## Filtros da interface
A tela revisao.html tem ano (2026 como foco inicial), matéria (B1–B4, C1–C5, I1–I4), tópico, subitem, aderência (direta, parcial ou ambas) e quatro modos de treino (vencidas, novos, lacunas vencidas, misto), além de visualizar programadas. O histórico de revisão obedece ao mesmo recorte, mantendo todos os demais intervalos preservados.

A API /revision pagina questões, vínculos e conceitos em blocos para superar o limite habitual de 1.000 linhas do PostgREST. O GET nunca devolve gabaritos; o POST continua calculando correção no servidor, usando a chave de acesso preexistente.

A importação futura de questões de 2025, 2024 e 2023 deve seguir a mesma validação de fonte, formato e gabarito, sem extrapolar o escopo desta operação.
