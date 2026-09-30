-- Seed Redes de Computadores and the first thematic subcategory.
-- Idempotent: existing cards keep their UUIDs and review history.

with root_deck as (
  insert into public.decks (slug, name, description, parent_id, sort_order, active)
  values (
    'redes-de-computadores',
    '🌐 Redes de Computadores',
    'Protocolos, serviços, diagnóstico e infraestrutura de redes.',
    null,
    40,
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
    'redes-diagnostico-dns-proxy-balanceamento',
    'Diagnóstico, DNS, Proxy e Balanceamento',
    'Revisão ativa de troubleshooting, DNS, proxies, cache e balanceamento de carga.',
    id,
    41,
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
      'Quais características essenciais diferenciam o TCP?',
      '**TCP** é orientado à conexão, confiável e entrega os dados em ordem. Usa **ACK** e **retransmissão** para aumentar a confiabilidade.',
      '📄 PDF Redes — págs. 1057 e 1060.',
      array['redes','tcp','transporte']::text[],
      1
    ),
    (
      'O ping é um protocolo? Qual protocolo ele utiliza?',
      'Não. **Ping** é uma ferramenta/aplicação de diagnóstico e utiliza o protocolo **ICMP**.',
      '📄 PDF Redes — págs. 983 e 991.',
      array['redes','icmp','ping','diagnostico']::text[],
      2
    ),
    (
      'Em qual camada da pilha TCP/IP fica o ICMP?',
      '**ICMP:** camada Internet/rede.\n\n**TCP e UDP:** camada de transporte.',
      '📄 PDF Redes — págs. 983 e 991.',
      array['redes','icmp','tcp-ip','camadas']::text[],
      3
    ),
    (
      'Qual comando é típico do Windows para visualizar configuração IP?',
      '**Windows:** `ipconfig`.\n\nNo Linux, tradicionalmente `ifconfig`; modernamente, `ip addr`.',
      '📄 PDF Redes — pág. 1248. A referência a comandos Linux é complemento da revisão.',
      array['redes','troubleshooting','ipconfig','comandos']::text[],
      4
    ),
    (
      'Qual registro DNS é usado na resolução reversa?',
      '**PTR:** IP → nome.\n\n**A:** nome → IPv4.\n\n**AAAA:** nome → IPv6.',
      '📄 PDF Redes — pág. 1246.',
      array['redes','dns','ptr','resolucao-reversa']::text[],
      5
    ),
    (
      'Qual a diferença entre consulta DNS recursiva e iterativa?',
      '**Recursiva:** o servidor busca a resposta final.\n\n**Iterativa:** o resolvedor continua consultando outros servidores.',
      '📄 PDF Redes — págs. 1242–1243.',
      array['redes','dns','recursiva','iterativa']::text[],
      6
    ),
    (
      'O que diferencia um proxy direto de um proxy reverso?',
      '**Proxy direto:** representa o cliente.\n\n**Proxy reverso:** representa/protege os servidores.',
      '📄 PDF Redes — pág. 1141.',
      array['redes','proxy','proxy-reverso']::text[],
      7
    ),
    (
      'Qual é a função de um proxy cache?',
      'Armazenar conteúdo temporariamente e **reutilizá-lo** em novas requisições, reduzindo consultas repetidas e consumo de banda.',
      '📄 PDF Redes — pág. 1140.',
      array['redes','proxy','cache']::text[],
      8
    ),
    (
      'O que significa LRU?',
      '**LRU = Least Recently Used.**\n\nRemove/substitui o item que está há mais tempo sem ser utilizado.',
      '📄 PDF Redes — pág. 2203.',
      array['redes','lru','cache']::text[],
      9
    ),
    (
      'Como funciona o algoritmo Round Robin no balanceamento de carga?',
      'Distribui as requisições **alternadamente** entre os servidores, seguindo uma ordem cíclica.',
      '📄 PDF Redes — pág. 2339.',
      array['redes','balanceamento','round-robin']::text[],
      10
    ),
    (
      'Qual a diferença entre Round Robin e Least Connections?',
      '**Round Robin:** distribui pela vez.\n\n**Least Connections:** envia para o servidor com menos conexões ativas.',
      '🧩 Complemento da revisão — Least Connections não foi localizado explicitamente no PDF.',
      array['redes','balanceamento','round-robin','least-connections']::text[],
      11
    ),
    (
      'Qual a diferença entre balanceamento L4 e L7?',
      '**L4:** usa IP, porta e TCP/UDP.\n\n**L7:** pode usar HTTP, URL, headers, cookies e outros dados da aplicação.',
      '🧩 Complemento da revisão — L4 × L7 não foi localizado explicitamente no PDF.',
      array['redes','balanceamento','l4','l7']::text[],
      12
    )
) as card(front, back, note, tags, sort_order)
on conflict (deck_id, front) do update
  set back = excluded.back,
      note = excluded.note,
      tags = excluded.tags,
      sort_order = excluded.sort_order,
      active = true,
      updated_at = now();
