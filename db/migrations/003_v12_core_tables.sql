CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resume_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_url TEXT,
  raw_text TEXT,
  parsed_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  source_url TEXT,
  role_title TEXT,
  company_name TEXT,
  raw_text TEXT NOT NULL,
  parsed_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ats_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resume_file_id UUID REFERENCES resume_files(id) ON DELETE CASCADE,
  job_description_id UUID REFERENCES job_descriptions(id) ON DELETE CASCADE,
  overall_score INT,
  keyword_score INT,
  title_alignment_score INT,
  experience_score INT,
  formatting_score INT,
  missing_keywords JSONB,
  matched_keywords JSONB,
  formatting_risks JSONB,
  improvements JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resume_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  source_resume_file_id UUID REFERENCES resume_files(id) ON DELETE SET NULL,
  target_job_description_id UUID REFERENCES job_descriptions(id) ON DELETE SET NULL,
  version_name TEXT,
  rewritten_text TEXT NOT NULL,
  summary TEXT,
  improved_bullets JSONB,
  export_docx_url TEXT,
  export_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company TEXT,
  title TEXT,
  status TEXT DEFAULT 'saved',
  applied_date DATE,
  follow_up_date DATE,
  notes TEXT,
  resume_version_id UUID REFERENCES resume_versions(id) ON DELETE SET NULL,
  job_description_id UUID REFERENCES job_descriptions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_role TEXT,
  session_summary TEXT,
  score_clarity INT,
  score_relevance INT,
  score_structure INT,
  feedback JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_files_user_id ON resume_files(user_id);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id ON job_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_ats_results_user_id ON ats_results(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
