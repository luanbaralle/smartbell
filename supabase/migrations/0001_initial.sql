create schema if not exists public;
create extension if not exists "pgcrypto";

create type public.user_role as enum ('morador', 'admin');
create type public.call_type as enum ('text', 'audio', 'video');
create type public.call_status as enum ('pending', 'answered', 'missed');

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  fcm_token text,
  role public.user_role not null default 'morador',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.houses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  qr_code text unique not null,
  owner_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  type public.call_type not null,
  status public.call_status not null default 'pending',
  session_id text,
  visitor_name text,
  ended_at timestamptz
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls (id) on delete cascade,
  sender uuid references public.users (id) on delete cascade,
  content text,
  audio_url text,
  video_url text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint messages_content_check check (
    content is not null or audio_url is not null or video_url is not null
  )
);

create index if not exists idx_calls_house_id_created_at on public.calls (house_id, created_at desc);
create index if not exists idx_messages_call_id_created_at on public.messages (call_id, created_at asc);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger handle_users_updated_at
  before update on public.users
  for each row
  execute procedure public.handle_updated_at();

create trigger handle_houses_updated_at
  before update on public.houses
  for each row
  execute procedure public.handle_updated_at();

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update on public.users to authenticated, service_role;
grant select on public.users to anon;
grant select, insert on public.houses to authenticated, service_role;
grant select on public.houses to anon;
grant select, insert, update on public.calls to authenticated, service_role;
grant select, insert on public.calls to anon;
grant select, insert on public.messages to authenticated, service_role;
grant select on public.messages to anon;

insert into storage.buckets (id, name, public)
values ('audio-messages', 'audio-messages', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('video-messages', 'video-messages', true)
on conflict (id) do nothing;

