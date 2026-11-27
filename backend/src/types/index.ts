export type UserRole =
  | "ORGANIZATION_OWNER"
  | "AI_BUILDER"
  | "WORKFLOW_OPERATOR"
  | "AUDITOR"
  | "PLATFORM_ADMINISTRATOR";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  reservedTokens?: number;
  usageMonth?: string;
  usageDay?: string;
  id: string;
  name: string;
  plan: "free" | "pro" | "enterprise";
  monthlyTokenLimit: number;
  usedTokensThisMonth: number;
  dailyExecutionLimit: number;
  usedExecutionsToday: number;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  avatar: string;
  color: string;
  modelProvider: "gemini" | "mock";
  modelName: string;
  temperature: number;
  maxTokens: number;
  maxSteps: number;
  timeoutSeconds: number;
  knowledgeBaseIds: string[];
  toolPermissions: string[];
  humanApprovalRequired: boolean;
  isDraft: boolean;
  isArchived: boolean;
  systemPrompt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersion {
  id: string;
  organizationId: string;
  agentId?: string;
  versionNumber: number;
  title: string;
  templateText: string;
  inputVariables: string[];
  changeSummary: string;
  isPublished: boolean;
  createdAt: string;
}

export interface ToolItem {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  category: "utility" | "knowledge" | "api" | "transform";
  parameters: Record<string, any>;
  isEnabled: boolean;
  isSystemTool: boolean;
  endpointUrl?: string;
  timeoutMs: number;
  createdAt: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  animated?: boolean;
}

export interface Workflow {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  versionNumber: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "PAUSED_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface StepTrace {
  stepIndex: number;
  nodeId?: string;
  nodeType?: string;
  name: string;
  status: "SUCCESS" | "FAILED" | "PAUSED" | "RUNNING";
  inputData: any;
  outputData: any;
  toolCalls?: any[];
  tokensUsed: number;
  durationMs: number;
  timestamp: string;
  error?: string;
}

export interface ExecutionRecord {
  idempotencyKey?: string;
  checkpoint?: { cursor: string; context: Record<string, any>; workflow?: Workflow; agent?: Agent; prompt?: string; agents?: Record<string, Agent>; approvalGranted?: boolean; approvedAgentNodes?:string[]; pendingAgentNode?:string; };
  reservedTokens?: number;
  isFallback?: boolean;
  model?: string;
  output?: any;
  retryOf?: string;
  id: string;
  organizationId: string;
  workflowId?: string;
  agentId?: string;
  title: string;
  status: ExecutionStatus;
  startTime: string;
  endTime?: string;
  stepsTimeline: StepTrace[];
  totalTokens: number;
  estimatedCostUsd: number;
  provider: string;
  error?: string;
  approvalRequestId?: string;
}

export interface ApprovalRequest {
  id: string;
  organizationId: string;
  executionId: string;
  stepId: string;
  prompt: string;
  context: Record<string, any>;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approverUserId?: string;
  approverEmail?: string;
  approvalNotes?: string;
  requestedAt: string;
  decidedAt?: string;
}

export interface DocumentRecord {
  sourceBase64?: string;
  contentHash?: string;
  error?: string;
  embeddingModel?: string;
  id: string;
  organizationId: string;
  filename: string;
  fileType: string;
  fileSizeBytes: number;
  totalChunks: number;
  totalCharacters: number;
  status: "INDEXED" | "PROCESSING" | "FAILED";
  uploadedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  timestamp: string;
}

export interface SubscriptionInvoice {
  id: string;
  organizationId: string;
  plan: "free" | "pro" | "enterprise";
  amountUsd: number;
  status: "PAID" | "PENDING";
  billingPeriod: string;
  invoiceDate: string;
  tokenUsage: number;
}
