# Revisão Inteligente por Questões (RIQ)

Acesse **revisao.html** no projeto **Junior Cards**. A página compartilha o mesmo site, o projeto Supabase, a Edge Function \`junior-cards-api\` e a chave de acesso do aparelho. Não foi criado um segundo serviço Vercel.

## Fluxo

1. **Fila**: categorias vencidas primeiro, depois conceitos novos; agendamentos futuros ficam visíveis sem incentivar antecipação.
2. **Questões oficiais**: o banco original \`cgu_questions\` fornece enunciado literal e proveniência verificada, mas omite o gabarito até o servidor confirmar a tentativa.
3. **Resposta**: C/E/branco, confiança, justificativa e reconhecimento de questão prévia. Uma tentativa é persistida em \`cgu_attempts\`, usando a mesma RPC \`cgu_record_attempt\` que calcula o gabarito no banco.
4. **Correção**: explicação decisiva, mecanismo, armadilha e transferência são recuperados do snapshot oficial da tentativa. O site exibe o novo agendamento após confirmação.
5. **Histórico**: \`cgu_revision_events\` registra a evidência por conceito e cada tentativa, inclusive as realizadas em baterias normais; \`cgu_revision_state\` mantém o próximo retorno.

## Aprendizagem e espaçamento

A primeira versão utiliza intervalos graduais de **1, 3, 7, 14, 30, 60 e 90 dias**, distintos do FSRS dos flashcards tradicionais. Respostas incorretas, brancas ou inseguras voltam à aprendizagem, em geral no dia seguinte. Um acerto inicial seguro leva à consolidação provisória com retorno em 3 dias, mas não é considerado retenção. Só há crédito de retorno espaçado quando a revisão estava vencida, ocorre pelo menos 20 horas depois do contato anterior e em outro dia local (America/Sao_Paulo), com resposta correta, confiança segura e sem reconhecimento do enunciado.

A consolidação exige ao menos dois acertos seguros em revisões espaçadas e evidência em pelo menos dois enunciados distintos. Um conceito com uma só questão não é automaticamente proclamado consolidado. Confiança autorrelatada não é validação automática da justificativa. O painel distingue os eventos espaçados e as transferências verificáveis.

A seleção de questões prefere o enunciado ainda não visto; se todos forem familiares, escolhe aquele visto menos vezes/menos recentemente, evitando a última questão quando possível. Questões relacionadas compartilham um conceito, mas cada enunciado mantém sua identidade e fonte.

## Modelo de dados e segurança

Os scripts SQL aditivos estão em \`docs/cgu-concept-spaced-revision.sql\`, \`docs/cgu-review-due-guard.sql\`, \`docs/cgu-revision-fk-indexes.sql\` e \`docs/cgu-revision-new-question.sql\`. Foram executados como migrações no mesmo projeto Supabase \`Junior Cards\`. Nenhuma alteração foi feita em \`cards\`, \`decks\`, \`review_state\`, \`review_events\` ou no agendador FSRS existente.

As quatro tabelas RIQ têm RLS habilitada e nenhuma política anônima; acesso é somente pela Edge Function com a autenticação \`x-junior-key\` já presente. \`service_role\` permanece exclusivamente no ambiente servidor. A rota \`/revision\` não retorna gabaritos em GET. O POST só aceita questões vinculadas a um conceito e a um bloco pronto; o servidor valida e persiste a resposta usando a RPC original, mantendo o UUID idempotente.

A fila foi iniciada com **27 grupos de conceitos e 100 questões reais do I2**, com migração das **4 tentativas então presentes no banco**. Depois, em 04/11/2026, foram importadas **945 questões C/E oficiais de aplicação 2026** vinculadas ao edital da CGU (781 de aderência direta e 164 parcial); 401 vinculadas ficaram retidas por formato ou situação do gabarito. Não houve reconstrução de tentativas do chat. Novas questões importadas são inicialmente incluídas como conceitos individuais; a curadoria pode agrupá-las posteriormente, mantendo vínculos e preservando tentativas. O sistema ainda **não sincroniza automaticamente a Fila Única do Drive**.

## Limites e validação

O frontend busca um máximo de 2.000 eventos e 2.000 referências recentes de questões para ordenar variações e calcular as métricas exibidas, avisando quando houver truncamento. O histórico completo permanece no Supabase. O envio pendente fica no \`localStorage\` com o mesmo UUID para reenvio seguro; a correção não é mostrada até o banco confirmar.

A migração foi verificada com consulta de integridade e ensaio transacional revertido de acerto inicial, repetição no mesmo dia e erro. Os testes de modelo cobrem prioridade de fila, alternativas de enunciado e métricas de retenção. Conferir pela chave de acesso do aparelho o fluxo completo e a responsividade do tablet após deploy.


## Correção didática na própria questão e aprofundamento por GPT

O gabarito só aparece depois de a RPC confirmar e persistir a resposta. A correção diferencia erro seguro, erro inseguro, acerto inseguro, acerto seguro e branco. Quando o item já tem comentário didático, exibe ponto decisivo, mecanismo, armadilha e regra para a prova, com alertas sobre interpretação não oficial. Um teste de transferência autoral pode aparecer para questões com curadoria específica; o resultado desse teste é somente didático e não pontua nem altera o agendamento.

Questões recém-importadas sem comentário individualmente revisado mostram uma limitação explícita, sem inventar mecanismos. O botão **Aprofundar com GPT** abre uma nova conversa do ChatGPT usando um link com prompt preparado (enunciado original, prova, item, gabarito já revelado, resposta, confiança e justificativa). Este botão não usa a chave de acesso do Junior Cards nem a envia ao ChatGPT. Dependendo da versão/navegador, o texto pode ficar preenchido sem envio automático; **Copiar pedido completo** é a alternativa e permite questões extensas. O diálogo do ChatGPT não é automaticamente gravado no histórico do Junior Cards.

O histórico oferece **Rever correção**: chama a ação autenticada read-only POST /revision com action=recap e UUID da tentativa. Essa ação não cria tentativa, não recalcula desempenho e não muda intervalos. O servidor retorna o gabarito e snapshot originais e, se houver comentário didático posterior, mostra a versão enriquecida com indicação explícita de que o registro imutável da tentativa foi preservado.

Foi publicada correção comentada específica para a questão oficial Funpresp-Jud/2026, item 54, sobre VPN, intranet e extranet, com teste autoral de transferência. A tentativa original do candidato permanece intacta; esta nova explicação aparece ao reabrir o registro no histórico.

O módulo não possui integração automática de API GPT dentro do servidor: a interação opcional ocorre em uma nova conversa do ChatGPT iniciada pelo usuário. Para as demais questões importadas ainda sem revisão pedagógica, não se afirma que um comentário já exista.

## Encaminhamento para plugin instalado de correção reversa
O botão **Preparar no ChatGPT** passa a nomear explicitamente o plugin instalado **Correção reversa orientada por cobrança de banca** no pedido. O prompt inclui enunciado original, identificação da prova, item, conceito do edital, gabarito definitivo já confirmado, resposta, confiança, justificativa e dúvidas. Erros ou itens em branco solicitam MODO COMPLETO; acertos solicitam MODO MÉDIO, mantendo o teste autoral de transferência sem antecipação do gabarito.

A URL https://chatgpt.com/?q=... é uma tentativa de preencher a caixa de mensagem em uma nova conversa. **Não é uma API de execução do plugin nem uma garantia de seleção automática.** Na interface ChatGPT, o usuário pode selecionar o plugin por menção @ ou menu + > Plugins antes do envio. O site exibe essas instruções e um botão de cópia integral para casos de URL longa ou navegador sem suporte a preenchimento. Nunca passar a chave de acesso do Junior Cards para o ChatGPT. A resposta do plugin ainda não retorna automaticamente ao Supabase e não substitui o gabarito oficial.
