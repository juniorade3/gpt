create or replace function public.cgu_import_2026_batch(p_items jsonb)
returns jsonb language plpgsql set search_path='public' as $fn$
declare
 x record; n_ready integer:=0; n_held integer:=0; n_existing integer:=0;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>200 then
  raise exception 'invalid import batch size';
 end if;
 for x in
  select * from jsonb_to_recordset(p_items) as r(
   id text, topic text,subtopic text,subject text,organization text,
   book text,item integer,statement text,context text,source text,
   page integer,key_source text,answer text,provenance jsonb,
   concept_id text,concept_title text,block_id text,position integer,
   adherence text,key_status text,format text,import_status text,reason text
  )
 loop
  if x.id !~ '^APL2026::' or x.adherence not in ('Direto','Parcial') then
    raise exception 'invalid source identifier/adherence: %',x.id;
  end if;
  insert into public.cgu_import_audit(
   source_id,application_year,adherence,answer_status,format,import_status,reason,checked_at
  ) values(x.id,2026,x.adherence,x.key_status,x.format,x.import_status,coalesce(x.reason,''),now())
  on conflict(source_id) do update set
   adherence=excluded.adherence,answer_status=excluded.answer_status,
   format=excluded.format,import_status=excluded.import_status,reason=excluded.reason,checked_at=excluded.checked_at;
  if x.import_status<>'ready' then
   n_held:=n_held+1;
   continue;
  end if;
  if x.topic !~ '^[BCI][0-9]+\.[0-9]+$'
   or x.subtopic !~ '^[BCI][0-9]+\.[0-9]+\.[0-9]+$'
   or x.answer not in ('C','E') or x.format <> 'Certo/Errado'
   or x.key_status <> 'Definitivo pareado'
   or x.statement is null or length(btrim(x.statement))<8
   or x.block_id not in ('cgu-2026-direct','cgu-2026-partial')
   or x.concept_id is null then
    raise exception 'invalid ready item: %',x.id;
  end if;
  insert into public.cgu_questions (
   id,topic,subtopic,subject,year,organization,book,item,
   statement,context,source,page,key_source,kind,difficulty,lab,version,answer,explanation,provenance
  ) values (
   x.id,x.topic,x.subtopic,coalesce(nullif(btrim(x.subject),''),x.concept_title),
   2026,x.organization,x.book,x.item,
   x.statement,coalesce(x.context,''),x.source,x.page,x.key_source,
   'official','Não calibrada',null,1,x.answer,
   jsonb_build_object('caveat','Item importado do banco canônico CGU — aplicação 2026, com gabarito definitivo pareado. A explicação detalhada ainda não foi produzida e revisada. Consulte o PDF original, os comandos de contexto e o gabarito para estudo aprofundado.'),
   coalesce(x.provenance,'{}'::jsonb)
  ) on conflict(id) do nothing;
  if not found then n_existing:=n_existing+1; end if;
  insert into public.cgu_block_questions(block_id,question_id,position)
  values(x.block_id,x.id,x.position) on conflict do nothing;
  insert into public.cgu_concepts(id,topic,title)
  values(x.concept_id,x.topic,coalesce(nullif(btrim(x.concept_title),''),x.subject))
  on conflict(id) do nothing;
  update public.cgu_concept_questions m set concept_id=x.concept_id
   where m.question_id=x.id and m.concept_id='individual:'||x.id
    and not exists(select 1 from public.cgu_revision_state s where s.concept_id=m.concept_id)
    and not exists(select 1 from public.cgu_revision_events e where e.concept_id=m.concept_id);
  delete from public.cgu_concepts c where c.id='individual:'||x.id
    and not exists(select 1 from public.cgu_concept_questions z where z.concept_id=c.id)
    and not exists(select 1 from public.cgu_revision_state s where s.concept_id=c.id)
    and not exists(select 1 from public.cgu_revision_events e where e.concept_id=c.id);
  n_ready:=n_ready+1;
 end loop;
 update public.cgu_blocks b set expected_count=(select count(*) from public.cgu_block_questions r where r.block_id=b.id)
  where b.id in ('cgu-2026-direct','cgu-2026-partial');
 return jsonb_build_object('ready_in_batch',n_ready,'held_in_batch',n_held,'already_existing',n_existing);
end $fn$;
revoke all on function public.cgu_import_2026_batch(jsonb) from public,anon,authenticated;
grant execute on function public.cgu_import_2026_batch(jsonb) to service_role;