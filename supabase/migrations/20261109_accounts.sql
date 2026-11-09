-- Once a Liar: accounts, Party Pass entitlements and game history.
-- Auth users live in Supabase Auth (auth.users). All writes come from the game
-- server with the service-role key; clients may only read their own rows.

create table if not exists public.oal_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'party_pass',
  stripe_session_id text not null unique,
  stripe_payment_intent text,
  created_at timestamptz not null default now()
);
create index if not exists oal_entitlements_user_idx on public.oal_entitlements(user_id);
create index if not exists oal_entitlements_pi_idx on public.oal_entitlements(stripe_payment_intent);

create table if not exists public.oal_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_code text not null,
  played_at timestamptz not null default now(),
  players int not null,
  rounds int not null,
  score int not null,
  rank int not null,
  won boolean not null default false,
  unique (user_id, room_code, played_at)
);
create index if not exists oal_history_user_idx on public.oal_history(user_id, played_at desc);

alter table public.oal_entitlements enable row level security;
alter table public.oal_history enable row level security;

drop policy if exists "read own entitlements" on public.oal_entitlements;
create policy "read own entitlements" on public.oal_entitlements for select using (auth.uid() = user_id);
drop policy if exists "read own history" on public.oal_history;
create policy "read own history" on public.oal_history for select using (auth.uid() = user_id);
