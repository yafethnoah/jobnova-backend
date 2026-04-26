create extension if not exists pgcrypto;

create table if not exists jobnova_records (
  id uuid primary key default gen_random_uuid(),
  collection text not null,
  user_id text not null,
  record_id text not null default 'latest',
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  unique(collection, user_id, record_id)
);

create table if not exists jobnova_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists jobnova_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
