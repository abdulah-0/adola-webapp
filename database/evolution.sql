-- Evolution provider integration: minimal tables and wallet helper
-- Run this in Supabase SQL editor (execute as superuser/admin)

-- 1) Provider game sessions
create table if not exists public.provider_game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null default 'evolution',
  game_id text not null,
  external_session_id text unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_provider_sessions_user on public.provider_game_sessions(user_id);
create index if not exists idx_provider_sessions_provider_game on public.provider_game_sessions(provider, game_id);

-- 2) Provider game transactions (idempotent via external_tx_id)
create table if not exists public.provider_game_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid references public.provider_game_sessions(id) on delete set null,
  provider text not null default 'evolution',
  game_id text not null,
  external_tx_id text unique,
  tx_type text not null check (tx_type in ('bet','win','rollback','adjust','balance_check')),
  amount numeric not null default 0, -- positive for win/credit, negative for bet/debit
  currency text not null default 'PKR',
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_provider_txs_user on public.provider_game_transactions(user_id);
create index if not exists idx_provider_txs_session on public.provider_game_transactions(session_id);
create index if not exists idx_provider_txs_provider_game on public.provider_game_transactions(provider, game_id);

-- 3) Atomic wallet increment helper
-- Adds p_delta (can be negative) to wallets.balance for a user, ensuring a wallet row exists
create or replace function public.wallet_add_amount(p_user_id uuid, p_delta numeric)
returns boolean
language plpgsql
security definer
as $$
begin
  -- Ensure wallet row exists
  insert into public.wallets (user_id, balance, total_deposited, total_withdrawn, created_at, updated_at)
  values (p_user_id, 0, 0, 0, now(), now())
  on conflict (user_id) do nothing;

  -- Update balance atomically
  update public.wallets
  set balance = balance + p_delta,
      updated_at = now()
  where user_id = p_user_id;

  return true;
exception when others then
  return false;
end; $$;

-- 4) Helpful view for admin reconciliation (optional)
create or replace view public.v_provider_txs as
select t.*, u.email, u.username
from public.provider_game_transactions t
left join public.users u on u.id = t.user_id;



-- 5) Enable RLS and policies so authenticated users can manage their own provider sessions/txs
alter table if exists public.provider_game_sessions enable row level security;
create policy if not exists provider_sessions_insert_own
on public.provider_game_sessions
for insert to authenticated
with check (user_id = (select id from public.users where auth_user_id = auth.uid()));

create policy if not exists provider_sessions_select_own
on public.provider_game_sessions
for select to authenticated
using (user_id = (select id from public.users where auth_user_id = auth.uid()));

alter table if exists public.provider_game_transactions enable row level security;
create policy if not exists provider_txs_insert_own
on public.provider_game_transactions
for insert to authenticated
with check (user_id = (select id from public.users where auth_user_id = auth.uid()));

create policy if not exists provider_txs_select_own
on public.provider_game_transactions
for select to authenticated
using (user_id = (select id from public.users where auth_user_id = auth.uid()));
