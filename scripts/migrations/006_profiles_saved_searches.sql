-- Sale/purchase profiles on users, saved_searches table. Run after 005_listing_progress.sql.

alter table users add column if not exists sale_profile jsonb default '{}';
alter table users add column if not exists purchase_profile jsonb default '{}';

create table if not exists saved_searches (
  id text primary key,
  user_id text not null,
  name text,
  filters jsonb default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_saved_searches_user on saved_searches (user_id, created_at desc);
