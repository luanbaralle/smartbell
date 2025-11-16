-- Create push_subscriptions table for Web Push (VAPID)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions (user_id);
create index if not exists idx_push_subscriptions_endpoint on public.push_subscriptions (endpoint);

create trigger handle_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row
  execute procedure public.handle_updated_at();

grant select, insert, update, delete on public.push_subscriptions to authenticated, service_role;
grant select on public.push_subscriptions to anon;

-- Add started_at column to calls table if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'calls' 
    and column_name = 'started_at'
  ) then
    alter table public.calls add column started_at timestamptz;
  end if;
end $$;

