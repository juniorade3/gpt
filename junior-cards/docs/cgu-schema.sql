-- Additive module. Existing decks/cards/review state and app_config are untouched.
create table if not exists public.cgu_blocks(
 id text primary key,title text not null,description text not null default '',status text not null default 'draft' check(status in('draft','ready','pending_original')),expected_count integer not null default 100,created_at timestamptz not null default now()
);
create table if not exists public.cgu_questions(
 id text primary key,topic text not null,subtopic text,subject text not null,year integer,organization text,book text,item integer,statement text not null,context text not null default '',source text,page integer,key_source text,kind text not null default 'official' check(kind in('official','authorial')),difficulty text not null default 'Não calibrada',lab text,version integer not null default 1,answer text not null check(answer in('C','E')),explanation jsonb not null,created_at timestamptz not null default now()
);
create table if not exists public.cgu_block_questions(
 block_id text references public.cgu_blocks(id),question_id text references public.cgu_questions(id),position integer not null,primary key(block_id,question_id),unique(block_id,position)
);
create table if not exists public.cgu_attempts(
 id uuid primary key,block_id text not null references public.cgu_blocks(id),question_id text not null references public.cgu_questions(id),response text not null check(response in('C','E','B')),confidence text not null check(confidence in('Seguro','Inseguro','Por lógica/chute','Não conheço')),reason text not null default '',notes text not null default '',recognized boolean not null default false,mode text not null check(mode in('study','review','simulation')),is_correct boolean not null,answer_snapshot text not null,explanation_version integer not null,explanation_snapshot jsonb not null,created_at timestamptz not null default now()
);
create table if not exists public.cgu_notes(id uuid primary key,question_id text not null references public.cgu_questions(id),attempt_id uuid references public.cgu_attempts(id),text text not null check(length(text) between 1 and 8000),created_at timestamptz not null default now());
create index if not exists cgu_attempts_block_date on public.cgu_attempts(block_id,created_at desc);
create index if not exists cgu_attempts_question on public.cgu_attempts(question_id,created_at desc);
alter table public.cgu_blocks enable row level security;
alter table public.cgu_questions enable row level security;
alter table public.cgu_block_questions enable row level security;
alter table public.cgu_attempts enable row level security;
alter table public.cgu_notes enable row level security;
revoke all on public.cgu_blocks,public.cgu_questions,public.cgu_block_questions,public.cgu_attempts,public.cgu_notes from anon,authenticated;
grant all on public.cgu_blocks,public.cgu_questions,public.cgu_block_questions,public.cgu_attempts,public.cgu_notes to service_role;
create or replace function public.cgu_record_attempt(p_id uuid,p_block text,p_question text,p_response text,p_confidence text,p_reason text,p_notes text,p_recognized boolean,p_mode text) returns jsonb language plpgsql security invoker set search_path=public as $$
declare q public.cgu_questions; a public.cgu_attempts;
begin
 if p_response not in('C','E','B') or p_confidence not in('Seguro','Inseguro','Por lógica/chute','Não conheço') or p_mode not in('study','review','simulation') or length(p_reason)>8000 or length(p_notes)>8000 then raise exception 'invalid_input';end if;
 select x.* into q from cgu_questions x join cgu_block_questions b on b.question_id=x.id where b.block_id=p_block and x.id=p_question;
 if q.id is null then raise exception 'question_not_in_block';end if;
 insert into cgu_attempts(id,block_id,question_id,response,confidence,reason,notes,recognized,mode,is_correct,answer_snapshot,explanation_version,explanation_snapshot) values(p_id,p_block,p_question,p_response,p_confidence,p_reason,p_notes,p_recognized,p_mode,p_response=q.answer,q.answer,q.version,q.explanation) on conflict(id) do nothing;
 select * into a from cgu_attempts where id=p_id;
 if a.block_id<>p_block or a.question_id<>p_question or a.response<>p_response or a.confidence<>p_confidence or a.reason<>p_reason or a.notes<>p_notes or a.recognized<>p_recognized or a.mode<>p_mode then raise exception 'idempotency_conflict';end if;
 return jsonb_build_object('attempt',to_jsonb(a),'answer',a.answer_snapshot,'explanation',a.explanation_snapshot);
end;$$;
revoke all on function public.cgu_record_attempt(uuid,text,text,text,text,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.cgu_record_attempt(uuid,text,text,text,text,text,text,boolean,text) to service_role;
