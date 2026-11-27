import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import {
  User,
  Organization,
  Agent,
  PromptVersion,
  ToolItem,
  Workflow,
  ExecutionRecord,
  ApprovalRequest,
  DocumentRecord,
  AuditLog,
  SubscriptionInvoice,
} from "../types";

export interface DatabaseState {
  organizations: Organization[];
  users: User[];
  agents: Agent[];
  promptVersions: PromptVersion[];
  tools: ToolItem[];
  workflows: Workflow[];
  executions: ExecutionRecord[];
  approvalRequests: ApprovalRequest[];
  documents: DocumentRecord[];
  auditLogs: AuditLog[];
  invoices: SubscriptionInvoice[];
}

const DB_FILE_PATH = path.join(__dirname, "../../../data/agentsphere_store.json");

export class Store {
  private state: DatabaseState;
  private isLoaded = false;

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): DatabaseState {
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
        modelName: "gemini-2.5-flash",
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
        modelName: "gemini-2.5-flash",
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
        modelName: "gemini-2.5-flash",
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
        modelName: "gemini-2.5-flash",
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

    const executions: ExecutionRecord[] = [
      {
        id: "exec-101",
        organizationId: "org-acme-1",
        workflowId: "wf-invoice-1",
        agentId: "agent-financial-2",
        title: "Q4 Vendor Invoice Batch #9421",
        status: "COMPLETED",
        startTime: new Date(Date.now() - 3600000 * 2).toISOString(),
        endTime: new Date(Date.now() - 3600000 * 2 + 14200).toISOString(),
        totalTokens: 1480,
        estimatedCostUsd: 0.000355,
        provider: "gemini",
        stepsTimeline: [
          {
            stepIndex: 1,
            nodeId: "node-1",
            nodeType: "start",
            name: "Trigger Event Received",
            status: "SUCCESS",
            inputData: { invoiceId: "INV-9421", amount: 7400.0 },
            outputData: { validated: true },
            tokensUsed: 0,
            durationMs: 45,
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            stepIndex: 2,
            nodeId: "node-2",
            nodeType: "knowledgeRetrieval",
            name: "Policy Document Match",
            status: "SUCCESS",
            inputData: { query: "vendor rate card clause 4" },
            outputData: { matchedChunks: 2, score: 0.92 },
            tokensUsed: 220,
            durationMs: 310,
            timestamp: new Date(Date.now() - 3600000 * 2 + 50).toISOString(),
          },
          {
            stepIndex: 3,
            nodeId: "node-3",
            nodeType: "aiAgent",
            name: "Financial Auditor Assessment",
            status: "SUCCESS",
            inputData: { amount: 7400.0 },
            outputData: { recommendation: "Approve - matches contract discount terms" },
            tokensUsed: 1260,
            durationMs: 1450,
            timestamp: new Date(Date.now() - 3600000 * 2 + 400).toISOString(),
          },
          {
            stepIndex: 4,
            nodeId: "node-4",
            nodeType: "humanApproval",
            name: "Manager Approval Decided",
            status: "SUCCESS",
            inputData: { approver: "Elena Rostova" },
            outputData: { approved: true, notes: "Approved per quarterly agreement" },
            tokensUsed: 0,
            durationMs: 12000,
            timestamp: new Date(Date.now() - 3600000 * 2 + 2000).toISOString(),
          },
          {
            stepIndex: 5,
            nodeId: "node-5",
            nodeType: "output",
            name: "Ledger Record Written",
            status: "SUCCESS",
            inputData: { txId: "TX-77124" },
            outputData: { ledgerStatus: "COMMITTED" },
            tokensUsed: 0,
            durationMs: 120,
            timestamp: new Date(Date.now() - 3600000 * 2 + 14100).toISOString(),
          },
        ],
      },
      {
        id: "exec-102",
        organizationId: "org-acme-1",
        workflowId: "wf-invoice-1",
        agentId: "agent-financial-2",
        title: "Off-Cycle Expense Claim #8819",
        status: "PAUSED_APPROVAL",
        startTime: new Date(Date.now() - 900000).toISOString(),
        totalTokens: 840,
        estimatedCostUsd: 0.000195,
        provider: "gemini",
        approvalRequestId: "appr-201",
        stepsTimeline: [
          {
            stepIndex: 1,
            nodeId: "node-1",
            nodeType: "start",
            name: "Claim Ingested",
            status: "SUCCESS",
            inputData: { claimId: "CLM-8819", requestedAmount: 6250.0 },
            outputData: { validated: true },
            tokensUsed: 0,
            durationMs: 30,
            timestamp: new Date(Date.now() - 900000).toISOString(),
          },
          {
            stepIndex: 2,
            nodeId: "node-2",
            nodeType: "knowledgeRetrieval",
            name: "Retrieve Travel Spending Cap",
            status: "SUCCESS",
            inputData: { query: "executive travel policy limits" },
            outputData: { matchedChunks: 1, score: 0.88 },
            tokensUsed: 190,
            durationMs: 240,
            timestamp: new Date(Date.now() - 899000).toISOString(),
          },
          {
            stepIndex: 3,
            nodeId: "node-3",
            nodeType: "aiAgent",
            name: "Auditor AI Discrepancy Check",
            status: "SUCCESS",
            inputData: { claimAmount: 6250.0, policyCap: 5000.0 },
            outputData: { flagged: true, varianceReason: "Exceeds standard cap by $1,250. Human authorization required." },
            tokensUsed: 650,
            durationMs: 1100,
            timestamp: new Date(Date.now() - 898000).toISOString(),
          },
          {
            stepIndex: 4,
            nodeId: "node-4",
            nodeType: "humanApproval",
            name: "Approval Gate Awaiting Review",
            status: "PAUSED",
            inputData: { pendingWithRole: "ORGANIZATION_OWNER" },
            outputData: { status: "Awaiting decision" },
            tokensUsed: 0,
            durationMs: 0,
            timestamp: new Date(Date.now() - 896000).toISOString(),
          },
        ],
      },
    ];

    const approvalRequests: ApprovalRequest[] = [
      {
        id: "appr-201",
        organizationId: "org-acme-1",
        executionId: "exec-102",
        stepId: "node-4",
        prompt: "Expense claim CLM-8819 for $6,250.00 exceeds standard travel cap ($5,000.00). Do you approve this exception?",
        context: {
          employee: "Marcus Vance",
          department: "AI Infrastructure",
          requestedAmount: 6250.0,
          policyLimit: 5000.0,
          reason: "Emergency on-site GPU cluster maintenance flight and lodging"
        },
        status: "PENDING",
        requestedAt: new Date(Date.now() - 896000).toISOString(),
      },
    ];

    const documents: DocumentRecord[] = [
      {
        id: "doc-policy-1",
        organizationId: "org-acme-1",
        filename: "Enterprise_Security_Guidelines_2026.pdf",
        fileType: "pdf",
        fileSizeBytes: 148200,
        totalChunks: 18,
        totalCharacters: 24600,
        status: "INDEXED",
        uploadedByUserId: "user-builder-2",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: "doc-billing-2",
        organizationId: "org-acme-1",
        filename: "API_Billing_and_Quota_Policy.docx",
        fileType: "docx",
        fileSizeBytes: 82500,
        totalChunks: 9,
        totalCharacters: 12400,
        status: "INDEXED",
        uploadedByUserId: "user-owner-1",
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
    ];

    const auditLogs: AuditLog[] = [
      {
        id: "audit-1",
        organizationId: "org-acme-1",
        userId: "user-owner-1",
        userEmail: "owner@agentsphere.ai",
        action: "ORGANIZATION_INITIALIZED",
        resourceType: "organization",
        resourceId: "org-acme-1",
        details: { plan: "enterprise", monthlyLimit: 100000000 },
        ipAddress: "127.0.0.1",
        timestamp: new Date(Date.now() - 86400000 * 10).toISOString(),
      },
      {
        id: "audit-2",
        organizationId: "org-acme-1",
        userId: "user-builder-2",
        userEmail: "builder@agentsphere.ai",
        action: "AGENT_PUBLISHED",
        resourceType: "agent",
        resourceId: "agent-financial-2",
        details: { name: "Enterprise Financial Auditor", provider: "gemini" },
        ipAddress: "127.0.0.1",
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: "audit-3",
        organizationId: "org-acme-1",
        userId: "user-operator-3",
        userEmail: "operator@agentsphere.ai",
        action: "WORKFLOW_TRIGGERED",
        resourceType: "workflow",
        resourceId: "wf-invoice-1",
        details: { executionId: "exec-101", title: "Q4 Vendor Invoice Batch #9421" },
        ipAddress: "127.0.0.1",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ];

    const invoices: SubscriptionInvoice[] = [
      {
        id: "inv-2026-10",
        organizationId: "org-acme-1",
        plan: "enterprise",
        amountUsd: 499.0,
        status: "PAID",
        billingPeriod: "October 2026",
        invoiceDate: "2026-10-31T23:59:59Z",
        tokenUsage: 14205000,
      },
      {
        id: "inv-2026-11",
        organizationId: "org-acme-1",
        plan: "enterprise",
        amountUsd: 499.0,
        status: "PENDING",
        billingPeriod: "November 2026 (Current)",
        invoiceDate: "2026-11-27T00:00:00Z",
        tokenUsage: 2458120,
      },
    ];

    return {
      organizations,
      users,
      agents,
      promptVersions,
      tools,
      workflows,
      executions,
      approvalRequests,
      documents,
      auditLogs,
      invoices,
    };
  }

  public init() {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
        this.state = JSON.parse(raw);
      } else {
        this.persist();
      }
      this.isLoaded = true;
    } catch (e) {
      console.warn("Failed to read from persistent storage; using memory state", e);
    }
  }

  public persist() {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to persist database state", e);
    }
  }

  // --- Multi-Tenant Scoped Accessors ---

  // Organizations
  public getOrganization(id: string): Organization | undefined {
    return this.state.organizations.find((o) => o.id === id);
  }

  public getAllOrganizations(): Organization[] {
    return this.state.organizations;
  }

  public createOrganization(org: Organization): Organization {
    this.state.organizations.push(org);
    this.persist();
    return org;
  }

  public updateOrganization(id: string, updates: Partial<Organization>): Organization {
    const idx = this.state.organizations.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error("Organization not found");
    this.state.organizations[idx] = { ...this.state.organizations[idx], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    return this.state.organizations[idx];
  }

  // Users
  public findUserByEmail(email: string): User | undefined {
    return this.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  public getUsers(orgId: string): User[] {
    return this.state.users.filter((u) => u.organizationId === orgId);
  }

  public createUser(user: User): User {
    this.state.users.push(user);
    this.persist();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User {
    const idx = this.state.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error("User not found");
    this.state.users[idx] = { ...this.state.users[idx], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    return this.state.users[idx];
  }

  // Agents (Strictly Org-Scoped)
  public getAgents(orgId: string): Agent[] {
    return this.state.agents.filter((a) => a.organizationId === orgId && !a.isArchived);
  }

  public getAgentById(orgId: string, agentId: string): Agent | undefined {
    return this.state.agents.find((a) => a.id === agentId && a.organizationId === orgId);
  }

  public createAgent(agent: Agent): Agent {
    this.state.agents.push(agent);
    this.persist();
    return agent;
  }

  public updateAgent(orgId: string, agentId: string, updates: Partial<Agent>): Agent {
    const idx = this.state.agents.findIndex((a) => a.id === agentId && a.organizationId === orgId);
    if (idx === -1) throw new Error("Agent not found in organization");
    this.state.agents[idx] = { ...this.state.agents[idx], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    return this.state.agents[idx];
  }

  public deleteAgent(orgId: string, agentId: string): boolean {
    const initialLen = this.state.agents.length;
    this.state.agents = this.state.agents.filter((a) => !(a.id === agentId && a.organizationId === orgId));
    if (this.state.agents.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // Prompt Versions
  public getPromptVersions(orgId: string, agentId?: string): PromptVersion[] {
    return this.state.promptVersions.filter(
      (pv) => pv.organizationId === orgId && (!agentId || pv.agentId === agentId)
    );
  }

  public createPromptVersion(pv: PromptVersion): PromptVersion {
    this.state.promptVersions.push(pv);
    this.persist();
    return pv;
  }

  // Tools
  public getTools(orgId: string): ToolItem[] {
    return this.state.tools.filter((t) => t.organizationId === orgId);
  }

  public getToolByName(orgId: string, name: string): ToolItem | undefined {
    return this.state.tools.find((t) => t.name === name && (t.organizationId === orgId || t.isSystemTool));
  }

  public createTool(tool: ToolItem): ToolItem {
    this.state.tools.push(tool);
    this.persist();
    return tool;
  }

  public updateTool(orgId: string, toolId: string, updates: Partial<ToolItem>): ToolItem {
    const idx = this.state.tools.findIndex((t) => t.id === toolId && t.organizationId === orgId);
    if (idx === -1) throw new Error("Tool not found");
    this.state.tools[idx] = { ...this.state.tools[idx], ...updates };
    this.persist();
    return this.state.tools[idx];
  }

  // Workflows
  public getWorkflows(orgId: string): Workflow[] {
    return this.state.workflows.filter((w) => w.organizationId === orgId);
  }

  public getWorkflowById(orgId: string, workflowId: string): Workflow | undefined {
    return this.state.workflows.find((w) => w.id === workflowId && w.organizationId === orgId);
  }

  public createWorkflow(wf: Workflow): Workflow {
    this.state.workflows.push(wf);
    this.persist();
    return wf;
  }

  public updateWorkflow(orgId: string, wfId: string, updates: Partial<Workflow>): Workflow {
    const idx = this.state.workflows.findIndex((w) => w.id === wfId && w.organizationId === orgId);
    if (idx === -1) throw new Error("Workflow not found in organization");
    this.state.workflows[idx] = { ...this.state.workflows[idx], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    return this.state.workflows[idx];
  }

  public deleteWorkflow(orgId: string, wfId: string): boolean {
    const initLen = this.state.workflows.length;
    this.state.workflows = this.state.workflows.filter((w) => !(w.id === wfId && w.organizationId === orgId));
    if (this.state.workflows.length !== initLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // Executions
  public getExecutions(orgId: string): ExecutionRecord[] {
    return this.state.executions.filter((e) => e.organizationId === orgId);
  }

  public getExecutionById(orgId: string, execId: string): ExecutionRecord | undefined {
    return this.state.executions.find((e) => e.id === execId && e.organizationId === orgId);
  }

  public createExecution(exec: ExecutionRecord): ExecutionRecord {
    this.state.executions.unshift(exec);
    this.persist();
    return exec;
  }

  public updateExecution(orgId: string, execId: string, updates: Partial<ExecutionRecord>): ExecutionRecord {
    const idx = this.state.executions.findIndex((e) => e.id === execId && e.organizationId === orgId);
    if (idx === -1) throw new Error("Execution not found");
    this.state.executions[idx] = { ...this.state.executions[idx], ...updates };
    this.persist();
    return this.state.executions[idx];
  }

  // Approval Requests
  public getApprovalRequests(orgId: string): ApprovalRequest[] {
    return this.state.approvalRequests.filter((a) => a.organizationId === orgId);
  }

  public getApprovalRequestById(orgId: string, id: string): ApprovalRequest | undefined {
    return this.state.approvalRequests.find((a) => a.id === id && a.organizationId === orgId);
  }

  public createApprovalRequest(appr: ApprovalRequest): ApprovalRequest {
    this.state.approvalRequests.unshift(appr);
    this.persist();
    return appr;
  }

  public updateApprovalRequest(orgId: string, id: string, updates: Partial<ApprovalRequest>): ApprovalRequest {
    const idx = this.state.approvalRequests.findIndex((a) => a.id === id && a.organizationId === orgId);
    if (idx === -1) throw new Error("Approval request not found");
    this.state.approvalRequests[idx] = { ...this.state.approvalRequests[idx], ...updates };
    this.persist();
    return this.state.approvalRequests[idx];
  }

  // Documents
  public getDocuments(orgId: string): DocumentRecord[] {
    return this.state.documents.filter((d) => d.organizationId === orgId);
  }

  public getDocumentById(orgId: string, docId: string): DocumentRecord | undefined {
    return this.state.documents.find((d) => d.id === docId && d.organizationId === orgId);
  }

  public createDocument(doc: DocumentRecord): DocumentRecord {
    this.state.documents.unshift(doc);
    this.persist();
    return doc;
  }

  public deleteDocument(orgId: string, docId: string): boolean {
    const len = this.state.documents.length;
    this.state.documents = this.state.documents.filter((d) => !(d.id === docId && d.organizationId === orgId));
    if (this.state.documents.length !== len) {
      this.persist();
      return true;
    }
    return false;
  }

  // Audit Logs
  public getAuditLogs(orgId: string): AuditLog[] {
    return this.state.auditLogs.filter((a) => a.organizationId === orgId);
  }

  public logAudit(log: AuditLog): void {
    this.state.auditLogs.unshift(log);
    // Keep max 500 logs per instance to avoid unbounded growth
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 500);
    }
    this.persist();
  }

  // Invoices & Billing
  public getInvoices(orgId: string): SubscriptionInvoice[] {
    return this.state.invoices.filter((i) => i.organizationId === orgId);
  }

  public createInvoice(inv: SubscriptionInvoice): SubscriptionInvoice {
    this.state.invoices.unshift(inv);
    this.persist();
    return inv;
  }
}

export const db = new Store();
db.init();
