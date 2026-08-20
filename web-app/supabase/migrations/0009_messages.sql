-- ===========================================================================
--  Contact form messages
--
--  On the static site the contact form went nowhere: it validated, showed a
--  success dialog, and discarded what was typed. This gives it somewhere to land.
--
--  Anyone may write; only the committee may read. That asymmetry is the whole
--  point of the table, and it is why `anon` gets an INSERT grant on named
--  columns and no SELECT at all — a visitor must not be able to read other
--  people's messages back out.
-- ===========================================================================

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  phone      text,
  topic      text,
  body       text not null,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_new_idx on public.messages (handled, created_at desc);

alter table public.messages enable row level security;

revoke all on public.messages from anon, authenticated;

-- Named columns only: `handled` is the committee's own bookkeeping, and a
-- visitor who could set it could file their message as already dealt with.
grant insert (name, email, phone, topic, body) on public.messages to anon, authenticated;
grant select, update, delete on public.messages to authenticated;

drop policy if exists messages_anyone_writes on public.messages;
create policy messages_anyone_writes on public.messages
  for insert to anon, authenticated
  with check (
    -- Cheap guards against an empty or obviously junk submission. Not spam
    -- protection; that needs a real service if it ever becomes a problem.
    btrim(name) <> '' and btrim(body) <> '' and length(body) <= 5000
  );

drop policy if exists messages_committee_reads on public.messages;
create policy messages_committee_reads on public.messages
  for select to authenticated using (public.is_admin());

drop policy if exists messages_committee_manages on public.messages;
create policy messages_committee_manages on public.messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists messages_committee_deletes on public.messages;
create policy messages_committee_deletes on public.messages
  for delete to authenticated using (public.is_admin());
