-- Users (extend), Favorites, Offers, Messages (Postgres full migration Phases 2–5).
-- Run after 002_properties_schema.sql.

-- Extend users for profile (phone, role)
alter table users add column if not exists phone text;
alter table users add column if not exists role text;

-- Favorites
create table if not exists favorites (
  id text primary key,
  user_id text not null,
  property_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);
create index if not exists idx_favorites_user on favorites (user_id);
create index if not exists idx_favorites_property on favorites (property_id);

-- Offers
create table if not exists offers (
  id text primary key,
  property_id text not null,
  buyer_id text not null,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  offer_amount numeric(14,2),
  status text not null default 'pending',
  offer_type text,
  message text,
  counter_to_offer_id text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- PSA fields (nullable for LOI)
  earnest_money numeric(14,2),
  proposed_closing_date timestamptz,
  financing_type text,
  down_payment numeric(14,2),
  seller_concessions jsonb,
  contingencies jsonb,
  inclusions text,
  possession text,
  earnest_money_form text,
  earnest_money_deposited_with text,
  earnest_money_due text,
  offer_expiration_date text,
  offer_expiration_time text,
  verification_documents jsonb,
  loi jsonb,
  countered_by_offer_id text
);
create index if not exists idx_offers_property on offers (property_id);
create index if not exists idx_offers_buyer on offers (buyer_id);
create index if not exists idx_offers_created on offers (created_at desc);

-- Messages
create table if not exists messages (
  id text primary key,
  sender_id text not null,
  sender_name text,
  recipient_id text not null,
  recipient_name text,
  property_id text,
  property_address text,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_recipient on messages (recipient_id, created_at desc);
create index if not exists idx_messages_sender on messages (sender_id, created_at desc);
