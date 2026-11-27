import request from "supertest";
import { app } from "../src/index";

describe("AgentSphere Backend Multi-Tenant API Test Suite", () => {
  let ownerToken: string;
  let builderToken: string;
  let competitorToken: string;
  let agentId: string;
  let workflowId: string;
  let executionId: string;

  beforeAll(async () => {
    // Log in as Organization Owner (Acme AI Global)
    const resOwner = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "owner@agentsphere.ai", password: "Password123!" });
    expect(resOwner.status).toBe(200);
    ownerToken = resOwner.body.token;

    // Log in as AI Builder (Acme AI Global)
    const resBuilder = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "builder@agentsphere.ai", password: "Password123!" });
    expect(resBuilder.status).toBe(200);
    builderToken = resBuilder.body.token;

    // Log in as Competitor (Cyberdyne Systems - different tenant)
    const resComp = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "competitor@external.io", password: "Password123!" });
    expect(resComp.status).toBe(200);
    competitorToken = resComp.body.token;
  });

  describe("Assessment 02 & 04: Authentication & RBAC", () => {
    it("should return current user profile with role and organization", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe("ORGANIZATION_OWNER");
      expect(res.body.user.organizationId).toBe("org-acme-1");
    });

    it("should reject unauthenticated requests to protected endpoints", async () => {
      const res = await request(app).get("/api/v1/agents");
      expect(res.status).toBe(401);
    });

    it("should enforce RBAC when unauthorized role attempts restricted action", async () => {
      // Login as Auditor
      const resAuditor = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "auditor@agentsphere.ai", password: "Password123!" });
      const auditorToken = resAuditor.body.token;

      // Auditor cannot create agents
      const res = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${auditorToken}`)
        .send({ name: "Illegal Agent", systemPrompt: "Test" });
      expect(res.status).toBe(403);
      expect(res.body.message).toContain("not authorized");
    });
  });

  describe("Assessment 04: Multi-Tenant Data Isolation (Negative Testing)", () => {
    it("Competitor tenant MUST NOT see Acme AI Global's agents", async () => {
      const res = await request(app)
        .get("/api/v1/agents")
        .set("Authorization", `Bearer ${competitorToken}`);
      expect(res.status).toBe(200);
      
      // All returned agents must strictly belong to Cyberdyne Systems
      for (const ag of res.body) {
        expect(ag.organizationId).toBe("org-cyberdyne-2");
        expect(ag.name).not.toBe("Autonomous Customer Concierge");
      }
    });

    it("Competitor tenant MUST NOT access Acme AI Global's documents", async () => {
      const res = await request(app)
        .get("/api/v1/documents")
        .set("Authorization", `Bearer ${competitorToken}`);
      expect(res.status).toBe(200);
      for (const doc of res.body) {
        expect(doc.organizationId).toBe("org-cyberdyne-2");
      }
    });

    it("Explicit cross-tenant query spoofing is rejected", async () => {
      const res = await request(app)
        .get("/api/v1/agents?organizationId=org-acme-1")
        .set("Authorization", `Bearer ${competitorToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Tenant Isolation Violation");
    });
  });

  describe("Assessment 06 & 07: Agent Studio & Workflow Execution Engine", () => {
    it("should create a new AI agent", async () => {
      const res = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${builderToken}`)
        .send({
          name: "Automated Regression Tester",
          description: "Performs integration checks",
          avatar: "cpu",
          modelProvider: "mock",
          modelName: "agentsphere-mock-v1",
          temperature: 0.1,
          systemPrompt: "You are an automated regression tester.",
          toolPermissions: ["calculator"]
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      agentId = res.body.id;
    });

    it("should run agent execution and record usage metrics", async () => {
      const res = await request(app)
        .post(`/api/v1/agents/${agentId}/run`)
        .set("Authorization", `Bearer ${builderToken}`)
        .send({ prompt: "Please calculate 100 * 5 for validation" });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("COMPLETED");
      expect(res.body.stepsTimeline.length).toBeGreaterThanOrEqual(1);
      expect(res.body.totalTokens).toBeGreaterThan(0);
      executionId = res.body.id;
    });

    it("should retrieve execution trace observatory", async () => {
      const res = await request(app)
        .get(`/api/v1/executions/${executionId}`)
        .set("Authorization", `Bearer ${builderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(executionId);
      expect(res.body.stepsTimeline).toBeDefined();
    });
  });

  describe("Assessment 11, 12 & 14: Tools, Approvals and Quota Billing", () => {
    it("should safely evaluate sandboxed calculator tool", async () => {
      const toolsRes = await request(app)
        .get("/api/v1/tools")
        .set("Authorization", `Bearer ${ownerToken}`);
      const calcTool = toolsRes.body.find((t: any) => t.name === "calculator");

      const res = await request(app)
        .post(`/api/v1/tools/${calcTool.id}/test`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ args: { expression: "1250 * 4" } });
      expect(res.status).toBe(200);
      expect(res.body.result.result).toBe(5000);
    });

    it("should retrieve approval requests and allow approval decisions", async () => {
      const approvalsRes = await request(app)
        .get("/api/v1/approvals")
        .set("Authorization", `Bearer ${ownerToken}`);
      expect(approvalsRes.status).toBe(200);
      expect(Array.isArray(approvalsRes.body)).toBe(true);

      const pending = approvalsRes.body.find((a: any) => a.status === "PENDING");
      if (pending) {
        const approveRes = await request(app)
          .post(`/api/v1/approvals/${pending.id}/approve`)
          .set("Authorization", `Bearer ${ownerToken}`)
          .send({ notes: "Verified in test run" });
        expect(approveRes.status).toBe(200);
        expect(approveRes.body.success).toBe(true);
      }
    });

    it("should enforce simulated plan upgrades and quota reporting", async () => {
      const res = await request(app)
        .post("/api/v1/billing/plan")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ plan: "enterprise" });
      expect(res.status).toBe(200);
      expect(res.body.organization.plan).toBe("enterprise");
    });
  });
});
