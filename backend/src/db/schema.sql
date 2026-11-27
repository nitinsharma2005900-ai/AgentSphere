-- Versioned PostgreSQL schema. JSONB preserves typed API payloads; tenant IDs, keys,
-- referential integrity, uniqueness and query indexes are enforced relationally.
CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS organizations(id text PRIMARY KEY, data jsonb NOT NULL,
 CHECK(data->>'id'=id), CHECK((data->>'monthlyTokenLimit')::bigint >= 0));
CREATE TABLE IF NOT EXISTS users(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 data jsonb NOT NULL, CHECK(data->>'id'=id), CHECK(data->>'organizationId'=organization_id), UNIQUE(organization_id,id));
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(organization_id);
CREATE TABLE IF NOT EXISTS agents(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 data jsonb NOT NULL, CHECK(data->>'id'=id), CHECK(data->>'organizationId'=organization_id), UNIQUE(organization_id,id));
CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(organization_id);
CREATE TABLE IF NOT EXISTS prompt_versions(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 data jsonb NOT NULL, CHECK(data->>'id'=id), CHECK(data->>'organizationId'=organization_id), UNIQUE(organization_id,id));
CREATE INDEX IF NOT EXISTS idx_prompt_versions_tenant ON prompt_versions(organization_id);
CREATE TABLE IF NOT EXISTS tools(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 data jsonb NOT NULL, CHECK(data->>'id'=id), CHECK(data->>'organizationId'=organization_id), UNIQUE(organization_id,id));
CREATE INDEX IF NOT EXISTS idx_tools_tenant ON tools(organization_id);
CREATE TABLE IF NOT EXISTS workflows(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 data jsonb NOT NULL, CHECK(data->>'id'=id), CHECK(data->>'organizationId'=organization_id), UNIQUE(organization_id,id));
CREATE INDEX IF NOT EXISTS idx_workflows_tenant ON workflows(organization_id);
CREATE TABLE IF NOT EXISTS executions(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 data jsonb NOT NULL, CHECK(data->>'id'=id), CHECK(data->>'organizationId'=organization_id), UNIQUE(organization_id,id));
CREATE INDEX IF NOT EXISTS idx_executions_tenant ON executions(organization_id);
CREATE TABLE IF NOT EXISTS approval_requests(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 data jsonb NOT NULL, CHECK(data->>'id'=id), CHECK(data->>'organizationId'=organization_id), UNIQUE(organization_id,id));
CREATE INDEX IF NOT EXISTS idx_approval_requests_tenant ON approval_requests(organization_id);
CREATE TABLE IF NOT EXISTS documents(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 data jsonb NOT NULL, CHECK(data->>'id'=id), CHECK(data->>'organizationId'=organization_id), UNIQUE(organization_id,id));
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(organization_id);
CREATE TABLE IF NOT EXISTS audit_logs(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 data jsonb NOT NULL, CHECK(data->>'id'=id), CHECK(data->>'organizationId'=organization_id), UNIQUE(organization_id,id));
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(organization_id);
CREATE TABLE IF NOT EXISTS invoices(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 data jsonb NOT NULL, CHECK(data->>'id'=id), CHECK(data->>'organizationId'=organization_id), UNIQUE(organization_id,id));
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(organization_id);
CREATE TABLE IF NOT EXISTS sessions(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 data jsonb NOT NULL, CHECK(data->>'id'=id), CHECK(data->>'organizationId'=organization_id), UNIQUE(organization_id,id));
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON sessions(organization_id);
CREATE TABLE IF NOT EXISTS api_keys(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 data jsonb NOT NULL, CHECK(data->>'id'=id), CHECK(data->>'organizationId'=organization_id), UNIQUE(organization_id,id));
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(organization_id);
CREATE TABLE IF NOT EXISTS secrets(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 data jsonb NOT NULL, CHECK(data->>'id'=id), CHECK(data->>'organizationId'=organization_id), UNIQUE(organization_id,id));
CREATE INDEX IF NOT EXISTS idx_secrets_tenant ON secrets(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(lower(data->>'email'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_tools_name ON tools(organization_id,(data->>'name'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_version ON prompt_versions(organization_id,coalesce(data->>'agentId',''),((data->>'versionNumber')::int));
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_published ON prompt_versions(organization_id,coalesce(data->>'agentId','')) WHERE (data->>'isPublished')::boolean;
CREATE INDEX IF NOT EXISTS idx_exec_status ON executions(organization_id,(data->>'status'));
CREATE INDEX IF NOT EXISTS idx_exec_date ON executions(organization_id,(data->>'startTime'));
CREATE INDEX IF NOT EXISTS idx_session_user ON sessions((data->>'userId'));
CREATE TABLE IF NOT EXISTS document_chunks(
 tenant_id text NOT NULL REFERENCES organizations(id), document_id text NOT NULL,
 chunk_id text NOT NULL, content text NOT NULL, embedding jsonb NOT NULL, metadata jsonb NOT NULL,
 PRIMARY KEY(tenant_id,chunk_id));
CREATE INDEX IF NOT EXISTS idx_chunk_document ON document_chunks(tenant_id,document_id);
INSERT INTO schema_migrations(version) VALUES(2) ON CONFLICT DO NOTHING;
