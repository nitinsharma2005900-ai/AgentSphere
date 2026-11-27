import fs from "fs";
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
  private getInitialState() {
    const passwordHash = bcrypt.hashSync("Password123!", 10);
    const now = new Date().toISOString();

    const organizations: Organization[] = [
      {
        id: "org-acme-1",
        name: "Acme AI Global",
        plan: "enterprise",
        monthlyTokenLimit: 100_000_000,
        usedTokensThisMonth: 2_458_120,
        dailyExecutionLimit: 5000,
        usedExecutionsToday: 142,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "org-cyberdyne-2",
        name: "Cyberdyne Systems",
        plan: "pro",
        monthlyTokenLimit: 10_000_000,
        usedTokensThisMonth: 840_200,
        dailyExecutionLimit: 1000,
        usedExecutionsToday: 38,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const users: User[] = [
      {
        id: "user-owner-1",
        email: "owner@agentsphere.ai",
        passwordHash,
        name: "Elena Rostova",
        role: "ORGANIZATION_OWNER",
        organizationId: "org-acme-1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-builder-2",
        email: "builder@agentsphere.ai",
        passwordHash,
        name: "Marcus Vance",
        role: "AI_BUILDER",
        organizationId: "org-acme-1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-operator-3",
        email: "operator@agentsphere.ai",
        passwordHash,
        name: "Sarah Chen",
        role: "WORKFLOW_OPERATOR",
        organizationId: "org-acme-1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-auditor-4",
        email: "auditor@agentsphere.ai",
        passwordHash,
        name: "David Sterling",
        role: "AUDITOR",
        organizationId: "org-acme-1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-admin-5",
        email: "admin@agentsphere.ai",
        passwordHash,
        name: "Alex Cross (Root)",
        role: "PLATFORM_ADMINISTRATOR",
        organizationId: "org-acme-1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-competitor-6",
        email: "competitor@external.io",
        passwordHash,
        name: "Miles Dyson",
        role: "ORGANIZATION_OWNER",
        organizationId: "org-cyberdyne-2",
        createdAt: now,
        updatedAt: now,
      },
    ];

    const agents: Agent[] = [
      {
        id: "agent-concierge-1",
        organizationId: "org-acme-1",
        name: "Autonomous Customer Concierge",
        description: "Enterprise tier 1 support agent handling triage, documentation lookup, and resolution summaries.",
        avatar: "bot",
        color: "#8B5CF6",
        modelProvider: "gemini",
        modelName: "gemini-3.1-flash-lite",
        temperature: 0.6,
        maxTokens: 2048,
        maxSteps: 15,
        timeoutSeconds: 30,
        knowledgeBaseIds: ["doc-policy-1"],
        toolPermissions: ["knowledge_search", "date_time"],
        humanApprovalRequired: false,
        isDraft: false,
        isArchived: false,
        systemPrompt: "You are the Autonomous Customer Concierge. Provide professional, courteous, and accurate enterprise support. Cite knowledge sources when answering company policy questions.",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "agent-financial-2",
        organizationId: "org-acme-1",
        name: "Enterprise Financial Auditor",
        description: "Audits expense reports, calculates taxes and currency conversions, flags anomalies, and prepares reports.",
        avatar: "briefcase",
        color: "#F59E0B",
        modelProvider: "gemini",
        modelName: "gemini-3.1-flash-lite",
        temperature: 0.2,
        maxTokens: 3000,
        maxSteps: 20,
        timeoutSeconds: 45,
        knowledgeBaseIds: ["doc-policy-1", "doc-billing-2"],
        toolPermissions: ["calculator", "knowledge_search", "json_transform"],
        humanApprovalRequired: true,
        isDraft: false,
        isArchived: false,
        systemPrompt: "You are the Enterprise Financial Auditor. Strictly verify all figures and calculate discrepancies. If high-value transactions (> $5,000) are flagged, submit for human approval.",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "agent-security-3",
        organizationId: "org-acme-1",
        name: "Code Review & Security Sentry",
        description: "Scans pull requests, detects vulnerabilities, checks OWASP compliance, and recommends patches.",
        avatar: "shield",
        color: "#10B981",
        modelProvider: "gemini",
        modelName: "gemini-3.1-flash-lite",
        temperature: 0.3,
        maxTokens: 4096,
        maxSteps: 15,
        timeoutSeconds: 30,
        knowledgeBaseIds: ["doc-policy-1"],
        toolPermissions: ["knowledge_search"],
        humanApprovalRequired: false,
        isDraft: false,
        isArchived: false,
        systemPrompt: "You are the Code Review & Security Sentry. Enforce strict least-privilege, clean code principles, and detect security vulnerabilities.",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "agent-cyberdyne-4",
        organizationId: "org-cyberdyne-2",
        name: "Cyberdyne Core AI Unit",
        description: "Private automated defense and logistics coordination agent for Cyberdyne Systems.",
        avatar: "cpu",
        color: "#EF4444",
        modelProvider: "gemini",
        modelName: "gemini-3.1-flash-lite",
        temperature: 0.1,
        maxTokens: 2048,
        maxSteps: 10,
        timeoutSeconds: 30,
        knowledgeBaseIds: [],
        toolPermissions: ["calculator"],
        humanApprovalRequired: false,
        isDraft: false,
        isArchived: false,
        systemPrompt: "You are the Cyberdyne Core AI Unit. Confidential tenant data only.",
        createdAt: now,
        updatedAt: now,
      },
    ];

    const promptVersions: PromptVersion[] = [
      {
        id: "pv-1",
        organizationId: "org-acme-1",
        agentId: "agent-financial-2",
        versionNumber: 1,
        title: "Initial Financial Analysis Prompt",
        templateText: "Audit the following transaction table: {{transactions}}. Output flagged rows.",
        inputVariables: ["transactions"],
        changeSummary: "Baseline prompt release for invoice reconciliation.",
        isPublished: false,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: "pv-2",
        organizationId: "org-acme-1",
        agentId: "agent-financial-2",
        versionNumber: 2,
        title: "Optimized Chain-of-Thought Financial Auditor",
        templateText: "Step 1: Parse {{transactions}} JSON. Step 2: Calculate subtotal via calculator. Step 3: Flag if variance > {{threshold}}%.",
        inputVariables: ["transactions", "threshold"],
        changeSummary: "Added step-by-step reasoning and dynamic threshold parameter.",
        isPublished: true,
        createdAt: now,
      },
    ];

    const tools: ToolItem[] = [
      {
        id: "tool-calc-1",
        organizationId: "org-acme-1",
        name: "calculator",
        description: "Evaluates mathematical expressions safely using sandboxed arithmetic parser.",
        category: "utility",
        parameters: {
          type: "object",
          properties: {
            expression: { type: "string", description: "Arithmetic formula, e.g. 5000 * 1.18" }
          },
          required: ["expression"]
        },
        isEnabled: true,
        isSystemTool: true,
        timeoutMs: 3000,
        createdAt: now,
      },
      {
        id: "tool-time-2",
        organizationId: "org-acme-1",
        name: "date_time",
        description: "Retrieves current UTC or localized date, timestamp, and timezone offsets.",
        category: "utility",
        parameters: {
          type: "object",
          properties: {
            format: { type: "string", enum: ["iso", "human", "timestamp"] }
          }
        },
        isEnabled: true,
        isSystemTool: true,
        timeoutMs: 2000,
        createdAt: now,
      },
      {
        id: "tool-search-3",
        organizationId: "org-acme-1",
        name: "knowledge_search",
        description: "Executes semantic cosine-similarity retrieval across tenant documents.",
        category: "knowledge",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Semantic search query phrase" },
            top_k: { type: "number", default: 4 }
          },
          required: ["query"]
        },
        isEnabled: true,
        isSystemTool: true,
        timeoutMs: 5000,
        createdAt: now,
      },
      {
        id: "tool-json-4",
        organizationId: "org-acme-1",
        name: "json_transform",
        description: "Filters and transforms nested JSON structures according to a projection schema.",
        category: "transform",
        parameters: {
          type: "object",
          properties: {
            inputJson: { type: "object" },
            targetKeys: { type: "array", items: { type: "string" } }
          },
          required: ["inputJson", "targetKeys"]
        },
        isEnabled: true,
        isSystemTool: true,
        timeoutMs: 3000,
        createdAt: now,
      },
      {
        id: "tool-weather-5",
        organizationId: "org-acme-1",
        name: "public_weather_api",
        description: "Safe read-only external API returning live climate and temperature data from Open-Meteo.",
        category: "api",
        endpointUrl: "https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.41&current_weather=true",
        parameters: {
          type: "object",
          properties: {
            city: { type: "string", default: "San Francisco" }
          }
        },
        isEnabled: true,
        isSystemTool: false,
        timeoutMs: 6000,
        createdAt: now,
      },
    ];

    const workflows: Workflow[] = [
      {
        id: "wf-invoice-1",
        organizationId: "org-acme-1",
        name: "Multi-Step Invoice Verification & Approval Pipeline",
        description: "Ingests invoice input, pulls company rate policies, runs AI financial auditor, pauses for human approval if > $5,000, and logs audit trace.",
        versionNumber: 1,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
        nodes: [
          { id: "node-1", type: "start", position: { x: 100, y: 200 }, data: { label: "Incoming Invoice Trigger" } },
          { id: "node-2", type: "knowledgeRetrieval", position: { x: 380, y: 200 }, data: { label: "Retrieve Billing Policy", docId: "doc-billing-2" } },
          { id: "node-3", type: "aiAgent", position: { x: 680, y: 200 }, data: { label: "Financial Auditor AI", agentId: "agent-financial-2" } },
          { id: "node-4", type: "humanApproval", position: { x: 980, y: 200 }, data: { label: "Manager Approval Gate", role: "ORGANIZATION_OWNER" } },
          { id: "node-5", type: "output", position: { x: 1280, y: 200 }, data: { label: "Final Ledger Update" } },
        ],
        edges: [
          { id: "edge-1-2", source: "node-1", target: "node-2", animated: true },
          { id: "edge-2-3", source: "node-2", target: "node-3", animated: true },
          { id: "edge-3-4", source: "node-3", target: "node-4", animated: true },
          { id: "edge-4-5", source: "node-4", target: "node-5", animated: true },
        ],
      },
      {
        id: "wf-sentiment-2",
        organizationId: "org-acme-1",
        name: "Real-Time Customer Sentiment Triaging",
        description: "Evaluates inbound customer support requests, classifies urgency, and routes directly to concierge.",
        versionNumber: 1,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
        nodes: [
          { id: "wf2-node-1", type: "start", position: { x: 100, y: 150 }, data: { label: "Customer Message Ingest" } },
          { id: "wf2-node-2", type: "aiAgent", position: { x: 420, y: 150 }, data: { label: "Concierge Classifier", agentId: "agent-concierge-1" } },
          { id: "wf2-node-3", type: "output", position: { x: 740, y: 150 }, data: { label: "Triage Dispatch" } },
        ],
        edges: [
          { id: "wf2-edge-1-2", source: "wf2-node-1", target: "wf2-node-2", animated: true },
          { id: "wf2-edge-2-3", source: "wf2-node-2", target: "wf2-node-3", animated: true },
        ],
      },
    ];


    for (const org of organizations) { org.usedTokensThisMonth = 0; org.usedExecutionsToday = 0; }
    for (const agent of agents) agent.knowledgeBaseIds = [];
    for (const wf of workflows) for (const node of wf.nodes) delete node.data.docId;
    return { organizations, users, agents, promptVersions, tools, workflows,
      executions: [], approvalRequests: [], documents: [], auditLogs: [], invoices: [] };
  }

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
