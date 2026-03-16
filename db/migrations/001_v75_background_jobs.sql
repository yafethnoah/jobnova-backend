create table if not exists background_jobs (
  id text primary key,
  user_id text not null,
  kind text not null,
  status text not null,
  progress integer not null default 0,
  payload_json jsonb not null default '{}'::jsonb,
  result_json jsonb,
  error_message text,
  queue_job_id text,
  request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_background_jobs_user_created_at
  on background_jobs (user_id, created_at desc);

create index if not exists idx_background_jobs_user_status
  on background_jobs (user_id, status);
