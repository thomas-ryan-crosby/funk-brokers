-- Properties schema (Postgres full migration Phase 1).
-- Run after 001_social_schema.sql. No FK to users yet (users.id is text from Firebase Auth).

create table if not exists properties (
  id text primary key,
  seller_id text not null,
  address text,
  city text,
  state text,
  zip_code text,
  latitude double precision,
  longitude double precision,
  attom_id text,
  property_type text,
  bedrooms integer,
  bathrooms numeric(4,2),
  square_feet integer,
  price numeric(14,2),
  funk_estimate numeric(14,2),
  photos jsonb default '[]',
  features jsonb default '[]',
  status text not null default 'active',
  available_for_sale boolean not null default false,
  accepting_offers boolean not null default false,
  accepting_communications boolean not null default true,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_properties_seller
  on properties (seller_id);
create index if not exists idx_properties_created
  on properties (created_at desc);
create index if not exists idx_properties_status_archived
  on properties (status, archived) where archived = false;
create index if not exists idx_properties_coords
  on properties (latitude, longitude) where latitude is not null and longitude is not null;
