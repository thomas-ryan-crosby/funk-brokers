-- PSA drafts, pings, vendors, feedback, pre_listing_checklists. Run after 006_profiles_saved_searches.sql.

-- PSA drafts
create table if not exists psa_drafts (
  id text primary key,
  property_id text not null,
  buyer_id text not null,
  agreement jsonb,
  source_loi_offer_id text,
  source_loi jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_psa_drafts_buyer on psa_drafts (buyer_id);

-- Pings
create table if not exists pings (
  id text primary key,
  property_id text not null,
  property_address text,
  seller_id text not null,
  sender_id text not null,
  sender_name text,
  reason_type text not null,
  note text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
create index if not exists idx_pings_seller on pings (seller_id);
create index if not exists idx_pings_sender on pings (sender_id);

-- Vendors
create table if not exists vendors (
  id text primary key,
  user_id text not null,
  vendor_name text,
  type text not null default 'other',
  custom_type text,
  website text,
  phone text,
  email text,
  address text,
  notes text,
  contacts jsonb default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vendors_user on vendors (user_id);

-- Feedback
create table if not exists feedback (
  id text primary key,
  user_id text,
  author_name text,
  body text not null,
  type text not null default 'feedback',
  section text,
  created_at timestamptz not null default now()
);
create index if not exists idx_feedback_created on feedback (created_at desc);

-- Pre-listing checklists (one per property)
create table if not exists pre_listing_checklists (
  property_id text primary key,
  step1_legal_authority jsonb,
  step2_title_ownership jsonb,
  step3_listing_strategy jsonb,
  step4_disclosures jsonb,
  step5_property_prep jsonb,
  step6_marketing_assets jsonb,
  step7_showings_offers jsonb,
  updated_at timestamptz not null default now()
);
