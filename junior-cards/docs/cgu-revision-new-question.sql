-- Newly imported questions join the RIQ automatically, conservatively as separate concepts.
-- Later editorial review may group these concepts without modifying exam statements.
create or replace function public.cgu_revision_register_question()
returns trigger language plpgsql set search_path='public'
as $register$
declare k text;
begin
 if exists(select 1 from public.cgu_concept_questions where question_id=new.id) then return new;end if;
 k:='individual:'||new.id;
 insert into public.cgu_concepts(id,topic,title)
 values(k,new.topic,new.subject) on conflict(id) do nothing;
 insert into public.cgu_concept_questions(concept_id,question_id)
 values(k,new.id) on conflict do nothing;
 return new;
end $register$;
revoke all on function public.cgu_revision_register_question() from public,anon,authenticated;
grant execute on function public.cgu_revision_register_question() to service_role;
drop trigger if exists cgu_revision_new_question on public.cgu_questions;
create trigger cgu_revision_new_question
after insert on public.cgu_questions for each row
execute function public.cgu_revision_register_question();
