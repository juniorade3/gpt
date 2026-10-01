-- Seed Banco de Dados - Views, Procedures, Triggers e Privilégios.
-- Idempotent: existing cards keep their UUIDs and review history.

with root_deck as (
  select id from public.decks where slug = 'banco-de-dados'
),
topic_deck as (
  insert into public.decks (slug, name, description, parent_id, sort_order, active)
  select
    'banco-de-dados-views-procedures-triggers-privilegios',
    'Views, Procedures, Triggers e Privilégios',
    'Views, stored procedures, triggers e controle de privilégios com GRANT e REVOKE.',
    id,
    23,
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
    ('O que é uma **VIEW**?',
     'É uma **tabela virtual** definida por uma consulta SQL armazenada no banco. Em geral, a view comum **não armazena os dados resultantes**.',
     'Revisão D+1 — Database CP07, 30/09/2026.',
     array['banco-de-dados','view','sql']::text[], 1),
    ('**VIEW** é uma tabela temporária? Certo ou errado?',
     '**Errado.** VIEW é um **objeto do banco** cuja definição contém uma consulta. Não deve ser confundida com tabela temporária.',
     'Pegadinha identificada na revisão de 30/09/2026.',
     array['banco-de-dados','view','pegadinha']::text[], 2),
    ('Qual a diferença central entre **tabela** e **VIEW comum**?',
     '**Tabela:** armazena dados.\n\n**VIEW comum:** armazena a **definição da consulta** e apresenta dados obtidos das tabelas-base.',
     'Revisão D+1 — Database CP07.',
     array['banco-de-dados','view','tabela']::text[], 3),
    ('Qual é a exceção à regra de que VIEW não armazena o resultado?',
     'A **materialized view** armazena fisicamente o resultado da consulta e precisa ser atualizada conforme o SGBD.',
     'Complemento importante para prova.',
     array['banco-de-dados','view','materialized-view']::text[], 4),
    ('Uma VIEW pode ajudar no **controle de acesso**? Como?',
     '**Sim.** Pode expor apenas determinadas colunas/linhas e ocultar dados que o usuário não precisa visualizar.',
     'Aplicação prática trabalhada na revisão.',
     array['banco-de-dados','view','seguranca','acesso']::text[], 5),
    ('O que é uma **stored procedure**?',
     'É uma **rotina armazenada no banco** com comandos SQL e lógica procedural, podendo receber parâmetros e executar várias operações.',
     'Revisão D+1 — Database CP07.',
     array['banco-de-dados','stored-procedure','sql']::text[], 6),
    ('Qual a diferença principal entre **procedure** e **trigger**?',
     '**Procedure:** normalmente é chamada explicitamente.\n\n**Trigger:** é disparada **automaticamente** por determinado evento.',
     'Distinção de prova.',
     array['banco-de-dados','procedure','trigger','pegadinha']::text[], 7),
    ('O que é uma **TRIGGER**?',
     'É uma rotina executada **automaticamente** quando ocorre determinado evento, como **INSERT**, **UPDATE** ou **DELETE**.',
     'Revisão D+1 — Database CP07.',
     array['banco-de-dados','trigger','sql']::text[], 8),
    ('O que faz **GRANT SELECT ON servidor TO junior**?',
     'Concede a junior **somente o privilégio SELECT** sobre servidor. Não concede automaticamente INSERT, UPDATE ou DELETE.',
     'Atenção: privilégio específico, não acesso irrestrito.',
     array['banco-de-dados','grant','privilegios','sql']::text[], 9),
    ('O que faz **REVOKE SELECT ON servidor FROM junior**?',
     'Retira de junior o privilégio **SELECT** concedido sobre servidor.',
     'Revisão D+1 — Database CP07.',
     array['banco-de-dados','revoke','privilegios','sql']::text[], 10)
) as card(front, back, note, tags, sort_order)
on conflict (deck_id, front) do update
  set back = excluded.back,
      note = excluded.note,
      tags = excluded.tags,
      sort_order = excluded.sort_order,
      active = true,
      updated_at = now();
