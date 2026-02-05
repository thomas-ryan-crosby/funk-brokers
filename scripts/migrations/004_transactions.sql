-- Transactions (post-acceptance deal steps). Run after 003_users_favorites_offers_messages.sql.

create table if not exists transactions (
  id text primary key,
  offer_id text not null,
  property_id text not null,
  offer_type text,
  buyer_id text not null,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  seller_id text,
  parties jsonb not null default '[]',
  offer_amount numeric(14,2),
  earnest_money numeric(14,2),
  proposed_closing_date timestamptz,
  financing_type text,
  contingencies jsonb default '{}',
  accepted_at timestamptz not null,
  status text not null default 'active',
  steps jsonb not null default '[]',
  disclosure_acknowledged_at timestamptz,
  disclosure_acknowledged_by_name text,
  assigned_vendors jsonb default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_transactions_offer on transactions (offer_id);
create index if not exists idx_transactions_parties on transactions using gin (parties);
create index if not exists idx_transactions_accepted on transactions (accepted_at desc);
