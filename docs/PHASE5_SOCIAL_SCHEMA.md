# Phase 5 — Social Schema (Postgres)

This is the **initial Postgres schema** for the first migrated domain (social).
The intent is to **dual-write** (Firestore + Postgres) and then switch reads.
IDs are stored as **text** so we can reuse Firestore doc IDs during migration.

## Tables

```sql
-- Users (minimal fields for feed attribution)
create table if not exists users (
  id text primary key,
  email text,
  name text,
  public_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Posts
create table if not exists posts (
  id text primary key,
  author_id text not null,
  author_name text,
  type text,
  body text,
  property_id text,
  property_address text,
  image_url text,
  poll_options jsonb,
  hashtags text[],
  user_tags text[],
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

-- Comments
create table if not exists comments (
  id text primary key,
  post_id text not null references posts(id) on delete cascade,
  author_id text not null,
  author_name text,
  body text,
  created_at timestamptz not null
);

-- Likes
create table if not exists post_likes (
  post_id text not null references posts(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Following graph
create table if not exists user_following (
  follower_id text not null,
  following_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);
```

## Indexes

```sql
create index if not exists idx_posts_author_created
  on posts (author_id, created_at desc);

create index if not exists idx_posts_created
  on posts (created_at desc);

create index if not exists idx_comments_post_created
  on comments (post_id, created_at asc);

create index if not exists idx_user_following_follower
  on user_following (follower_id);
```

## Notes

- `posts.id` is **text** to mirror Firestore doc IDs during dual-write.
- `poll_options` is `jsonb` for flexible arrays.
- `hashtags` and `user_tags` are stored as `text[]` for quick search/filtering later.
- `created_at` / `updated_at` are stored as `timestamptz` for ordering and pagination.
