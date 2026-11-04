-- Early practice must not count as a scheduled spaced retrieval.
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
  and a.created_at >= s.due_at
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
