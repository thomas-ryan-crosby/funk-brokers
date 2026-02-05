-- Listing progress (draft state for list-property flow). Run after 004_transactions.sql.

create table if not exists listing_progress (
  property_id text primary key,
  step text,
  form_data jsonb default '{}',
  completed_steps jsonb default '[]',
  updated_at timestamptz not null default now()
);
