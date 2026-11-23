-- Checkpoint database. Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: it only creates what is missing and replaces the functions.

create table if not exists public.posts (
  user_id      uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id           text        not null,               -- X post id
  url          text        not null,
  author       jsonb       not null,
  text         text        not null default '',
  posted_at    timestamptz,
  media        jsonb       not null default '[]',
  link         jsonb,
  quote        jsonb,
  sort_key     text        not null,               -- position in the X bookmark list
  saved_at     timestamptz not null default now(),
  folder_ids   uuid[]      not null default '{}',  -- empty means the post is in the Inbox
  note         text        not null default '',
  unbookmarked boolean     not null default false,
  updated_at   timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists posts_by_sort on public.posts (user_id, sort_key desc);

create table if not exists public.folders (
  id         uuid             primary key default gen_random_uuid(),
  user_id    uuid             not null default auth.uid() references auth.users (id) on delete cascade,
  name       text             not null,
  position   double precision not null default 0,
  created_at timestamptz      not null default now()
);

-- Tags describe a post (many per post) and are separate from folders. Added in Round 2.
alter table public.posts add column if not exists tag_ids uuid[] not null default '{}';

create table if not exists public.tags (
  id         uuid             primary key default gen_random_uuid(),
  user_id    uuid             not null default auth.uid() references auth.users (id) on delete cascade,
  name       text             not null,
  color      text             not null default 'purple',
  position   double precision not null default 0,
  created_at timestamptz      not null default now()
);

-- One row per user: the latest sync status, shown on every device.
create table if not exists public.profiles (
  user_id    uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  sync       jsonb       not null default '{}',
  updated_at timestamptz not null default now()
);

-- Newer Supabase projects don't grant table access automatically. Logged-in users get it here;
-- the policies below still limit them to their own rows. Logged-out visitors get nothing.
grant select, insert, update, delete on public.posts, public.folders, public.profiles, public.tags to authenticated;
revoke all on public.posts, public.folders, public.profiles, public.tags from anon;

alter table public.posts    enable row level security;
alter table public.folders  enable row level security;
alter table public.profiles enable row level security;
alter table public.tags     enable row level security;

drop policy if exists "own posts" on public.posts;
create policy "own posts" on public.posts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own folders" on public.folders;
create policy "own folders" on public.folders for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own tags" on public.tags;
create policy "own tags" on public.tags for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Saves bookmarks from the extension. Refreshes post content but never touches folders or notes.
-- Returns how many posts were new.
create or replace function public.upsert_bookmarks(items jsonb)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with incoming as (
    select distinct on (i->>'id') i, ord
    from jsonb_array_elements(items) with ordinality as t(i, ord)
    order by i->>'id', ord
  ),
  upserted as (
    insert into public.posts as p (id, url, author, text, posted_at, media, link, quote, sort_key, saved_at)
    select
      i->>'id', i->>'url', i->'author', coalesce(i->>'text', ''),
      to_timestamp(nullif(i->>'createdAt', '')::double precision / 1000),
      coalesce(i->'media', '[]'), i->'link', i->'quote', i->>'sortKey',
      now() - make_interval(secs => ord / 1000.0)
    from incoming
    on conflict (user_id, id) do update set
      url = excluded.url,
      author = excluded.author,
      text = excluded.text,
      posted_at = excluded.posted_at,
      media = excluded.media,
      link = excluded.link,
      quote = excluded.quote,
      -- Live captures ("L…") have no X position yet; keep a real one if we already have it.
      sort_key = case when excluded.sort_key like 'L%' then p.sort_key else excluded.sort_key end,
      unbookmarked = false,
      updated_at = now()
    returning (xmax = 0) as inserted
  )
  select count(*)::integer from upserted where inserted;
$$;

-- Removed from X bookmarks: drop it if it was never sorted or annotated, otherwise keep it.
create or replace function public.remove_bookmark(post_id text)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.posts where id = post_id and folder_ids = '{}' and note = '';
  update public.posts set unbookmarked = true, updated_at = now() where id = post_id;
$$;

-- Deletes a folder and takes it off every post in one step.
create or replace function public.delete_folder(folder uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.posts set folder_ids = array_remove(folder_ids, folder), updated_at = now() where folder = any (folder_ids);
  delete from public.folders where id = folder;
$$;

-- Deletes a tag and takes it off every post in one step.
create or replace function public.delete_tag(tag uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.posts set tag_ids = array_remove(tag_ids, tag), updated_at = now() where tag = any (tag_ids);
  delete from public.tags where id = tag;
$$;

grant execute on function public.upsert_bookmarks(jsonb), public.remove_bookmark(text), public.delete_folder(uuid), public.delete_tag(uuid) to authenticated;
revoke execute on function public.upsert_bookmarks(jsonb), public.remove_bookmark(text), public.delete_folder(uuid), public.delete_tag(uuid) from anon, public;

-- Live updates on every open device.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'posts') then
    alter publication supabase_realtime add table public.posts;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'folders') then
    alter publication supabase_realtime add table public.folders;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'tags') then
    alter publication supabase_realtime add table public.tags;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
