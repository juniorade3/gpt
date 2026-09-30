-- Additive migration for the UUID schema currently used by Junior Cards.
alter table public.decks add column if not exists parent_id uuid references public.decks(id) on delete restrict;
alter table public.decks add constraint decks_parent_not_self check (parent_id is null or parent_id <> id);
create index decks_parent_id_idx on public.decks(parent_id);
create unique index decks_sibling_name_idx on public.decks(coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(name))) where active;

-- Serialize hierarchy writes and reject cycles, including concurrent changes.
create or replace function public.check_deck_hierarchy()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('junior-cards-deck-hierarchy', 0));
  if new.parent_id is not null and exists (
    with recursive ancestors(id, parent_id) as (
      select id, parent_id from public.decks where id = new.parent_id
      union
      select d.id, d.parent_id from public.decks d join ancestors a on d.id = a.parent_id
    ) select 1 from ancestors where id = new.id
  ) then
    raise exception 'A category cannot be placed inside its descendants' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_deck_hierarchy() from public, anon, authenticated;
create trigger decks_check_hierarchy before insert or update of parent_id on public.decks for each row execute function public.check_deck_hierarchy();

-- Nest the existing error notebook, keeping its UUID and all review history.
update public.decks child
set parent_id = parent.id, name = 'Caderno de Erros'
from public.decks parent
where parent.slug = 'banco-de-dados'
  and child.name like '%Banco de Dados — Caderno de Erros%'
  and child.parent_id is null;

-- A ready-to-use category requested by the user; no cards are reassigned.
insert into public.decks(slug, name, parent_id, sort_order)
select 'banco-de-dados-relacional', 'Relacional', id, 22
from public.decks where slug = 'banco-de-dados'
on conflict (slug) do nothing;
