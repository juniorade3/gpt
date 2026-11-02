alter table public.cgu_questions add column if not exists provenance jsonb not null default '{}'::jsonb;
comment on column public.cgu_questions.provenance is 'Verified original exam, answer key and Drive bank references; contains no answer key values.';
