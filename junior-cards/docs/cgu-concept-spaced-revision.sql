-- Revisão Inteligente por Questões (RIQ): additive, no changes to existing FSRS or answer keys.
create table if not exists public.cgu_concepts (
 id text primary key,
 topic text not null,
 title text not null,
 description text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.cgu_concept_questions (
 concept_id text not null references public.cgu_concepts(id),
 question_id text not null references public.cgu_questions(id),
 primary key (concept_id,question_id),
 unique (question_id)
);
create index if not exists cgu_concept_questions_question_idx on public.cgu_concept_questions(question_id);

create table if not exists public.cgu_revision_state (
 concept_id text primary key references public.cgu_concepts(id),
 stage text not null default 'learning' check (stage in ('learning','consolidating','consolidated')),
 due_at timestamptz not null default now(),
 interval_days integer not null default 0 check (interval_days between 0 and 365),
 spaced_successes integer not null default 0,
 lapses integer not null default 0,
 last_attempt_id uuid references public.cgu_attempts(id),
 last_question_id text references public.cgu_questions(id),
 last_reviewed_at timestamptz,
 updated_at timestamptz not null default now()
);
create index if not exists cgu_revision_due_idx on public.cgu_revision_state(due_at);

create table if not exists public.cgu_revision_events (
 attempt_id uuid primary key references public.cgu_attempts(id),
 concept_id text not null references public.cgu_concepts(id),
 question_id text not null references public.cgu_questions(id),
 response text not null,
 confidence text not null,
 is_correct boolean not null,
 recognized boolean not null,
 spaced boolean not null,
 qualified boolean not null,
 transfer boolean not null,
 previous_stage text,
 stage text not null,
 interval_days integer not null,
 next_due_at timestamptz not null,
 created_at timestamptz not null
);
create index if not exists cgu_revision_events_concept_time_idx on public.cgu_revision_events(concept_id,created_at desc);
create index if not exists cgu_revision_events_time_idx on public.cgu_revision_events(created_at desc);

alter table public.cgu_concepts enable row level security;
alter table public.cgu_concept_questions enable row level security;
alter table public.cgu_revision_state enable row level security;
alter table public.cgu_revision_events enable row level security;
revoke all on public.cgu_concepts,public.cgu_concept_questions,public.cgu_revision_state,public.cgu_revision_events from anon,authenticated;
grant select,insert,update,delete on public.cgu_concepts,public.cgu_concept_questions,public.cgu_revision_state,public.cgu_revision_events to service_role;

-- Conservative, human-readable concept families: never merge unrelated subtopics by subject alone.
do $seed$
declare q record; k text; label text;
begin
 for q in select id,topic,coalesce(subtopic,'') subtopic,subject from public.cgu_questions loop
   k := case
    when q.topic='I2.1' and (q.subtopic='I2.1.1' or q.subject ~* 'middleware|IaaS.PaaS') then 'i21-service-models'
    when q.topic='I2.1' and q.subtopic='I2.1.2' then 'i21-deployment'
    when q.topic='I2.1' and q.subtopic='I2.1.3' then 'i21-elasticity'
    when q.topic='I2.1' and q.subtopic='I2.1.4' then 'i21-governance'
    when q.topic='I2.2' and q.subtopic='I2.2.1' and q.subject ~* 'Kubernetes|Rancher|kubectl|kubeconfig|pod|cluster|CRI|OpenShift' then 'i22-orchestration'
    when q.topic='I2.2' and q.subtopic='I2.2.1' and q.subject ~* 'Docker|contêiner|conteiner|microsserviço' then 'i22-containers'
    when q.topic='I2.2' and q.subtopic='I2.2.1' then 'i22-virtualization'
    when q.topic='I2.2' and q.subtopic='I2.2.2' and q.subject ~* 'porta|bind' then 'i22-ports'
    when q.topic='I2.2' and q.subtopic='I2.2.2' and q.subject ~* 'isolamento|namespace|kernel|diretório' then 'i22-isolation'
    when q.topic='I2.2' and q.subtopic='I2.2.2' then 'i22-capacity'
    when q.topic='I2.2' and q.subtopic='I2.2.3' and q.subject ~* 'imagem|ImageStream|atualizaç' then 'i22-updates'
    when q.topic='I2.2' and q.subtopic='I2.2.3' then 'i22-resilience'
    when q.topic='I2.2' and q.subtopic='I2.2.4' then 'i22-ha'
    when q.topic='I2.3' and q.subtopic='I2.3.1' and q.subject ~* 'evento' then 'i23-events'
    when q.topic='I2.3' and q.subtopic='I2.3.1' then 'i23-load-balancing'
    when q.topic='I2.3' and q.subject ~* 'RabbitMQ|Kafka|fila|mensag|broker|quórum|stream|queue' then 'i23-messaging'
    when q.topic='I2.3' and q.subject ~* 'REST|SOAP|API|SDK|XML|JSON|ESB|web service' then 'i23-integrations'
    when q.topic='I2.3' then 'i23-microservices'
    when q.topic='I2.4' and q.subject ~* 'MLOps|modelos|modelo,' then 'i24-mlops'
    when q.topic='I2.4' and q.subject ~* 'Terraform|providers|infraestrutura como código|Provisionar redes' then 'i24-terraform'
    when q.topic='I2.4' and q.subtopic='I2.4.1' and q.subject ~* 'Git|clone|branch|rebase|commit|merge' then 'i24-git'
    when q.topic='I2.4' and q.subtopic='I2.4.1' then 'i24-config'
    when q.topic='I2.4' and q.subtopic='I2.4.3' then 'i24-secrets'
    when q.topic='I2.4' then 'i24-cicd'
    when q.topic='I2.5' and q.subject ~* 'rsync|OneDrive|sincroniza' then 'i25-sync'
    when q.topic='I2.5' and q.subject ~* 'custos|custo|subscrição|subscriç' then 'i25-cost'
    when q.topic='I2.5' then 'i25-migration'
    else 'individual:'||q.id
   end;
   label := case k
     when 'i21-service-models' then 'IaaS, PaaS, SaaS e responsabilidade'
     when 'i21-deployment' then 'Modelos de implantação de nuvem'
     when 'i21-elasticity' then 'Elasticidade, escalabilidade e recursos'
     when 'i21-governance' then 'Governança e segurança na nuvem'
     when 'i22-orchestration' then 'Kubernetes e orquestração'
     when 'i22-containers' then 'Contêineres e execução de aplicações'
     when 'i22-virtualization' then 'Virtualização e hipervisores'
     when 'i22-ports' then 'Publicação de portas e bind Docker'
     when 'i22-isolation' then 'Isolamento, namespaces e kernel'
     when 'i22-capacity' then 'Dimensionamento de recursos'
     when 'i22-updates' then 'Atualizações de workloads'
     when 'i22-resilience' then 'Resiliência, recuperação e PDB'
     when 'i22-ha' then 'Alta disponibilidade virtualizada'
     when 'i23-events' then 'Processamento orientado a eventos'
     when 'i23-load-balancing' then 'Balanceamento e disponibilidade'
     when 'i23-messaging' then 'Filas, brokers e mensageria'
     when 'i23-integrations' then 'APIs e integração de serviços'
     when 'i23-microservices' then 'Arquitetura de microsserviços'
     when 'i24-mlops' then 'Versionamento e operação de modelos'
     when 'i24-terraform' then 'Infraestrutura como código e Terraform'
     when 'i24-git' then 'Fluxos e operações Git'
     when 'i24-config' then 'Gerência de configuração'
     when 'i24-secrets' then 'Segregação de ambientes e credenciais'
     when 'i24-cicd' then 'Integração e entrega contínuas'
     when 'i25-sync' then 'Sincronização de arquivos'
     when 'i25-cost' then 'Custos e escolha da infraestrutura'
     when 'i25-migration' then 'Estratégias de migração para nuvem'
     else q.subject
   end;
   insert into public.cgu_concepts(id,topic,title)
    values(k,q.topic,label) on conflict (id) do nothing;
   insert into public.cgu_concept_questions(concept_id,question_id)
    values(k,q.id) on conflict do nothing;
 end loop;
end $seed$;

-- Immutable events and serialized scheduling, shared by batteries and spaced review.
create or replace function public.cgu_revision_apply_attempt(p_attempt uuid)
returns void language plpgsql set search_path='public'
as $apply$
declare
 a public.cgu_attempts%rowtype;
 v_concept text;
 s public.cgu_revision_state%rowtype;
 v_spaced boolean; v_qualified boolean; v_transfer boolean;
 v_stage text; v_days integer; v_success integer; v_lapses integer;
 v_distinct integer; v_was_correct boolean;
begin
 if exists(select 1 from public.cgu_revision_events where attempt_id=p_attempt) then return; end if;
 select * into a from public.cgu_attempts where id=p_attempt;
 if a.id is null or a.mode='simulation' then return; end if;
 select concept_id into v_concept from public.cgu_concept_questions where question_id=a.question_id limit 1;
 if v_concept is null then return; end if;
 insert into public.cgu_revision_state(concept_id,due_at)
  values(v_concept,a.created_at) on conflict(concept_id) do nothing;
 select * into s from public.cgu_revision_state where concept_id=v_concept for update;
 v_spaced := s.last_reviewed_at is not null
  and a.created_at >= s.last_reviewed_at + interval '20 hours'
  and (a.created_at at time zone 'America/Sao_Paulo')::date >
      (s.last_reviewed_at at time zone 'America/Sao_Paulo')::date;
 v_was_correct := a.response <> 'B' and a.is_correct is true;
 v_qualified := v_was_correct and a.confidence='Seguro' and not a.recognized and v_spaced;
 v_transfer := v_qualified and s.last_question_id is not null and a.question_id <> s.last_question_id;
 v_success := s.spaced_successes;
 v_lapses := s.lapses;
 v_stage := s.stage;
 v_days := s.interval_days;
 if not v_was_correct then
   v_success:=0; v_lapses:=v_lapses+1; v_stage:='learning'; v_days:=1;
 elsif a.confidence<>'Seguro' or a.recognized then
   v_success:=0; v_stage:='learning'; v_days:=1;
 elsif s.last_reviewed_at is null then
   v_stage:='consolidating'; v_days:=3;
 elsif v_spaced then
   v_success:=v_success+1;
   v_days:=case when v_success=1 then 7 when v_success=2 then 14 when v_success=3 then 30 when v_success=4 then 60 else 90 end;
   select count(distinct question_id) into v_distinct
     from public.cgu_revision_events
     where concept_id=v_concept and qualified;
   if v_success>=2 and (v_distinct>=2 or (v_distinct=1 and not exists(
       select 1 from public.cgu_revision_events
       where concept_id=v_concept and qualified and question_id=a.question_id))) then
     v_stage:='consolidated';
   else
     v_stage:='consolidating';
   end if;
 else
   -- An immediate retest is practice, not proof of spaced retention.
   v_days:=greatest(1,s.interval_days);
 end if;
 update public.cgu_revision_state set
   stage=v_stage,due_at=case when s.last_reviewed_at is not null
    and not v_spaced and v_was_correct and a.confidence='Seguro' and not a.recognized
    then greatest(s.due_at,a.created_at+make_interval(days=>v_days))
    else a.created_at+make_interval(days=>v_days) end,
   interval_days=v_days, spaced_successes=v_success,lapses=v_lapses,
   last_attempt_id=a.id,last_question_id=a.question_id,
   last_reviewed_at=a.created_at,updated_at=now()
 where concept_id=v_concept;
 insert into public.cgu_revision_events
   (attempt_id,concept_id,question_id,response,confidence,is_correct,recognized,
    spaced,qualified,transfer,previous_stage,stage,interval_days,next_due_at,created_at)
 select a.id,v_concept,a.question_id,a.response,a.confidence,v_was_correct,a.recognized,
        v_spaced,v_qualified,v_transfer,
        case when s.last_attempt_id is null then null else s.stage end,
        v_stage,v_days,due_at,a.created_at
 from public.cgu_revision_state where concept_id=v_concept
 on conflict(attempt_id) do nothing;
end $apply$;
revoke all on function public.cgu_revision_apply_attempt(uuid) from public,anon,authenticated;
grant execute on function public.cgu_revision_apply_attempt(uuid) to service_role;

create or replace function public.cgu_revision_attempt_trigger()
returns trigger language plpgsql set search_path='public'
as $trigger$
begin
 perform public.cgu_revision_apply_attempt(new.id);
 return new;
end $trigger$;
revoke all on function public.cgu_revision_attempt_trigger() from public,anon,authenticated;
grant execute on function public.cgu_revision_attempt_trigger() to service_role;
drop trigger if exists cgu_revision_on_attempt on public.cgu_attempts;
create trigger cgu_revision_on_attempt
 after insert on public.cgu_attempts
 for each row execute function public.cgu_revision_attempt_trigger();

-- Reconstruct only actual previously saved website attempts, in chronological order.
do $backfill$
declare r record;
begin
 for r in select id from public.cgu_attempts where mode<>'simulation' order by created_at,id loop
  perform public.cgu_revision_apply_attempt(r.id);
 end loop;
end $backfill$;
