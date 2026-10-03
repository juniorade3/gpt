-- Expand Redes CP12 to the validated 20-card didactic review set.
-- Existing equivalent cards are updated in place to preserve UUIDs and FSRS/review history.
-- Obsolete cards are only deactivated, never deleted.

with target_deck as (
  select id
  from public.decks
  where slug = 'redes-diagnostico-dns-proxy-balanceamento'
),
mapped (
  old_front,
  new_front,
  back,
  note,
  tags,
  sort_order
) as (
  values
    (
      'O ping é um protocolo? Qual protocolo ele utiliza?',
      'Qual protocolo o ping utiliza? Ele trabalha com portas TCP ou UDP?',
      E'**Resposta:** O `ping` utiliza **ICMP** e não utiliza portas TCP ou UDP.\n\n**Entenda:** ICMP auxilia o protocolo IP no diagnóstico e na sinalização de condições da rede.\n\n**⚠️ Pegadinha Cebraspe:** “porta ICMP 8” está errado. **8 é um tipo de mensagem ICMP**, não uma porta.',
      '📄 PDF Redes — págs. 983 e 991.',
      array['redes','cp12','icmp','ping','diagnostico','cebraspe']::text[],
      4
    ),
    (
      'Qual registro DNS é usado na resolução reversa?',
      'Qual registro DNS é usado na resolução reversa e o que ele faz?',
      E'**Resposta:** O registro **PTR** é usado para resolução reversa: **IP → nome do host/domínio**.\n\n**Entenda:** Na resolução direta, normalmente ocorre o contrário: um nome é convertido em IP por registros **A (IPv4)** ou **AAAA (IPv6)**.\n\n**⚠️ Pegadinha Cebraspe:** PTR não tem relação com *proxy reverso*. São conceitos completamente diferentes.',
      '📄 PDF Redes — pág. 1246.',
      array['redes','cp12','dns','ptr','resolucao-reversa','cebraspe']::text[],
      1
    ),
    (
      'Qual a diferença entre consulta DNS recursiva e iterativa?',
      'Qual é a diferença entre uma consulta DNS recursiva e uma iterativa?',
      E'**Resposta:** Na **recursiva**, quem recebe a consulta deve buscar uma resposta final. Na **iterativa**, o servidor pode indicar outro servidor mais próximo da resposta.\n\n**Entenda:** Normalmente o cliente consulta seu resolver de forma recursiva, e o resolver consulta outros servidores DNS ao longo da hierarquia.\n\n**⚠️ Pegadinha:** recursiva não significa “consultar vários servidores”; significa assumir a responsabilidade pela resposta final.',
      '📄 PDF Redes — págs. 1242–1243.',
      array['redes','cp12','dns','recursiva','iterativa','cebraspe']::text[],
      2
    ),
    (
      'O que diferencia um proxy direto de um proxy reverso?',
      'Qual é a diferença fundamental entre proxy e reverse proxy?',
      E'**Resposta:** O **proxy** atua em nome dos clientes; o **reverse proxy** atua diante dos servidores/backends.\n\n**Entenda:** No primeiro caso, o destino vê o proxy representando o cliente. No segundo, o cliente conversa com o reverse proxy sem precisar conhecer os servidores internos.\n\n**Memória:** proxy → lado do cliente; reverse proxy → lado do servidor.',
      '📄 PDF Redes — pág. 1141.',
      array['redes','cp12','proxy','proxy-reverso','cebraspe']::text[],
      10
    ),
    (
      'Qual é a função de um proxy cache?',
      'Qual é a vantagem de utilizar cache em um proxy ou reverse proxy?',
      E'**Resposta:** Reutilizar respostas já armazenadas, reduzindo **latência, tráfego e carga sobre o servidor de origem**.\n\n**Entenda:** Se vários clientes solicitam o mesmo conteúdo válido, o cache pode responder sem encaminhar todas as requisições ao backend.\n\n**⚠️ Atenção:** o conteúdo do cache precisa respeitar políticas de validade e expiração.',
      '📄 PDF Redes — pág. 1140.',
      array['redes','cp12','proxy','cache','cebraspe']::text[],
      20
    ),
    (
      'O que significa LRU?',
      'O que significa LRU e qual item ele remove do cache?',
      E'**Resposta:** **Least Recently Used**. Remove o item que está há mais tempo sem ser acessado.\n\n**Entenda:** O critério é a **recência do último acesso**, não quantas vezes o objeto foi utilizado ao longo do tempo.\n\n**⚠️ Pegadinha:** LRU ≠ Least Frequently Used.',
      '📄 PDF Redes — pág. 2203.',
      array['redes','cp12','lru','cache','cebraspe']::text[],
      18
    ),
    (
      'Como funciona o algoritmo Round Robin no balanceamento de carga?',
      'O que é Round Robin no balanceamento de carga?',
      E'**Resposta:** É um algoritmo que distribui as requisições de forma **cíclica e sequencial** entre os servidores.\n\n**Exemplo:** A → B → C → A → B → C.\n\n**⚠️ Pegadinha Cebraspe:** Round Robin não verifica necessariamente CPU, memória ou número de conexões antes de escolher.',
      '📄 PDF Redes — pág. 2339.',
      array['redes','cp12','balanceamento','round-robin','cebraspe']::text[],
      12
    ),
    (
      'Qual a diferença entre Round Robin e Least Connections?',
      'Qual é a diferença essencial entre Round Robin e Least Connections?',
      E'**Resposta:** **Round Robin segue uma sequência; Least Connections observa a quantidade de conexões ativas.**\n\n**Entenda:** Round Robin prioriza simplicidade. Least Connections tenta levar em conta a ocupação atual dos servidores.\n\n**⚠️ Pegadinha:** nenhum dos dois significa automaticamente “escolher a menor CPU”.',
      '🧩 Complemento Cebraspe — Least Connections não foi localizado explicitamente no PDF principal.',
      array['redes','cp12','balanceamento','round-robin','least-connections','cebraspe']::text[],
      15
    ),
    (
      'Qual a diferença entre balanceamento L4 e L7?',
      'Qual é a diferença entre balanceamento L4 e L7?',
      E'**Resposta:** **L4** toma decisões principalmente com informações como IP, protocolo e porta; **L7** entende informações da aplicação.\n\n**Entenda:** Um balanceador L7 pode analisar HTTP, incluindo URL, Host, headers e cookies.\n\n**Memória:** L4 → transporte; L7 → aplicação.',
      '🧩 Complemento Cebraspe — L4 × L7 não foi localizado explicitamente no PDF principal.',
      array['redes','cp12','balanceamento','l4','l7','cebraspe']::text[],
      16
    )
)
update public.cards c
set
  front = mapped.new_front,
  back = mapped.back,
  note = mapped.note,
  tags = mapped.tags,
  sort_order = mapped.sort_order,
  active = true,
  updated_at = now()
from mapped, target_deck
where c.deck_id = target_deck.id
  and c.front = mapped.old_front;

with target_deck as (
  select id
  from public.decks
  where slug = 'redes-diagnostico-dns-proxy-balanceamento'
)
update public.cards
set active = false,
    updated_at = now()
where deck_id = (select id from target_deck)
  and front in (
    'Quais características essenciais diferenciam o TCP?',
    'Em qual camada da pilha TCP/IP fica o ICMP?',
    'Qual comando é típico do Windows para visualizar configuração IP?'
  );

with target_deck as (
  select id
  from public.decks
  where slug = 'redes-diagnostico-dns-proxy-balanceamento'
)
insert into public.cards (deck_id, front, back, note, tags, sort_order, active, updated_at)
select
  target_deck.id,
  card.front,
  card.back,
  card.note,
  card.tags,
  card.sort_order,
  true,
  now()
from target_deck
cross join (
  values
    (
      'Qual registro DNS é usado na resolução reversa e o que ele faz?',
      E'**Resposta:** O registro **PTR** é usado para resolução reversa: **IP → nome do host/domínio**.\n\n**Entenda:** Na resolução direta, normalmente ocorre o contrário: um nome é convertido em IP por registros **A (IPv4)** ou **AAAA (IPv6)**.\n\n**⚠️ Pegadinha Cebraspe:** PTR não tem relação com *proxy reverso*. São conceitos completamente diferentes.',
      '📄 PDF Redes — pág. 1246.',
      array['redes','cp12','dns','ptr','resolucao-reversa','cebraspe']::text[],
      1
    ),
    (
      'Qual é a diferença entre uma consulta DNS recursiva e uma iterativa?',
      E'**Resposta:** Na **recursiva**, quem recebe a consulta deve buscar uma resposta final. Na **iterativa**, o servidor pode indicar outro servidor mais próximo da resposta.\n\n**Entenda:** Normalmente o cliente consulta seu resolver de forma recursiva, e o resolver consulta outros servidores DNS ao longo da hierarquia.\n\n**⚠️ Pegadinha:** recursiva não significa “consultar vários servidores”; significa assumir a responsabilidade pela resposta final.',
      '📄 PDF Redes — págs. 1242–1243.',
      array['redes','cp12','dns','recursiva','iterativa','cebraspe']::text[],
      2
    ),
    (
      'Qual porta o DNS utiliza e quais protocolos de transporte podem ser usados?',
      E'**Resposta:** DNS utiliza a **porta 53**, podendo funcionar sobre **UDP ou TCP**.\n\n**Entenda:** Consultas comuns frequentemente usam UDP, mas TCP também faz parte do DNS e é usado em situações específicas.\n\n**⚠️ Pegadinha Cebraspe:** é errado afirmar que DNS utiliza exclusivamente UDP.',
      '📄 PDF Redes — seção DNS, págs. 1234–1258.',
      array['redes','cp12','dns','porta-53','tcp','udp','cebraspe']::text[],
      3
    ),
    (
      'Qual protocolo o ping utiliza? Ele trabalha com portas TCP ou UDP?',
      E'**Resposta:** O `ping` utiliza **ICMP** e não utiliza portas TCP ou UDP.\n\n**Entenda:** ICMP auxilia o protocolo IP no diagnóstico e na sinalização de condições da rede.\n\n**⚠️ Pegadinha Cebraspe:** “porta ICMP 8” está errado. **8 é um tipo de mensagem ICMP**, não uma porta.',
      '📄 PDF Redes — págs. 983 e 991.',
      array['redes','cp12','icmp','ping','diagnostico','cebraspe']::text[],
      4
    ),
    (
      'Quais mensagens ICMP estão associadas ao ping no IPv4?',
      E'**Resposta:** O `ping` utiliza **Echo Request (tipo 8)** e **Echo Reply (tipo 0)**.\n\n**Entenda:** A origem envia um Echo Request e, se o destino puder responder, recebe um Echo Reply.\n\n**⚠️ Pegadinha:** esses números identificam **tipos ICMP**, e não números de portas.',
      '📄 PDF Redes — seção ICMP, págs. 983–998.',
      array['redes','cp12','icmp','ping','echo-request','echo-reply','cebraspe']::text[],
      5
    ),
    (
      'Se ping 8.8.8.8 funciona, mas ping google.com falha, qual é a principal suspeita?',
      E'**Resposta:** A principal suspeita é **falha na resolução DNS**.\n\n**Entenda:** O acesso direto ao IP demonstra que existe conectividade IP. O problema aparece quando é necessário converter o nome em endereço IP.\n\n**Diagnóstico:** `nslookup` ou `dig` ajudam a investigar a resolução DNS.',
      '📄 PDF Redes — troubleshooting DNS, pág. 1248.',
      array['redes','cp12','dns','ping','troubleshooting','cebraspe']::text[],
      6
    ),
    (
      'Se o ping de um servidor falhar, podemos afirmar que o servidor está desligado?',
      E'**Resposta:** **Não.**\n\n**Entenda:** O servidor pode estar funcionando e simplesmente não responder a ICMP. Firewall, ACL, roteamento ou perda de pacotes também podem impedir a resposta.\n\n**⚠️ Pegadinha Cebraspe:** falha no ping não prova indisponibilidade do serviço.',
      '📄 PDF Redes — seção ICMP e diagnóstico, págs. 983–998.',
      array['redes','cp12','icmp','ping','troubleshooting','firewall','cebraspe']::text[],
      7
    ),
    (
      'Para que serve o comando nslookup?',
      E'**Resposta:** Serve para realizar **consultas DNS** e auxiliar no diagnóstico da resolução de nomes.\n\n**Entenda:** Pode consultar endereços associados a nomes, registros DNS e servidores responsáveis pela resposta.\n\n**Exemplo:** se o acesso por IP funciona, mas por nome não, `nslookup` ajuda a investigar o DNS.',
      '📄 PDF Redes — pág. 1248.',
      array['redes','cp12','dns','nslookup','troubleshooting','cebraspe']::text[],
      8
    ),
    (
      'O que faz ipconfig /flushdns no Windows?',
      E'**Resposta:** Limpa o **cache DNS local** do computador.\n\n**Entenda:** Ele remove registros de resolução armazenados localmente, forçando novas consultas quando necessário.\n\n**⚠️ Pegadinha:** não altera o endereço IP e não limpa o cache do servidor DNS da rede.',
      '📄 PDF Redes — troubleshooting DNS, pág. 1248.',
      array['redes','cp12','dns','ipconfig','flushdns','cache','cebraspe']::text[],
      9
    ),
    (
      'Qual é a diferença fundamental entre proxy e reverse proxy?',
      E'**Resposta:** O **proxy** atua em nome dos clientes; o **reverse proxy** atua diante dos servidores/backends.\n\n**Entenda:** No primeiro caso, o destino vê o proxy representando o cliente. No segundo, o cliente conversa com o reverse proxy sem precisar conhecer os servidores internos.\n\n**Memória:** proxy → lado do cliente; reverse proxy → lado do servidor.',
      '📄 PDF Redes — pág. 1141.',
      array['redes','cp12','proxy','proxy-reverso','cebraspe']::text[],
      10
    ),
    (
      'Quais funções um reverse proxy pode desempenhar?',
      E'**Resposta:** Pode fazer **balanceamento, cache, terminação TLS, roteamento, controle de acesso e proteção dos backends**.\n\n**Entenda:** Ele funciona como ponto de entrada para os servidores internos e pode decidir para qual backend encaminhar cada requisição.\n\n**⚠️ Pegadinha:** reverse proxy não é sinônimo de NAT.',
      '📄 PDF Redes — págs. 1141 e 1542–1551.',
      array['redes','cp12','proxy-reverso','balanceamento','cache','tls','cebraspe']::text[],
      11
    ),
    (
      'O que é Round Robin no balanceamento de carga?',
      E'**Resposta:** É um algoritmo que distribui as requisições de forma **cíclica e sequencial** entre os servidores.\n\n**Exemplo:** A → B → C → A → B → C.\n\n**⚠️ Pegadinha Cebraspe:** Round Robin não verifica necessariamente CPU, memória ou número de conexões antes de escolher.',
      '📄 PDF Redes — pág. 2339.',
      array['redes','cp12','balanceamento','round-robin','cebraspe']::text[],
      12
    ),
    (
      'Como funciona o algoritmo Least Connections?',
      E'**Resposta:** A nova conexão é direcionada ao servidor com **menos conexões ativas naquele momento**.\n\n**Entenda:** Diferentemente do Round Robin, ele observa o estado das conexões antes de selecionar o backend.\n\n**⚠️ Pegadinha:** “menos conexões” não significa necessariamente “menor processamento”.',
      '🧩 Complemento Cebraspe — conceito não localizado explicitamente no PDF principal.',
      array['redes','cp12','balanceamento','least-connections','cebraspe']::text[],
      13
    ),
    (
      'Um servidor com menos conexões sempre possui menor carga computacional?',
      E'**Resposta:** **Não.**\n\n**Entenda:** Uma única conexão pode consumir muita CPU ou memória, enquanto várias conexões podem consumir poucos recursos.\n\n**Consequência:** o **Least Connections mede conexões ativas**, não carga real de CPU ou memória.',
      '🧩 Complemento de revisão — distinção importante para Least Connections.',
      array['redes','cp12','balanceamento','least-connections','cpu','cebraspe']::text[],
      14
    ),
    (
      'Qual é a diferença essencial entre Round Robin e Least Connections?',
      E'**Resposta:** **Round Robin segue uma sequência; Least Connections observa a quantidade de conexões ativas.**\n\n**Entenda:** Round Robin prioriza simplicidade. Least Connections tenta levar em conta a ocupação atual dos servidores.\n\n**⚠️ Pegadinha:** nenhum dos dois significa automaticamente “escolher a menor CPU”.',
      '🧩 Complemento Cebraspe — Least Connections não foi localizado explicitamente no PDF principal.',
      array['redes','cp12','balanceamento','round-robin','least-connections','cebraspe']::text[],
      15
    ),
    (
      'Qual é a diferença entre balanceamento L4 e L7?',
      E'**Resposta:** **L4** toma decisões principalmente com informações como IP, protocolo e porta; **L7** entende informações da aplicação.\n\n**Entenda:** Um balanceador L7 pode analisar HTTP, incluindo URL, Host, headers e cookies.\n\n**Memória:** L4 → transporte; L7 → aplicação.',
      '🧩 Complemento Cebraspe — L4 × L7 não foi localizado explicitamente no PDF principal.',
      array['redes','cp12','balanceamento','l4','l7','cebraspe']::text[],
      16
    ),
    (
      'Um balanceador envia /api para um servidor e /imagens para outro. Isso é L4 ou L7?',
      E'**Resposta:** **L7.**\n\n**Entenda:** Para diferenciar `/api` de `/imagens`, o balanceador precisa interpretar a **URL HTTP**, uma informação da camada de aplicação.\n\n**⚠️ Pegadinha:** somente conhecer a porta 443 não permitiria tomar essa decisão.',
      '🧩 Complemento Cebraspe — aplicação prática de balanceamento L7.',
      array['redes','cp12','balanceamento','l7','http','url','cebraspe']::text[],
      17
    ),
    (
      'O que significa LRU e qual item ele remove do cache?',
      E'**Resposta:** **Least Recently Used**. Remove o item que está há mais tempo sem ser acessado.\n\n**Entenda:** O critério é a **recência do último acesso**, não quantas vezes o objeto foi utilizado ao longo do tempo.\n\n**⚠️ Pegadinha:** LRU ≠ Least Frequently Used.',
      '📄 PDF Redes — pág. 2203.',
      array['redes','cp12','lru','cache','cebraspe']::text[],
      18
    ),
    (
      'Um objeto foi acessado 500 vezes ontem e outro duas vezes agora. Qual deles o LRU tende a remover primeiro?',
      E'**Resposta:** O objeto acessado 500 vezes **ontem**, se ele for o menos recentemente utilizado.\n\n**Entenda:** LRU não se importa com a frequência histórica; interessa quando ocorreu o **último acesso**.\n\n**⚠️ Pegadinha:** “muito utilizado” não significa necessariamente “mantido no cache”.',
      '📄 PDF Redes — pág. 2203; exemplo de recuperação ativa.',
      array['redes','cp12','lru','cache','situacional','cebraspe']::text[],
      19
    ),
    (
      'Qual é a vantagem de utilizar cache em um proxy ou reverse proxy?',
      E'**Resposta:** Reutilizar respostas já armazenadas, reduzindo **latência, tráfego e carga sobre o servidor de origem**.\n\n**Entenda:** Se vários clientes solicitam o mesmo conteúdo válido, o cache pode responder sem encaminhar todas as requisições ao backend.\n\n**⚠️ Atenção:** o conteúdo do cache precisa respeitar políticas de validade e expiração.',
      '📄 PDF Redes — pág. 1140.',
      array['redes','cp12','proxy','cache','cebraspe']::text[],
      20
    )
) as card(front, back, note, tags, sort_order)
on conflict (deck_id, front) do update
set
  back = excluded.back,
  note = excluded.note,
  tags = excluded.tags,
  sort_order = excluded.sort_order,
  active = true,
  updated_at = now();

-- Keep the subdeck metadata aligned with the validated review purpose.
update public.decks
set
  description = 'CP12 — revisão ativa Cebraspe de DNS, ICMP, troubleshooting, proxies, cache e balanceamento de carga.',
  active = true
where slug = 'redes-diagnostico-dns-proxy-balanceamento';
