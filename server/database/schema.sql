CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED');
CREATE TYPE letter_type AS ENUM ('INCOMING', 'OUTGOING');
CREATE TYPE letter_status AS ENUM ('DRAFT', 'REGISTERED', 'ROUTED', 'RECEIVED', 'ASSIGNED', 'IN_REVIEW', 'AWAITING_APPROVAL', 'CHANGES_REQUESTED', 'APPROVED', 'DISPATCHED', 'COMPLETED', 'ARCHIVED', 'CANCELLED', 'REJECTED');
CREATE TYPE letter_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE confidentiality_level AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');
CREATE TYPE movement_status AS ENUM ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'RETURNED', 'CANCELLED', 'OVERDUE');
CREATE TYPE notification_channel AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WEBHOOK');
CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ', 'DISMISSED');
CREATE TYPE audit_severity AS ENUM ('INFO', 'WARNING', 'SECURITY', 'CRITICAL');

CREATE TABLE departments (
  department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_department_id UUID REFERENCES departments(department_id) ON DELETE SET NULL,
  department_code VARCHAR(30) NOT NULL UNIQUE,
  department_name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  email CITEXT,
  phone VARCHAR(50),
  office_location VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_department_name CHECK (length(trim(department_name)) > 0)
);

CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number VARCHAR(50) UNIQUE,
  username CITEXT NOT NULL UNIQUE,
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  job_title VARCHAR(150),
  phone VARCHAR(50),
  status user_status NOT NULL DEFAULT 'ACTIVE',
  primary_department_id UUID REFERENCES departments(department_id) ON DELETE SET NULL,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE roles (
  role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code VARCHAR(80) NOT NULL UNIQUE,
  role_name VARCHAR(150) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_code VARCHAR(120) NOT NULL UNIQUE,
  permission_name VARCHAR(150) NOT NULL,
  permission_group VARCHAR(80) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(department_id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, role_id, department_id)
);

CREATE TABLE department_memberships (
  membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_department_head BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  UNIQUE (user_id, department_id)
);

CREATE TABLE letter_categories (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code VARCHAR(50) NOT NULL UNIQUE,
  category_name VARCHAR(150) NOT NULL,
  default_priority letter_priority NOT NULL DEFAULT 'NORMAL',
  default_confidentiality confidentiality_level NOT NULL DEFAULT 'INTERNAL',
  default_sla_hours INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE letters (
  letter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number VARCHAR(60) NOT NULL UNIQUE,
  letter_type letter_type NOT NULL,
  subject VARCHAR(500) NOT NULL,
  summary TEXT,
  external_reference_number VARCHAR(150),
  category_id UUID REFERENCES letter_categories(category_id) ON DELETE SET NULL,
  priority letter_priority NOT NULL DEFAULT 'NORMAL',
  confidentiality confidentiality_level NOT NULL DEFAULT 'INTERNAL',
  status letter_status NOT NULL DEFAULT 'REGISTERED',
  origin_department_id UUID REFERENCES departments(department_id) ON DELETE SET NULL,
  current_department_id UUID REFERENCES departments(department_id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(tracking_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(subject, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(external_reference_number, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'C')
  ) STORED,
  CONSTRAINT chk_letter_subject CHECK (length(trim(subject)) > 0)
);

CREATE TABLE letter_parties (
  letter_party_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES letters(letter_id) ON DELETE CASCADE,
  party_type VARCHAR(30) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  organization_name VARCHAR(255),
  email CITEXT,
  phone VARCHAR(80),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE documents (
  document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owning_letter_id UUID NOT NULL REFERENCES letters(letter_id) ON DELETE CASCADE,
  document_title VARCHAR(255) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  confidentiality confidentiality_level NOT NULL DEFAULT 'INTERNAL',
  created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE document_versions (
  document_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  storage_object_key VARCHAR(1000) NOT NULL,
  sha256_checksum CHAR(64),
  virus_scan_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  ocr_text TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current BOOLEAN NOT NULL DEFAULT true,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(file_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(ocr_text, '')), 'D')
  ) STORED,
  UNIQUE (document_id, version_number)
);

CREATE TABLE workflows (
  workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_code VARCHAR(80) NOT NULL UNIQUE,
  workflow_name VARCHAR(200) NOT NULL,
  letter_type letter_type NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_steps (
  workflow_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(workflow_id) ON DELETE CASCADE,
  step_code VARCHAR(80) NOT NULL,
  step_name VARCHAR(200) NOT NULL,
  sequence_number INTEGER NOT NULL,
  expected_status letter_status NOT NULL,
  default_sla_hours INTEGER,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  is_terminal_step BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (workflow_id, step_code),
  UNIQUE (workflow_id, sequence_number)
);

CREATE TABLE workflow_instances (
  workflow_instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(workflow_id) ON DELETE RESTRICT,
  letter_id UUID NOT NULL REFERENCES letters(letter_id) ON DELETE CASCADE,
  current_step_id UUID REFERENCES workflow_steps(workflow_step_id) ON DELETE SET NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  started_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE letter_movements (
  movement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES letters(letter_id) ON DELETE CASCADE,
  from_department_id UUID REFERENCES departments(department_id) ON DELETE SET NULL,
  to_department_id UUID REFERENCES departments(department_id) ON DELETE SET NULL,
  from_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  movement_status movement_status NOT NULL DEFAULT 'PENDING',
  note TEXT,
  routed_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  routed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  CONSTRAINT chk_movement_destination CHECK (to_department_id IS NOT NULL OR to_user_id IS NOT NULL)
);

CREATE TABLE letter_status_history (
  status_history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES letters(letter_id) ON DELETE CASCADE,
  previous_status letter_status,
  new_status letter_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason VARCHAR(255),
  note TEXT,
  movement_id UUID REFERENCES letter_movements(movement_id) ON DELETE SET NULL
);

CREATE TABLE approvals (
  approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES letters(letter_id) ON DELETE CASCADE,
  approval_level INTEGER NOT NULL DEFAULT 1,
  requested_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  requested_from_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  requested_from_department_id UUID REFERENCES departments(department_id) ON DELETE SET NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  decision_note TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ
);

CREATE TABLE letter_comments (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES letters(letter_id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES letter_comments(comment_id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE letter_qr_codes (
  qr_code_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES letters(letter_id) ON DELETE CASCADE,
  tracking_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  qr_payload TEXT NOT NULL,
  is_public_tracking_enabled BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE TABLE notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  letter_id UUID REFERENCES letters(letter_id) ON DELETE CASCADE,
  event_code VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(1000),
  status notification_status NOT NULL DEFAULT 'PENDING',
  priority letter_priority NOT NULL DEFAULT 'NORMAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

CREATE TABLE audit_logs (
  audit_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID,
  actor_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  action_code VARCHAR(120) NOT NULL,
  entity_type VARCHAR(120) NOT NULL,
  entity_id UUID,
  severity audit_severity NOT NULL DEFAULT 'INFO',
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE saved_searches (
  saved_search_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  search_name VARCHAR(150) NOT NULL,
  search_context VARCHAR(80) NOT NULL,
  query_payload JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, search_context, search_name)
);

CREATE INDEX idx_letters_type_status ON letters(letter_type, status);
CREATE INDEX idx_letters_current_department ON letters(current_department_id);
CREATE INDEX idx_letters_assigned_user ON letters(assigned_user_id);
CREATE INDEX idx_letters_priority_due ON letters(priority, due_at);
CREATE INDEX idx_letters_search_vector ON letters USING gin (search_vector);
CREATE INDEX idx_letters_subject_trgm ON letters USING gin (subject gin_trgm_ops);
CREATE INDEX idx_document_versions_search ON document_versions USING gin (search_vector);
CREATE INDEX idx_letter_movements_letter ON letter_movements(letter_id, routed_at DESC);
CREATE INDEX idx_letter_status_history_letter ON letter_status_history(letter_id, changed_at DESC);
CREATE INDEX idx_notifications_recipient_status ON notifications(recipient_user_id, status, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_letters_updated_at BEFORE UPDATE ON letters FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
