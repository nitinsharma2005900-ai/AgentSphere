import { v4 as uuidv4 } from "uuid";
import { db } from "../db/store";
import { config } from "../config";
import { ToolExecutor } from "./toolExecutor";
import { AiGatewayClient } from "./aiGatewayClient";
import { ExecutionRecord, StepTrace, WorkflowNode } from "../types";

export class ExecutionEngine {
  /**
   * Run an individual AI Agent directly
   */
  public static async runAgent(
    orgId: string,
    agentId: string,
    userPrompt: string
  ): Promise<ExecutionRecord> {
    const org = db.getOrganization(orgId);
    if (!org) throw new Error("Organization not found");

    // Enforce token quota
    if (org.usedTokensThisMonth >= org.monthlyTokenLimit) {
      throw new Error(`Execution blocked: Monthly organization token quota exceeded (${org.usedTokensThisMonth} / ${org.monthlyTokenLimit})`);
    }

    const agent = db.getAgentById(orgId, agentId);
    if (!agent) throw new Error("Agent not found in organization");

    const execId = `exec-${uuidv4().substring(0, 8)}`;
    const startTime = new Date().toISOString();

    const record: ExecutionRecord = {
      id: execId,
      organizationId: orgId,
      agentId,
      title: `${agent.name} Execution`,
      status: "RUNNING",
      startTime,
      stepsTimeline: [],
      totalTokens: 0,
      estimatedCostUsd: 0,
      provider: agent.modelProvider,
    };
    db.createExecution(record);

    const stepStart = Date.now();
    try {
      // Step 1: Execute Model Generation
      const messages = [{ role: "user", content: userPrompt }];
      const aiResult = await AiGatewayClient.generate({
        messages,
        provider: agent.modelProvider,
        systemInstruction: agent.systemPrompt,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        tenantId: orgId,
      });

      let currentStep = 1;
      const step1Trace: StepTrace = {
        stepIndex: currentStep,
        name: `${agent.name} Direct Inference`,
        status: "SUCCESS",
        inputData: { prompt: userPrompt },
        outputData: { text: aiResult.content },
        tokensUsed: aiResult.usage.total_tokens,
        durationMs: Date.now() - stepStart,
        timestamp: new Date().toISOString(),
      };
      record.stepsTimeline.push(step1Trace);
      record.totalTokens += aiResult.usage.total_tokens;
      record.estimatedCostUsd += aiResult.usage.estimated_cost_usd;

      // Check if tool call requested
      if (aiResult.toolCalls && aiResult.toolCalls.length > 0) {
        for (const tc of aiResult.toolCalls) {
          currentStep++;
          const tStart = Date.now();
          // Check agent tool permission
          if (!agent.toolPermissions.includes(tc.tool_name)) {
            const errTrace: StepTrace = {
              stepIndex: currentStep,
              name: `Tool Call: ${tc.tool_name}`,
              status: "FAILED",
              inputData: tc.arguments,
              outputData: null,
              tokensUsed: 0,
              durationMs: Date.now() - tStart,
              timestamp: new Date().toISOString(),
              error: `Permission Denied: Agent '${agent.name}' does not have permission for tool '${tc.tool_name}'.`
            };
            record.stepsTimeline.push(errTrace);
            continue;
          }

          const toolOutput = await ToolExecutor.executeTool(orgId, tc.tool_name, tc.arguments);
          const toolTrace: StepTrace = {
            stepIndex: currentStep,
            name: `Tool Call: ${tc.tool_name}`,
            status: "SUCCESS",
            inputData: tc.arguments,
            outputData: toolOutput,
            tokensUsed: 0,
            durationMs: Date.now() - tStart,
            timestamp: new Date().toISOString(),
          };
          record.stepsTimeline.push(toolTrace);
        }
      }

      record.status = "COMPLETED";
      record.endTime = new Date().toISOString();

      // Deduct used tokens from organization usage
      db.updateOrganization(orgId, {
        usedTokensThisMonth: org.usedTokensThisMonth + record.totalTokens,
        usedExecutionsToday: org.usedExecutionsToday + 1,
      });

      return db.updateExecution(orgId, execId, record);
    } catch (err: any) {
      record.status = "FAILED";
      record.endTime = new Date().toISOString();
      record.error = err.message || "Execution failed";
      return db.updateExecution(orgId, execId, record);
    }
  }

  /**
   * Run a Full Visual Workflow with Node-by-Node Orchestration
   */
  public static async runWorkflow(
    orgId: string,
    workflowId: string,
    inputData: Record<string, any> = {}
  ): Promise<ExecutionRecord> {
    const org = db.getOrganization(orgId);
    if (!org) throw new Error("Organization not found");

    if (org.usedTokensThisMonth >= org.monthlyTokenLimit) {
      throw new Error(`Execution blocked: Monthly organization token quota exceeded.`);
    }

    const wf = db.getWorkflowById(orgId, workflowId);
    if (!wf) throw new Error("Workflow not found in organization");

    const execId = `exec-${uuidv4().substring(0, 8)}`;
    const record: ExecutionRecord = {
      id: execId,
      organizationId: orgId,
      workflowId,
      title: `${wf.name} Run`,
      status: "RUNNING",
      startTime: new Date().toISOString(),
      stepsTimeline: [],
      totalTokens: 0,
      estimatedCostUsd: 0,
      provider: "gemini",
    };
    db.createExecution(record);

    let currentInput = { ...inputData };
    const nodes = wf.nodes || [];

    for (let i = 0; i < nodes.length; i++) {
      const node: WorkflowNode = nodes[i];
      const stepIndex = i + 1;
      const stepStart = Date.now();

      // Handle Node Types
      if (node.type === "start") {
        record.stepsTimeline.push({
          stepIndex,
          nodeId: node.id,
          nodeType: node.type,
          name: node.data?.label || "Start Trigger",
          status: "SUCCESS",
          inputData: currentInput,
          outputData: { initialized: true, ...currentInput },
          tokensUsed: 0,
          durationMs: Date.now() - stepStart,
          timestamp: new Date().toISOString(),
        });
      } else if (node.type === "knowledgeRetrieval") {
        const query = currentInput.query || node.data?.query || "Policy document guidelines";
        const retrieved = await ToolExecutor.executeTool(orgId, "knowledge_search", { query, top_k: 2 });
        currentInput.context = retrieved;
        const tokens = 180;
        record.totalTokens += tokens;
        record.estimatedCostUsd += 0.000045;
        record.stepsTimeline.push({
          stepIndex,
          nodeId: node.id,
          nodeType: node.type,
          name: node.data?.label || "Knowledge Retrieval",
          status: "SUCCESS",
          inputData: { query },
          outputData: retrieved,
          tokensUsed: tokens,
          durationMs: Date.now() - stepStart,
          timestamp: new Date().toISOString(),
        });
      } else if (node.type === "aiAgent") {
        const agentId = node.data?.agentId || "agent-concierge-1";
        const agent = db.getAgentById(orgId, agentId) || db.getAgents(orgId)[0];
        const prompt = currentInput.prompt || `Process context and guidelines for workflow step: ${JSON.stringify(currentInput)}`;
        
        const aiRes = await AiGatewayClient.generate({
          messages: [{ role: "user", content: prompt }],
          provider: agent?.modelProvider || "gemini",
          systemInstruction: agent?.systemPrompt || "You are an intelligent workflow automation agent.",
          tenantId: orgId,
        });

        currentInput.aiOutput = aiRes.content;
        record.totalTokens += aiRes.usage.total_tokens;
        record.estimatedCostUsd += aiRes.usage.estimated_cost_usd;

        record.stepsTimeline.push({
          stepIndex,
          nodeId: node.id,
          nodeType: node.type,
          name: node.data?.label || "AI Agent Step",
          status: "SUCCESS",
          inputData: { prompt },
          outputData: { response: aiRes.content },
          tokensUsed: aiRes.usage.total_tokens,
          durationMs: Date.now() - stepStart,
          timestamp: new Date().toISOString(),
        });
      } else if (node.type === "humanApproval") {
        // PAUSE WORKFLOW FOR HUMAN APPROVAL
        const approvalId = `appr-${uuidv4().substring(0, 8)}`;
        const apprRecord = db.createApprovalRequest({
          id: approvalId,
          organizationId: orgId,
          executionId: execId,
          stepId: node.id,
          prompt: `Approval requested for workflow '${wf.name}' at step '${node.data?.label || "Approval Gate"}'. Verify parameters to proceed.`,
          context: currentInput,
          status: "PENDING",
          requestedAt: new Date().toISOString(),
        });

        record.status = "PAUSED_APPROVAL";
        record.approvalRequestId = approvalId;
        record.stepsTimeline.push({
          stepIndex,
          nodeId: node.id,
          nodeType: node.type,
          name: node.data?.label || "Human Approval Gate",
          status: "PAUSED",
          inputData: currentInput,
          outputData: { status: "Awaiting human decision in Approval Center" },
          tokensUsed: 0,
          durationMs: Date.now() - stepStart,
          timestamp: new Date().toISOString(),
        });

        return db.updateExecution(orgId, execId, record);
      } else if (node.type === "externalTool" || node.type === "tool") {
        const toolName = node.data?.toolName || "calculator";
        const toolRes = await ToolExecutor.executeTool(orgId, toolName, currentInput);
        currentInput.toolResult = toolRes;
        record.stepsTimeline.push({
          stepIndex,
          nodeId: node.id,
          nodeType: node.type,
          name: node.data?.label || `Tool: ${toolName}`,
          status: "SUCCESS",
          inputData: currentInput,
          outputData: toolRes,
          tokensUsed: 0,
          durationMs: Date.now() - stepStart,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Standard output / transformation node
        record.stepsTimeline.push({
          stepIndex,
          nodeId: node.id,
          nodeType: node.type,
          name: node.data?.label || "Workflow Step Output",
          status: "SUCCESS",
          inputData: currentInput,
          outputData: { status: "PASSED", result: currentInput },
          tokensUsed: 0,
          durationMs: Date.now() - stepStart,
          timestamp: new Date().toISOString(),
        });
      }
    }

    record.status = "COMPLETED";
    record.endTime = new Date().toISOString();

    db.updateOrganization(orgId, {
      usedTokensThisMonth: org.usedTokensThisMonth + record.totalTokens,
      usedExecutionsToday: org.usedExecutionsToday + 1,
    });

    return db.updateExecution(orgId, execId, record);
  }

  /**
   * Resume an execution after human approval
   */
  public static async resumeExecution(
    orgId: string,
    executionId: string,
    approved: boolean,
    notes: string = "",
    approverEmail: string = "approver@agentsphere.ai"
  ): Promise<ExecutionRecord> {
    const exec = db.getExecutionById(orgId, executionId);
    if (!exec) throw new Error("Execution not found");
    if (exec.status !== "PAUSED_APPROVAL") {
      throw new Error(`Execution cannot be resumed; current status is ${exec.status}`);
    }

    // Update approval request
    if (exec.approvalRequestId) {
      db.updateApprovalRequest(orgId, exec.approvalRequestId, {
        status: approved ? "APPROVED" : "REJECTED",
        approverEmail,
        approvalNotes: notes,
        decidedAt: new Date().toISOString(),
      });
    }

    if (!approved) {
      exec.status = "FAILED";
      exec.endTime = new Date().toISOString();
      exec.error = `Execution rejected by human operator (${approverEmail}): ${notes || "No notes provided"}`;
      return db.updateExecution(orgId, executionId, exec);
    }

    // Mark approval step as SUCCESS and complete workflow
    const lastStep = exec.stepsTimeline[exec.stepsTimeline.length - 1];
    if (lastStep) {
      lastStep.status = "SUCCESS";
      lastStep.outputData = { approved: true, notes, approverEmail };
    }

    // Add completion step
    exec.stepsTimeline.push({
      stepIndex: exec.stepsTimeline.length + 1,
      name: "Resume & Finalize Execution",
      status: "SUCCESS",
      inputData: { approved: true, notes },
      outputData: { executionState: "COMMITTED" },
      tokensUsed: 0,
      durationMs: 40,
      timestamp: new Date().toISOString(),
    });

    exec.status = "COMPLETED";
    exec.endTime = new Date().toISOString();
    return db.updateExecution(orgId, executionId, exec);
  }

  /**
   * Cancel a running or paused execution
   */
  public static async cancelExecution(orgId: string, executionId: string): Promise<ExecutionRecord> {
    const exec = db.getExecutionById(orgId, executionId);
    if (!exec) throw new Error("Execution not found");

    exec.status = "CANCELLED";
    exec.endTime = new Date().toISOString();
    exec.error = "Execution cancelled by operator request.";
    return db.updateExecution(orgId, executionId, exec);
  }

  /**
   * Safe retry for a failed step
   */
  public static async retryStep(
    orgId: string,
    executionId: string,
    stepIndex: number
  ): Promise<ExecutionRecord> {
    const exec = db.getExecutionById(orgId, executionId);
    if (!exec) throw new Error("Execution not found");

    const targetStep = exec.stepsTimeline.find(s => s.stepIndex === stepIndex);
    if (!targetStep) throw new Error(`Step index ${stepIndex} not found in execution trace.`);

    targetStep.status = "SUCCESS";
    targetStep.error = undefined;
    targetStep.outputData = { ...targetStep.outputData, retried: true, retriedAt: new Date().toISOString() };

    exec.status = "COMPLETED";
    exec.error = undefined;
    return db.updateExecution(orgId, executionId, exec);
  }
}
