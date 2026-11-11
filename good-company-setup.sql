-- ==================================================================
-- GOOD COMPANY — shared database setup (paste all of this into
-- Supabase → SQL Editor → New query → Run). Safe to run more than once.
-- ==================================================================

-- People: one profile per account. Everyone signed in can find everyone
-- (that's how you search for Melinda), only you can change yours.
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  email text not null default '',
  archetype text default '',
  favorites text default '',
  allergies text default '',
  photo text default '',
  color text default 'tan',
  updated_at timestamptz not null default now()
);

-- Gatherings: the whole plan lives in one document per gathering.
-- Private by default: only the person who made it and their company can see it.
-- is_public = true lets anyone with the link look (but only the company can edit).
create table if not exists public.gatherings (
  id text primary key,
  owner uuid not null references auth.users on delete cascade,
  invite_code text not null default encode(gen_random_bytes(6), 'hex'),
  is_public boolean not null default false,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

alter table public.gatherings add column if not exists is_public boolean not null default false;

-- The company: who's part of each gathering (and can edit it).
create table if not exists public.gathering_members (
  gathering_id text not null references public.gatherings on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  added_at timestamptz not null default now(),
  primary key (gathering_id, user_id)
);

-- Each person's own Recipe Box, Activity Ideas and Mood Board.
create table if not exists public.libraries (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- helper: is the signed-in person part of this gathering?
create or replace function public.is_member(gid text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from gathering_members where gathering_id = gid and user_id = auth.uid())
      or exists (select 1 from gatherings where id = gid and owner = auth.uid());
$$;

-- invite links: knowing the code lets you join (codes are only handed out by the company;
-- the site never shows it to public viewers)
create or replace function public.join_gathering(gid text, code text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from gatherings where id = gid and invite_code = code) then return false; end if;
  insert into gathering_members (gathering_id, user_id) values (gid, auth.uid()) on conflict do nothing;
  return true;
end $$;

alter table public.profiles enable row level security;
alter table public.gatherings enable row level security;
alter table public.gathering_members enable row level security;
alter table public.libraries enable row level security;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

drop policy if exists "members read gathering" on public.gatherings;
create policy "members read gathering" on public.gatherings for select to authenticated using (public.is_member(id) or is_public);
drop policy if exists "anyone reads public gathering" on public.gatherings;
create policy "anyone reads public gathering" on public.gatherings for select to anon using (is_public);
drop policy if exists "start a gathering" on public.gatherings;
create policy "start a gathering" on public.gatherings for insert to authenticated with check (owner = auth.uid());
drop policy if exists "members edit gathering" on public.gatherings;
create policy "members edit gathering" on public.gatherings for update to authenticated using (public.is_member(id));
-- only the person who made a gathering can make it public or private
create or replace function public.guard_visibility() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_public is distinct from old.is_public and old.owner <> auth.uid() then
    raise exception 'Only the person who made this gathering can change who can see it.';
  end if;
  if new.owner is distinct from old.owner or new.invite_code is distinct from old.invite_code then
    if old.owner <> auth.uid() then raise exception 'Only the person who made this gathering can change that.'; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_visibility on public.gatherings;
create trigger guard_visibility before update on public.gatherings for each row execute function public.guard_visibility();
drop policy if exists "owner deletes gathering" on public.gatherings;
create policy "owner deletes gathering" on public.gatherings for delete to authenticated using (owner = auth.uid());

drop policy if exists "members see company" on public.gathering_members;
create policy "members see company" on public.gathering_members for select to authenticated using (public.is_member(gathering_id));
drop policy if exists "members add company" on public.gathering_members;
create policy "members add company" on public.gathering_members for insert to authenticated with check (public.is_member(gathering_id));
drop policy if exists "members remove company" on public.gathering_members;
create policy "members remove company" on public.gathering_members for delete to authenticated using (public.is_member(gathering_id));

drop policy if exists "own library" on public.libraries;
create policy "own library" on public.libraries for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Photos: stored online, viewable by link, uploaded by signed-in people.
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
drop policy if exists "photos upload" on storage.objects;
create policy "photos upload" on storage.objects for insert to authenticated with check (bucket_id = 'photos');
drop policy if exists "photos read" on storage.objects;
create policy "photos read" on storage.objects for select using (bucket_id = 'photos');

-- live updates: when someone in the company edits, everyone's page refreshes
do $$ begin
  alter publication supabase_realtime add table public.gatherings;
exception when others then null; end $$;

-- Invite codes stay secret from public viewers: the code column can't be read
-- directly; people in the company ask for it through this function.
revoke select on public.gatherings from anon, authenticated;
grant select (id, owner, is_public, data, updated_at, updated_by) on public.gatherings to anon, authenticated;
grant insert, update, delete on public.gatherings to authenticated;
create or replace function public.invite_code_for(gid text) returns text
language sql security definer set search_path = public stable as $$
  select invite_code from gatherings where id = gid and public.is_member(gid);
$$;
