-- Expand Controle Interno e Externo CP01 to the validated 20-card intensive Cebraspe review set.
-- Existing 10 cards are enriched in place to preserve UUIDs and FSRS/review history.
-- Adds 10 advanced cards on mixed classifications, TC competence limits and common Cebraspe traps.

with target_deck as (
  select id
  from public.decks
  where slug = 'controle-checkpoint-01-previo-concomitante-posterior'
),
updates(front, back, note, tags, sort_order) as (
  values
    (
      'Quanto ao momento, como o controle administrativo é classificado?',
      E'**Resposta:** **Prévio (a priori)** = antes; **concomitante (pari passu)** = durante; **posterior (a posteriori)** = depois.\n\n**Entenda:** essa classificação responde a uma pergunta: **quando o controle ocorre em relação ao ato ou atividade controlada?**\n\n**Memória:** PRE → CON → POS = antes → durante → depois.',
      '📄 Controle Externo — Aula 00, p. 21–22. CP01.',
      array['controle','checkpoint-01','classificacao-temporal','cebraspe']::text[],
      1
    ),
    (
      'Quando ocorre o controle prévio (a priori)?',
      E'**Resposta:** Ocorre **antes da prática ou conclusão do ato controlado**.\n\n**Entenda:** tem forte caráter preventivo e orientador, pois busca evitar que uma irregularidade se concretize ou produza efeitos.\n\n**⚠️ Pegadinha:** “prévio” classifica o **momento**; “preventivo” descreve sobretudo uma **finalidade/efeito**.',
      '📄 Controle Externo — Aula 00, p. 21. CP01.',
      array['controle','checkpoint-01','controle-previo','cebraspe']::text[],
      2
    ),
    (
      'Qual é um exemplo típico de controle prévio?',
      E'**Resposta:** A exigência de **autorização, análise ou laudo antes da prática do ato**.\n\n**Entenda:** o ponto decisivo não é o nome do documento, mas o fato de o controle ocorrer **antes** de o ato ser praticado ou concluído.\n\n**⚠️ Pegadinha:** não confunda controle prévio com autorização prévia genérica de todos os atos.',
      '📄 Controle Externo — Aula 00, p. 21.',
      array['controle','checkpoint-01','controle-previo','exemplo','cebraspe']::text[],
      3
    ),
    (
      'Autorização para contratar operação de crédito é qual tipo de controle?',
      E'**Resposta:** **Controle prévio**, porque a autorização antecede a contratação da operação.\n\n**Entenda:** a classificação decorre da posição temporal do controle em relação ao ato.\n\n**⚠️ Pegadinha:** não é o órgão que autoriza que define “prévio”; é o fato de a verificação ocorrer **antes**.',
      '🧠 Exemplo trabalhado na revisão do CP01.',
      array['controle','checkpoint-01','controle-previo','operacao-de-credito','cebraspe']::text[],
      4
    ),
    (
      'Quando ocorre o controle concomitante (pari passu)?',
      E'**Resposta:** Ocorre **enquanto o ato, procedimento, contrato ou atividade está sendo executado**.\n\n**Entenda:** sua grande vantagem é detectar problemas durante a execução e permitir **correção tempestiva**, antes do encerramento da atividade.\n\n**Memória:** concomitante = acompanhar + corrigir enquanto ocorre.',
      '📄 Controle Externo — Aula 00, p. 21–22.',
      array['controle','checkpoint-01','controle-concomitante','cebraspe']::text[],
      5
    ),
    (
      'Quais sinônimos podem aparecer para controle concomitante?',
      E'**Resposta:** **Pari passu, simultâneo, sucessivo** e, conforme o material, **prospectivo**.\n\n**Entenda:** qualquer que seja a expressão usada, procure a ideia de acompanhamento **durante a execução**.\n\n**⚠️ Pegadinha:** a banca pode trocar o rótulo e manter a mesma descrição temporal.',
      '📄 Controle Externo — Aula 00, p. 21.',
      array['controle','checkpoint-01','controle-concomitante','sinonimos','cebraspe']::text[],
      6
    ),
    (
      'Acompanhar uma obra ou a gestão financeira ao longo do exercício é qual controle?',
      E'**Resposta:** **Controle concomitante**, pois a fiscalização ocorre durante a execução.\n\n**Entenda:** medições, pagamentos, cronograma e cumprimento contratual podem ser acompanhados enquanto a obra ainda está em andamento.\n\n**⚠️ Pegadinha:** acompanhar para prevenir dano não transforma o controle em “prévio”.',
      '📄 Controle Externo — Aula 00, p. 22.',
      array['controle','checkpoint-01','controle-concomitante','obra','cebraspe']::text[],
      7
    ),
    (
      'Quando ocorre o controle posterior (a posteriori)?',
      E'**Resposta:** Ocorre **depois que o ato ou atividade já foi praticado**.\n\n**Entenda:** pode examinar legalidade, regularidade, resultados, responsabilidade e eventual dano.\n\n**⚠️ Pegadinha:** posterior descreve o **momento**; não significa que sua única finalidade seja punir.',
      '📄 Controle Externo — Aula 00, p. 22.',
      array['controle','checkpoint-01','controle-posterior','cebraspe']::text[],
      8
    ),
    (
      '“O controle posterior serve exclusivamente para corrigir atos.” Certo ou errado?',
      E'**Resposta:** **Errado.**\n\n**Entenda:** o controle posterior pode **confirmar a regularidade**, identificar irregularidades, avaliar resultados, determinar correções, apurar responsabilidade e fundamentar sanções.\n\n**⚠️ Pegadinha Cebraspe:** desconfie de “exclusivamente”, “apenas” ou “somente”.',
      '📄 Controle Externo — Aula 00, p. 22. Pegadinha típica de absolutização.',
      array['controle','checkpoint-01','controle-posterior','pegadinha','cebraspe']::text[],
      9
    ),
    (
      'Análise de prestação de contas é exemplo de qual tipo de controle?',
      E'**Resposta:** Em regra, é exemplo de **controle posterior**, pois examina atos de gestão já realizados.\n\n**Entenda:** o objeto analisado pode envolver legalidade, legitimidade, economicidade, resultados e responsabilidade, mas temporalmente o exame ocorre **depois** dos atos.\n\n**⚠️ Pegadinha:** momento e objeto são classificações distintas.',
      '📄 Controle Externo — Aula 00, p. 22.',
      array['controle','checkpoint-01','controle-posterior','prestacao-de-contas','cebraspe']::text[],
      10
    )
)
update public.cards c
set back = u.back,
    note = u.note,
    tags = u.tags,
    sort_order = u.sort_order,
    active = true,
    updated_at = now()
from updates u, target_deck t
where c.deck_id = t.id
  and c.front = u.front;

with target_deck as (
  select id
  from public.decks
  where slug = 'controle-checkpoint-01-previo-concomitante-posterior'
)
insert into public.cards (deck_id, front, back, note, tags, sort_order, active, updated_at)
select t.id, v.front, v.back, v.note, v.tags, v.sort_order, true, now()
from target_deck t
cross join (
  values
    (
      'O controle externo é necessariamente ou exclusivamente posterior?',
      E'**Resposta:** **Não.**\n\n**Entenda:** controle externo identifica **quem exerce o controle**; prévio, concomitante e posterior identificam **quando** ele ocorre. Um tribunal de contas pode atuar preventivamente, durante a execução ou posteriormente, conforme a competência aplicável.\n\n**⚠️ Pegadinha:** externo ≠ posterior.',
      '🧠 Padrão recorrente Cebraspe em provas de controle.',
      array['controle','checkpoint-01','controle-externo','classificacoes','cebraspe']::text[],
      11
    ),
    (
      'Controle prévio e controle preventivo são classificações tecnicamente idênticas?',
      E'**Resposta:** **Não necessariamente.**\n\n**Entenda:** “prévio” classifica o **momento** do controle. “Preventivo” descreve sua função ou efeito de evitar irregularidades. O controle prévio é fortemente preventivo, mas os conceitos não são critérios classificatórios idênticos.\n\n**⚠️ Pegadinha:** não trate palavras próximas como sinônimos automáticos.',
      '🧠 Distinção conceitual importante para itens C/E.',
      array['controle','checkpoint-01','controle-previo','preventivo','cebraspe']::text[],
      12
    ),
    (
      'Somente o controle prévio pode produzir efeito preventivo?',
      E'**Resposta:** **Não.**\n\n**Entenda:** o controle concomitante também pode impedir que uma irregularidade continue ou se agrave, pois atua enquanto a atividade ainda está em execução.\n\n**⚠️ Pegadinha:** “preventivo” não significa obrigatoriamente “realizado antes”.',
      '🧠 Relação entre finalidade preventiva e momento do controle.',
      array['controle','checkpoint-01','controle-concomitante','preventivo','cebraspe']::text[],
      13
    ),
    (
      'Um TCE acompanha um contrato em execução e verifica sua legalidade. Quais classificações coexistem?',
      E'**Resposta:** **Controle externo + concomitante + de legalidade.**\n\n**Entenda:** “externo” responde **quem controla**; “concomitante”, **quando**; “legalidade”, **o que/qual parâmetro está sendo examinado**.\n\n**⚠️ Pegadinha Cebraspe:** uma mesma fiscalização pode receber várias classificações ao mesmo tempo.',
      '🧠 Modelo de questão híbrida para tribunais de contas.',
      array['controle','checkpoint-01','controle-externo','concomitante','legalidade','cebraspe']::text[],
      14
    ),
    (
      'Quais quatro perguntas ajudam a resolver questões híbridas de controle?',
      E'**Resposta:** **QUANDO? → QUEM? → O QUÊ? → PODE?**\n\n**Entenda:** 1) momento: prévio/concomitante/posterior; 2) sujeito: interno/externo etc.; 3) objeto/parâmetro: legalidade, mérito, economicidade etc.; 4) competência: o órgão pode adotar a providência descrita?\n\n**Uso:** excelente para questões de Auditor.',
      '🧠 Método de resolução do CP01 para itens médios e difíceis.',
      array['controle','checkpoint-01','metodo','questao-hibrida','cebraspe']::text[],
      15
    ),
    (
      'Se um tribunal de contas pode atuar preventivamente, ele pode aprovar previamente a validade de qualquer contrato?',
      E'**Resposta:** **Não.**\n\n**Entenda:** atuação preventiva não equivale a poder genérico de substituir a Administração. O STF entende que o art. 71 da CF não atribui ao TCU competência genérica para examinar previamente a validade de contratos administrativos.\n\n**⚠️ Pegadinha:** poder fiscalizar antes ≠ poder gerir ou autorizar genericamente.',
      '⚖️ STF, art. 71 da CF: MS 24.510 e precedentes correlatos; aplicação por simetria aos TCs.',
      array['controle','checkpoint-01','tribunal-de-contas','controle-previo','competencia','stf','cebraspe']::text[],
      16
    ),
    (
      'Qual a diferença entre controlar a Administração e substituir o gestor?',
      E'**Resposta:** **Controlar** é fiscalizar e adotar as providências que a Constituição e a lei permitem; **substituir o gestor** é assumir a decisão administrativa que pertence ao Executivo/administrador.\n\n**Entenda:** o momento do controle não amplia, por si só, a competência do órgão controlador.\n\n**⚠️ Pegadinha:** “controle prévio” não transforma o TC em cogestor.',
      '🧠 Limite institucional importante em questões de controle externo.',
      array['controle','checkpoint-01','competencia','gestor','tribunal-de-contas','cebraspe']::text[],
      17
    ),
    (
      'O controle posterior possui finalidade exclusivamente punitiva?',
      E'**Resposta:** **Não.**\n\n**Entenda:** além de eventual responsabilização e sanção, ele pode confirmar a regularidade, avaliar resultados, apontar falhas, determinar ajustes e gerar aprendizado para controles futuros.\n\n**⚠️ Pegadinha:** “posterior” informa quando o controle ocorre, não limita seus possíveis efeitos.',
      '🧠 Pegadinha recorrente de absolutização.',
      array['controle','checkpoint-01','controle-posterior','finalidade','cebraspe']::text[],
      18
    ),
    (
      'Os efeitos de um controle posterior podem se projetar para o futuro?',
      E'**Resposta:** **Sim.**\n\n**Entenda:** mesmo sendo realizado depois do ato, suas conclusões podem gerar determinações, recomendações, responsabilização, aperfeiçoamento de procedimentos e prevenção de novas falhas.\n\n**⚠️ Pegadinha:** “posterior” não significa “sem capacidade corretiva ou preventiva futura”.',
      '🧠 Consequências do controle posterior.',
      array['controle','checkpoint-01','controle-posterior','efeitos','cebraspe']::text[],
      19
    ),
    (
      'Quais palavras exigem atenção especial em itens Cebraspe sobre modalidades de controle?',
      E'**Resposta:** **sempre, somente, exclusivamente, necessariamente, apenas, nunca, todo**.\n\n**Entenda:** a banca frequentemente transforma uma característica comum em regra absoluta. Verifique se a exclusividade realmente existe antes de julgar o item.\n\n**Exemplo:** “o controle externo é exclusivamente posterior” → errado.',
      '🧠 Estratégia de leitura para itens C/E.',
      array['controle','checkpoint-01','pegadinha','linguagem-absoluta','cebraspe']::text[],
      20
    )
) as v(front, back, note, tags, sort_order)
on conflict (deck_id, front) do update
set back = excluded.back,
    note = excluded.note,
    tags = excluded.tags,
    sort_order = excluded.sort_order,
    active = true,
    updated_at = now();

update public.decks
set description = 'CP01 — revisão intensiva Cebraspe: controle prévio, concomitante e posterior, classificações combinadas e limites de competência.',
    active = true
where slug = 'controle-checkpoint-01-previo-concomitante-posterior';
