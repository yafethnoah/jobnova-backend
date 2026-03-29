create table if not exists application_packages (
  id text primary key,
  user_id text not null,
  source_job_id text,
  target_role text not null default '',
  company_name text not null default '',
  status text not null default 'draft',
  package_json jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  linked_resume_version_id text,
  linked_export_job_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_application_packages_user_created_at
  on application_packages (user_id, created_at desc);

create index if not exists idx_application_packages_user_status
  on application_packages (user_id, status);
