"""One-time migration of the existing synchronous repository to PostgreSQL accessors."""
from pathlib import Path

p = Path('backend/src/db/store.ts')
old = p.read_text(encoding='utf-8-sig')
seed = old[old.index('  private getInitialState()'):old.index('  public init()')]
seed = seed[:seed.index('    const executions:')]+'''
    for (const org of organizations) { org.usedTokensThisMonth = 0; org.usedExecutionsToday = 0; }
    for (const agent of agents) agent.knowledgeBaseIds = [];
    for (const wf of workflows) for (const node of wf.nodes) delete node.data.docId;
    return { organizations, users, agents, promptVersions, tools, workflows,
      executions: [], approvalRequests: [], documents: [], auditLogs: [], invoices: [] };
  }
'''
header = '''import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { Pool, PoolClient } from "pg";
import { AsyncLocalStorage } from "async_hooks";
import { config } from "../config";
import { AppError } from "../services/errors";
import { User, Organization, Agent, PromptVersion, ToolItem, Workflow, ExecutionRecord,
 ApprovalRequest, DocumentRecord, AuditLog, SubscriptionInvoice } from "../types";
type Kind = "organizations" | "users" | "agents" | "prompt_versions" | "tools" | "workflows" |
 "executions" | "approval_requests" | "documents" | "audit_logs" | "invoices" | "sessions" | "api_keys" | "secrets";
const kinds: Kind[] = ["organizations","users","agents","prompt_versions","tools","workflows",
 "executions","approval_requests","documents","audit_logs","invoices","sessions","api_keys","secrets"];
export class Store {
  public pool?: Pool;
  public ready: Promise<void>;
  private local = new Map<Kind, any[]>();
  private context = new AsyncLocalStorage<PoolClient | "memory">();
  private locks = new Map<string, Promise<unknown>>();
  private localFile = path.resolve(__dirname, "../../../data/development-v2.json");
  constructor() {
    for (const kind of kinds) this.local.set(kind, []);
    if (config.databaseUrl) this.pool = new Pool({ connectionString: config.databaseUrl, max: 8,
      connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 });
    this.ready = this.init();
  }
'''
core = '''
  private async init() {
    if (this.pool) {
      const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(91009)");
        await client.query(sql);
        await this.context.run(client, async () => {
          if ((await this.list("organizations")).length === 0 && config.seedDemo) await this.seed();
        });
        await client.query("COMMIT");
      } catch (err) { await client.query("ROLLBACK"); throw err; }
      finally { client.release(); }
    } else {
      if (config.nodeEnv !== "test" && fs.existsSync(this.localFile)) {
        const saved = JSON.parse(fs.readFileSync(this.localFile, "utf8"));
        for (const kind of kinds) this.local.set(kind, saved[kind] || []);
      } else if (config.seedDemo) await this.seed();
    }
  }
  private async seed() {
    const state: any = this.getInitialState();
    const aliases: Record<string,string> = { promptVersions:"prompt_versions", approvalRequests:"approval_requests", auditLogs:"audit_logs" };
    for (const [key, records] of Object.entries(state)) for (const record of records as any[]) {
      await this.put((aliases[key] || key) as Kind, record);
    }
  }
  public async ping() { await this.ready; if (this.pool) await this.pool.query("SELECT 1"); return this.pool ? "postgresql" : "development-file"; }
  public async close() { await this.pool?.end(); }
  public async transaction<T>(key: string, work: () => Promise<T>): Promise<T> {
    await this.ready;
    if (this.context.getStore()) return work();
    if (this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [key]);
        const result = await this.context.run(client, work);
        await client.query("COMMIT"); return result;
      } catch (err) { await client.query("ROLLBACK"); throw err; }
      finally { client.release(); }
    }
    const previous = this.locks.get("memory") || Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      const snapshot = structuredClone(this.local);
      try { return await this.context.run("memory", work); }
      catch (err) { this.local = snapshot; this.persist(); throw err; }
    });
    this.locks.set("memory", next);
    return next;
  }
  public persist() {
    if (this.pool || config.nodeEnv === "test") return;
    fs.mkdirSync(path.dirname(this.localFile), { recursive:true });
    fs.writeFileSync(this.localFile + ".tmp", JSON.stringify(Object.fromEntries(this.local)), { mode:0o600 });
    fs.renameSync(this.localFile + ".tmp", this.localFile);
  }
  private query(text:string, values:any[] = []) {
    const ctx = this.context.getStore();
    return (ctx && ctx !== "memory" ? ctx : this.pool!).query(text, values);
  }
  public async list<T = any>(kind:Kind, orgId?:string):Promise<T[]> {
    if (this.pool) {
      const where = orgId ? (kind === "organizations" ? "WHERE id=$1" : "WHERE organization_id=$1") : "";
      const result = await this.query(`SELECT data FROM ${kind} ${where} ORDER BY id`, orgId ? [orgId] : []);
      return result.rows.map(r=>r.data);
    }
    return structuredClone(this.local.get(kind)!.filter(r=>!orgId || (kind === "organizations" ? r.id : r.organizationId) === orgId));
  }
  public async get<T = any>(kind:Kind, id:string, orgId?:string):Promise<T | undefined> {
    if (this.pool) {
      const result = await this.query(`SELECT data FROM ${kind} WHERE id=$1 ${orgId ? "AND organization_id=$2" : ""}`, orgId ? [id,orgId] : [id]);
      return result.rows[0]?.data;
    }
    return structuredClone(this.local.get(kind)!.find(r=>r.id === id && (!orgId || r.organizationId === orgId)));
  }
  public async put<T extends {id:string;organizationId?:string}>(kind:Kind, record:T):Promise<T> {
    if (this.pool) {
      if (kind === "organizations") await this.query(`INSERT INTO organizations(id,data) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data`, [record.id, JSON.stringify(record)]);
      else await this.query(`INSERT INTO ${kind}(id,organization_id,data) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data WHERE ${kind}.organization_id=EXCLUDED.organization_id`, [record.id, record.organizationId, JSON.stringify(record)]);
    } else {
      const records = this.local.get(kind)!; const i=records.findIndex(r=>r.id===record.id);
      if (i<0) records.push(structuredClone(record)); else records[i]=structuredClone(record);
      this.persist();
    }
    return record;
  }
  public async update<T>(kind:Kind, id:string, updates:Partial<T>, orgId?:string):Promise<T> {
    const current:any = await this.get(kind,id,orgId);
    if (!current) throw new AppError(404,"Resource not found in organization");
    const merged = { ...current, ...updates, id:current.id, organizationId:current.organizationId, updatedAt:new Date().toISOString() };
    return this.put(kind,merged);
  }
  public async remove(kind:Kind,id:string,orgId:string):Promise<boolean> {
    if (this.pool) return (await this.query(`DELETE FROM ${kind} WHERE id=$1 AND organization_id=$2`,[id,orgId])).rowCount!>0;
    const records = this.local.get(kind)!; const index=records.findIndex(r=>r.id===id&&r.organizationId===orgId);
    if(index<0)return false; records.splice(index,1); this.persist(); return true;
  }
'''
methods='''
  public getOrganization(id:string) { return this.get<Organization>("organizations",id); }
  public getAllOrganizations() { return this.list<Organization>("organizations"); }
  public createOrganization(value:Organization) { return this.put("organizations",value); }
  public updateOrganization(id:string,value:Partial<Organization>) { return this.update<Organization>("organizations",id,value); }
  public async findUserByEmail(email:string) { return (await this.list<User>("users")).find(u=>u.email.toLowerCase()===email.toLowerCase()); }
  public findUserById(id:string) { return this.get<User>("users",id); }
  public getUsers(orgId:string) { return this.list<User>("users",orgId); }
  public createUser(value:User) { return this.put("users",value); }
  public updateUser(id:string,value:Partial<User>) { return this.update<User>("users",id,value); }
  public async getAgents(orgId:string) { return (await this.list<Agent>("agents",orgId)).filter(a=>!a.isArchived); }
  public getAgentById(orgId:string,id:string) { return this.get<Agent>("agents",id,orgId); }
  public createAgent(value:Agent) { return this.put("agents",value); }
  public updateAgent(orgId:string,id:string,value:Partial<Agent>) { return this.update<Agent>("agents",id,value,orgId); }
  public async deleteAgent(orgId:string,id:string) { if(!await this.getAgentById(orgId,id))return false; await this.updateAgent(orgId,id,{isArchived:true}); return true; }
  public async getPromptVersions(orgId:string,agentId?:string) { return (await this.list<PromptVersion>("prompt_versions",orgId)).filter(v=>!agentId||v.agentId===agentId); }
  public createPromptVersion(value:PromptVersion) { return this.put("prompt_versions",value); }
  public getTools(orgId:string) { return this.list<ToolItem>("tools",orgId); }
  public async getToolByName(orgId:string,name:string) { return (await this.getTools(orgId)).find(t=>t.name===name); }
  public createTool(value:ToolItem) { return this.put("tools",value); }
  public updateTool(orgId:string,id:string,value:Partial<ToolItem>) { return this.update<ToolItem>("tools",id,value,orgId); }
  public getWorkflows(orgId:string) { return this.list<Workflow>("workflows",orgId); }
  public getWorkflowById(orgId:string,id:string) { return this.get<Workflow>("workflows",id,orgId); }
  public createWorkflow(value:Workflow) { return this.put("workflows",value); }
  public updateWorkflow(orgId:string,id:string,value:Partial<Workflow>) { return this.update<Workflow>("workflows",id,value,orgId); }
  public deleteWorkflow(orgId:string,id:string) { return this.remove("workflows",id,orgId); }
  public async getExecutions(orgId:string) { return (await this.list<ExecutionRecord>("executions",orgId)).sort((a,b)=>b.startTime.localeCompare(a.startTime)); }
  public getExecutionById(orgId:string,id:string) { return this.get<ExecutionRecord>("executions",id,orgId); }
  public createExecution(value:ExecutionRecord) { return this.put("executions",value); }
  public updateExecution(orgId:string,id:string,value:Partial<ExecutionRecord>) { return this.update<ExecutionRecord>("executions",id,value,orgId); }
  public getApprovalRequests(orgId:string) { return this.list<ApprovalRequest>("approval_requests",orgId); }
  public getApprovalRequestById(orgId:string,id:string) { return this.get<ApprovalRequest>("approval_requests",id,orgId); }
  public createApprovalRequest(value:ApprovalRequest) { return this.put("approval_requests",value); }
  public updateApprovalRequest(orgId:string,id:string,value:Partial<ApprovalRequest>) { return this.update<ApprovalRequest>("approval_requests",id,value,orgId); }
  public getDocuments(orgId:string) { return this.list<DocumentRecord>("documents",orgId); }
  public getDocumentById(orgId:string,id:string) { return this.get<DocumentRecord>("documents",id,orgId); }
  public createDocument(value:DocumentRecord) { return this.put("documents",value); }
  public deleteDocument(orgId:string,id:string) { return this.remove("documents",id,orgId); }
  public getAuditLogs(orgId:string) { return this.list<AuditLog>("audit_logs",orgId); }
  public logAudit(value:AuditLog) { return this.put("audit_logs",value); }
  public getInvoices(orgId:string) { return this.list<SubscriptionInvoice>("invoices",orgId); }
  public createInvoice(value:SubscriptionInvoice) { return this.put("invoices",value); }
}
export const db = new Store();
'''
p.write_text(header+seed+core+methods,encoding='utf-8')

schema='''-- Versioned PostgreSQL schema. JSONB preserves typed API payloads; tenant IDs, keys,
-- referential integrity, uniqueness and query indexes are enforced relationally.
CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS organizations(id text PRIMARY KEY, data jsonb NOT NULL,
 CHECK(data->>'id'=id), CHECK((data->>'monthlyTokenLimit')::bigint >= 0));
'''
for kind in ['users','agents','prompt_versions','tools','workflows','executions','approval_requests','documents','audit_logs','invoices','sessions','api_keys','secrets']:
    schema+=f'''CREATE TABLE IF NOT EXISTS {kind}(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 data jsonb NOT NULL, CHECK(data->>'id'=id), CHECK(data->>'organizationId'=organization_id), UNIQUE(organization_id,id));
CREATE INDEX IF NOT EXISTS idx_{kind}_tenant ON {kind}(organization_id);
'''
schema+='''CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(lower(data->>'email'));
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
'''
Path('backend/src/db/schema.sql').write_text(schema,encoding='utf-8')
