-- =============================================
-- Adala Platform - Supabase/Postgres Schema
-- Generated from Dexie schema (src/lib/db.ts + src/lib/types.ts)
-- =============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- ENUM TYPES
-- =============================================

CREATE TYPE role_enum AS ENUM ('admin','partner','senior','associate','paralegal','consultant','client');
CREATE TYPE client_type_enum AS ENUM ('individual','company','entity','opponent');
CREATE TYPE client_status_enum AS ENUM ('active','dormant','closed');
CREATE TYPE matter_status_enum AS ENUM ('open','in_review','hearing','suspended','settled','judged','closed');
CREATE TYPE matter_priority_enum AS ENUM ('normal','high','critical');
CREATE TYPE fee_type_enum AS ENUM ('fixed','percentage','hourly','retainer','pro_bono');
CREATE TYPE agreement_type_enum AS ENUM ('fee','retainer','settlement','mediation','counsel','nda');
CREATE TYPE agreement_status_enum AS ENUM ('draft','signed','executed','terminated');
CREATE TYPE payment_kind_enum AS ENUM ('fee','installment','expense','court_fee','other');
CREATE TYPE payment_method_enum AS ENUM ('cash','transfer','cheque','card','online');
CREATE TYPE task_status_enum AS ENUM ('todo','doing','done','cancelled');
CREATE TYPE task_priority_enum AS ENUM ('low','normal','high','urgent');
CREATE TYPE event_type_enum AS ENUM ('hearing','deadline','meeting','payment','followup','internal');
CREATE TYPE event_status_enum AS ENUM ('scheduled','done','postponed','cancelled');
CREATE TYPE document_category_enum AS ENUM ('contract','pleading','evidence','power_of_attorney','receipt','id','correspondence','report','memo','other');
CREATE TYPE note_kind_enum AS ENUM ('note','action','update','call','meeting','research');
CREATE TYPE library_type_enum AS ENUM ('book','article','video','journal','course','template','audio');
CREATE TYPE library_status_enum AS ENUM ('to_read','reading','finished','reference');
CREATE TYPE notification_kind_enum AS ENUM ('deadline','task','payment','system');
CREATE TYPE theme_mode_enum AS ENUM ('light','dark','system');
CREATE TYPE density_enum AS ENUM ('comfortable','compact');

-- =============================================
-- CORE TABLES
-- =============================================

-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role role_enum NOT NULL,
  title TEXT,
  bio TEXT,
  avatar_color TEXT,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  perm_overrides JSONB,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Clients
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT,
  type client_type_enum NOT NULL,
  national_id TEXT,
  commercial_id TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  profession TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  priority TEXT DEFAULT 'normal',
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  status client_status_enum DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  source TEXT
);

CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_type ON clients(type);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_assigned ON clients(assigned_to);
CREATE INDEX idx_clients_archived ON clients(archived);

-- Matter Types
CREATE TABLE matter_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  description TEXT,
  default_duration_days INTEGER,
  default_fee NUMERIC(12,2)
);

-- Matters (Cases)
CREATE TABLE matters (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  internal_ref TEXT NOT NULL,
  title TEXT NOT NULL,
  type_id TEXT REFERENCES matter_types(id) ON DELETE SET NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  opposing_party TEXT,
  court_name TEXT,
  case_number TEXT,
  judge TEXT,
  status matter_status_enum DEFAULT 'open',
  priority matter_priority_enum DEFAULT 'normal',
  stage TEXT,
  description TEXT,
  lawyer_ids TEXT[] DEFAULT '{}',
  fee_type fee_type_enum DEFAULT 'fixed',
  agreed_fee NUMERIC(12,2) DEFAULT 0,
  hourly_rate NUMERIC(12,2),
  expenses NUMERIC(12,2) DEFAULT 0,
  court_fees NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  next_action TEXT,
  next_action_date TIMESTAMPTZ,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  confidential BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  archive_year INTEGER,
  outcome TEXT,
  win_rate NUMERIC(5,2)
);

CREATE INDEX idx_matters_number ON matters(number);
CREATE INDEX idx_matters_client ON matters(client_id);
CREATE INDEX idx_matters_type ON matters(type_id);
CREATE INDEX idx_matters_status ON matters(status);
CREATE INDEX idx_matters_priority ON matters(priority);
CREATE INDEX idx_matters_next_action ON matters(next_action_date);
CREATE INDEX idx_matters_archived ON matters(archived);

-- Agreements
CREATE TABLE agreements (
  id TEXT PRIMARY KEY,
  matter_id TEXT REFERENCES matters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type agreement_type_enum NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  terms TEXT,
  signed_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status agreement_status_enum DEFAULT 'draft',
  installment_count INTEGER DEFAULT 0,
  installment_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_agreements_matter ON agreements(matter_id);
CREATE INDEX idx_agreements_status ON agreements(status);

-- Payments
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  matter_id TEXT REFERENCES matters(id) ON DELETE SET NULL,
  agreement_id TEXT REFERENCES agreements(id) ON DELETE SET NULL,
  kind payment_kind_enum NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method payment_method_enum NOT NULL,
  receipt_no TEXT,
  notes TEXT,
  recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_payments_matter ON payments(matter_id);
CREATE INDEX idx_payments_agreement ON payments(agreement_id);
CREATE INDEX idx_payments_date ON payments(date);
CREATE INDEX idx_payments_kind ON payments(kind);

-- Tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  matter_id TEXT REFERENCES matters(id) ON DELETE SET NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  remind_at TIMESTAMPTZ,
  priority task_priority_enum DEFAULT 'normal',
  status task_status_enum DEFAULT 'todo',
  tags TEXT[] DEFAULT '{}',
  checklist JSONB DEFAULT '[]',
  estimated_hours NUMERIC(6,2),
  recurring TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_tasks_matter ON tasks(matter_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Legal Events (Hearings/Appointments)
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type event_type_enum NOT NULL,
  matter_id TEXT REFERENCES matters(id) ON DELETE SET NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  date TIMESTAMPTZ NOT NULL,
  end_time TEXT,
  location TEXT,
  court_room TEXT,
  judge TEXT,
  attendees TEXT[] DEFAULT '{}',
  notes TEXT,
  outcome TEXT,
  status event_status_enum DEFAULT 'scheduled',
  remind_before_days INTEGER DEFAULT 1,
  reminders_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_matter ON events(matter_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_status ON events(status);

-- Files (for uploaded documents)
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mime TEXT,
  size BIGINT,
  bucket_path TEXT,
  data_url TEXT, -- optional if storing in Supabase Storage
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category document_category_enum NOT NULL,
  matter_id TEXT REFERENCES matters(id) ON DELETE SET NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  file_id TEXT REFERENCES files(id) ON DELETE SET NULL,
  file_name TEXT,
  mime TEXT,
  size BIGINT,
  version INTEGER DEFAULT 1,
  parent_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  confidential BOOLEAN DEFAULT FALSE,
  requires_signature BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMPTZ,
  print_count INTEGER DEFAULT 0,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  retention_until TIMESTAMPTZ
);

CREATE INDEX idx_documents_matter ON documents(matter_id);
CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_file ON documents(file_id);

-- Matter Notes
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  matter_id TEXT REFERENCES matters(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  kind note_kind_enum DEFAULT 'note',
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_notes_matter ON notes(matter_id);
CREATE INDEX idx_notes_pinned ON notes(pinned);

-- Library
CREATE TABLE library (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type library_type_enum NOT NULL,
  author TEXT,
  publisher TEXT,
  year INTEGER,
  category TEXT,
  description TEXT,
  url TEXT,
  file_id TEXT REFERENCES files(id) ON DELETE SET NULL,
  cover_color TEXT,
  rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  status library_status_enum DEFAULT 'to_read',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  tags TEXT[] DEFAULT '{}',
  notes JSONB DEFAULT '[]',
  is_favorite BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_opened_at TIMESTAMPTZ,
  added_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_library_type ON library(type);
CREATE INDEX idx_library_status ON library(status);
CREATE INDEX idx_library_fav ON library(is_favorite);

-- Templates
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category document_category_enum,
  body TEXT,
  variables TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

-- Activity Log
CREATE TABLE activity (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  meta TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_at ON activity(at);
CREATE INDEX idx_activity_entity ON activity(entity, entity_id);

-- Notifications
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind notification_kind_enum NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  read BOOLEAN DEFAULT FALSE,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  link TEXT
);

CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_at ON notifications(at);

-- Settings
CREATE TABLE settings (
  id TEXT PRIMARY KEY DEFAULT 'settings',
  profile JSONB NOT NULL,
  theme theme_mode_enum DEFAULT 'light',
  density density_enum DEFAULT 'comfortable',
  reminder_lead_days INTEGER DEFAULT 3,
  daily_digest BOOLEAN DEFAULT FALSE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  currency TEXT DEFAULT 'EGP',
  default_fee_type fee_type_enum DEFAULT 'fixed',
  archive_after_months INTEGER DEFAULT 36,
  auto_archive_closed BOOLEAN DEFAULT FALSE,
  print_header TEXT,
  print_footer TEXT,
  confidentiality_notice TEXT,
  sidebar_collapsed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio
CREATE TABLE portfolio (
  id TEXT PRIMARY KEY DEFAULT 'portfolio',
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_cta TEXT,
  about_title TEXT,
  about_body TEXT,
  stats JSONB DEFAULT '[]',
  services JSONB DEFAULT '[]',
  expertise JSONB DEFAULT '[]',
  experience JSONB DEFAULT '[]',
  credentials JSONB DEFAULT '[]',
  case_highlights JSONB DEFAULT '[]',
  testimonials JSONB DEFAULT '[]',
  articles JSONB DEFAULT '[]',
  languages TEXT[] DEFAULT '{}',
  memberships TEXT[] DEFAULT '{}',
  cta_title TEXT,
  cta_body TEXT,
  avatar_file_id TEXT REFERENCES files(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- HELPFUL VIEWS (Optional)
-- =============================================

CREATE OR REPLACE VIEW v_matters_summary AS
SELECT 
  m.*,
  c.name AS client_name,
  mt.name AS matter_type_name
FROM matters m
LEFT JOIN clients c ON c.id = m.client_id
LEFT JOIN matter_types mt ON mt.id = m.type_id;

-- =============================================
-- RLS (Row Level Security) - ENABLE LATER
-- =============================================
-- Uncomment and configure based on your auth model
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ... etc

-- =============================================
-- SEED DATA (from seed.ts)
-- =============================================

INSERT INTO users (id, name, username, email, role, title, password_hash, salt, is_active, created_at)
VALUES ('usr_admin', 'مدير النظام', 'admin', 'admin@adala.local', 'admin', 'مدير', 'CHANGE_ME', 'CHANGE_ME', TRUE, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO matter_types (id, name, color, icon) VALUES
('mt_civil', 'مدني', '#3b82f6', 'scale'),
('mt_crim', 'جنائي', '#ef4444', 'gavel'),
('mt_com', 'تجاري', '#f59e0b', 'briefcase'),
('mt_labor', 'عمالي', '#10b981', 'users'),
('mt_admin', 'إداري', '#6366f1', 'building')
ON CONFLICT (id) DO NOTHING;

INSERT INTO settings (id, profile, theme, print_header, print_footer)
VALUES (
  'settings',
  '{"firmName": "مكتب المحاماة", "tagline": "استشارات قانونية وتمثيل أمام المحاكم", "lawyerName": "المحامي المسؤول", "licenseNumber": "", "email": "", "phone": "", "address": "", "website": ""}',
  'light',
  'مكتب المحاماة',
  'جميع الحقوق محفوظة'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO portfolio (id, hero_title, hero_subtitle, hero_cta, about_title, about_body, stats, services, languages, memberships)
VALUES (
  'portfolio',
  'المحامي / استشارات وقضايا',
  'نقدم الاستشارات القانونية والتمثيل أمام جميع درجات التقاضي بكفاءة واحترافية.',
  'احجز استشارة',
  'نبذة عن المكتب',
  'مكتب متخصص في تقديم الخدمات القانونية المتكاملة.',
  '[{"label": "قضية", "value": "500", "suffix": "+"}, {"label": "موكل", "value": "400", "suffix": "+"}, {"label": "سنة خبرة", "value": "20", "suffix": "+"}, {"label": "نجاح", "value": "95", "suffix": "%"}]',
  '[{"title": "القضايا المدنية", "description": "التمثيل في الدعاوى المدنية والتعويضات", "icon": "scale"}, {"title": "القضايا الجنائية", "description": "الدفاع الجنائي والجنح والجنايات", "icon": "gavel"}, {"title": "القضايا التجارية", "description": "المنازعات التجارية والعقود", "icon": "briefcase"}]',
  '{"العربية", "الإنجليزية"}',
  '{"نقابة المحامين"}'
)
ON CONFLICT (id) DO NOTHING;
