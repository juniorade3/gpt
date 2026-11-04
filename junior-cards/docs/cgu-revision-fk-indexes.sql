-- Index foreign keys added by the RIQ module; no data is rewritten.
create index if not exists cgu_revision_events_question_idx on public.cgu_revision_events(question_id);
create index if not exists cgu_revision_state_last_attempt_idx on public.cgu_revision_state(last_attempt_id);
create index if not exists cgu_revision_state_last_question_idx on public.cgu_revision_state(last_question_id);
