-- Baon Ledger: Supabase schema
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Transactions table (every peso in and out)
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  category text not null,
  note text,
  amount numeric(10,2) not null check (amount > 0),
  kind text not null check (kind in ('expense', 'topup')),
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on transactions (user_id, entry_date desc);

-- 2. Budget settings (one row per user: how much baon per period)
create table if not exists budget_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  period_amount numeric(10,2) not null default 0,
  period_type text not null default 'weekly' check (period_type in ('weekly', 'monthly')),
  period_start date not null default current_date
);

-- 3. Row Level Security: each user sees only their own data
alter table transactions enable row level security;
alter table budget_settings enable row level security;

create policy "Users manage their own transactions"
  on transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own budget settings"
  on budget_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
