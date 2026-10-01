-- Seed Controle Interno e Externo - Checkpoint 01.
-- Idempotent: existing cards keep their UUIDs and review history.

with root_deck as (
  insert into public.decks (slug, name, description, parent_id, sort_order, active)
  values (
    'controle-interno-externo',
    '🏛️ Controle Interno e Externo',
    'Controle da Administração Pública, sistemas de controle e controle externo.',
    null,
    50,
    true
  )
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        parent_id = null,
        sort_order = excluded.sort_order,
        active = true
  returning id
),
topic_deck as (
  insert into public.decks (slug, name, description, parent_id, sort_order, active)
  select
    'controle-checkpoint-01-previo-concomitante-posterior',
    'Checkpoint 01 — Controle prévio, concomitante e posterior',
    'Aula 00 — Controle da Administração. Classificação do controle quanto ao momento ou oportunidade.',
    id,
    51,
    true
  from root_deck
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        parent_id = excluded.parent_id,
        sort_order = excluded.sort_order,
        active = true
  returning id
)
insert into public.cards (deck_id, front, back, note, tags, sort_order, active, updated_at)
select
  topic_deck.id,
  card.front,
  card.back,
  card.note,
  card.tags,
  card.sort_order,
  true,
  now()
from topic_deck
cross join (
  values
    (
      'Quanto ao momento, como o controle administrativo é classificado?',
      '**Prévio (a priori)** → antes.\n\n**Concomitante (pari passu)** → durante.\n\n**Posterior (a posteriori)** → depois.',
      '📄 Controle Externo — Aula 00, roteiro de revisão, p. 21–22.',
      array['controle','checkpoint-01','classificacao-temporal']::text[],
      1
    ),
    (
      'Quando ocorre o controle prévio (a priori)?',
      'Ocorre **antes de a conduta administrativa se efetivar**. Tem caráter preventivo e orientador.',
      '📄 Controle Externo — Aula 00, p. 21.',
      array['controle','checkpoint-01','controle-previo']::text[],
      2
    ),
    (
      'Qual é um exemplo típico de controle prévio?',
      'A exigência de **autorização ou laudo antes da prática do ato**.',
      '📄 Controle Externo — Aula 00, p. 21.',
      array['controle','checkpoint-01','controle-previo','autorizacao']::text[],
      3
    ),
    (
      'Autorização para contratar operação de crédito é qual tipo de controle?',
      '**Controle prévio**, porque a autorização ocorre antes da contratação da operação.',
      '🧠 Ponto trabalhado na questão 6-C.',
      array['controle','checkpoint-01','controle-previo','operacao-de-credito']::text[],
      4
    ),
    (
      'Quando ocorre o controle concomitante (pari passu)?',
      'Ocorre **enquanto a conduta administrativa está sendo praticada**.',
      '📄 Controle Externo — Aula 00, p. 21.',
      array['controle','checkpoint-01','controle-concomitante']::text[],
      5
    ),
    (
      'Quais sinônimos podem aparecer para controle concomitante?',
      '**Sucessivo, simultâneo ou prospectivo.**',
      '📄 Controle Externo — Aula 00, p. 21.',
      array['controle','checkpoint-01','controle-concomitante','sinonimos']::text[],
      6
    ),
    (
      'Acompanhar uma obra ou a gestão financeira ao longo do exercício é qual controle?',
      '**Controle concomitante**, pois o acompanhamento ocorre durante a execução.',
      '📄 Controle Externo — Aula 00, p. 22.',
      array['controle','checkpoint-01','controle-concomitante','exemplo']::text[],
      7
    ),
    (
      'Quando ocorre o controle posterior (a posteriori)?',
      'É efetuado **após a conduta administrativa**.',
      '📄 Controle Externo — Aula 00, p. 22.',
      array['controle','checkpoint-01','controle-posterior']::text[],
      8
    ),
    (
      '“O controle posterior serve exclusivamente para corrigir atos.” Certo ou errado?',
      '**Errado.** Ele pode **corrigir o ato ou confirmar sua regularidade**.',
      '🧠 Pegadinha trabalhada na questão 4. 📄 Aula 00, p. 22.',
      array['controle','checkpoint-01','controle-posterior','pegadinha']::text[],
      9
    ),
    (
      'Análise de prestação de contas é exemplo de qual tipo de controle?',
      '**Controle posterior**, pois examina atos de gestão depois de realizados.',
      '🧠 Ponto trabalhado na questão 10. 📄 Aula 00, p. 22.',
      array['controle','checkpoint-01','controle-posterior','prestacao-de-contas']::text[],
      10
    )
) as card(front, back, note, tags, sort_order)
on conflict (deck_id, front) do update
  set back = excluded.back,
      note = excluded.note,
      tags = excluded.tags,
      sort_order = excluded.sort_order,
      active = true,
      updated_at = now();
