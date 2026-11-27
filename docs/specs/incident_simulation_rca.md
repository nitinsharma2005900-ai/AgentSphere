# Assessment 15 – AI Incident Simulation & Root Cause Analysis (RCA)

**Platform:** AgentSphere – Enterprise Multi-Tenant AI Agent & Workflow Platform  
**Incident Simulation Date:** 2026-11-27  
**Severity Level:** P1 / Critical Simulation  
**Scope:** Token-Cost Spikes, Runaway Agent Loops, Provider Outage, Cross-Tenant Retrieval, Incorrect Tool Execution

---

## Incident Scenario 1: Runaway Agent Recursive Loop & Token-Cost Spike

### Incident Description
An autonomous agent configured without execution boundary limits entered a cyclic reasoning loop while resolving ambiguous data format queries, consuming 1.2M tokens in under 90 seconds.

### Root Cause Analysis (RCA)
- **Root Cause:** Absence of hard step-budget limits and indefinite retry parameters in workflow node definitions.
- **Trigger:** Upstream JSON formatting variance triggered repeated agent retries without backoff or step increment guards.
- **Impact:** Organization monthly quota burned at accelerated velocity.

### Implemented Prevention & Mitigation
1. **Server-Side Hard Step Budgets:** Enforced `maxSteps: 15` hard constraint in `ExecutionEngine.ts`. The orchestrator terminates runaway executions with `status: "FAILED"` if the threshold is breached.
2. **Quota Pre-Flight Check:** Before any model call or tool step is dispatched, `SafetyGuardrail.validate_spending_limits` verifies token headroom against the organization's tier limits.
3. **Execution Observatory Timeout:** Hard execution timeout of 60 seconds (`config.limits.executionTimeoutMs`) guarantees long-running hanging calls are halted.

---

## Incident Scenario 2: Primary AI Provider (Gemini API) Transient Outage

### Incident Description
Upstream Google Gemini API returned `503 Service Unavailable` / `429 RateLimitExceeded` during an infrastructure burst.

### Root Cause Analysis (RCA)
- **Root Cause:** External upstream cloud outage / regional capacity spike.
- **Impact:** If unhandled, client workflows would abruptly crash without graceful degradation or explanation.

### Implemented Prevention & Mitigation
1. **Exponential Backoff & Retries:** `GeminiProvider.ts` implements a 3-attempt exponential backoff loop (1s, 2s, 4s).
2. **Controlled Secondary Mock Provider Failover:** If all retries fail, `ProviderGateway` fails over to the `DeterministicMockProvider`, prepending an explicit `[Fallback Notice: Gemini upstream unavailable]` header.
3. **Transparency Guardrail:** AgentSphere NEVER silently fakes a successful real Gemini response. Responses in fallback mode carry `is_fallback: true` and are clearly labeled on client dashboards.

---

## Incident Scenario 3: Cross-Tenant Vector Retrieval Spoofing Attempt

### Incident Description
A malicious actor in Tenant B attempted to query document chunks belonging to Tenant A by spoofing `tenant_id` parameters in API headers.

### Root Cause Analysis (RCA)
- **Root Cause:** Reliance on client-supplied parameters rather than cryptographically verified JWT session claims.
- **Impact:** Risk of unauthorized exposure of confidential merger and financial records across organizations.

### Implemented Prevention & Mitigation
1. **Cryptographic Server-Side Tenant Extraction:** The backend extracts `req.user.organizationId` strictly from the verified JWT signature.
2. **enforceTenantIsolation Middleware:** Any mismatch between URL parameters, request bodies, and the authenticated JWT tenant ID returns an immediate `403 Forbidden: Tenant Isolation Violation`.
3. **Vector Store Scoping:** The `TenantVectorStore` in Python indexes embeddings in segregated tenant dictionaries (`self._stores[tenant_id]`), making cross-tenant retrieval mathematically impossible.
4. **Automated Negative Tests:** Verified by automated test suites in `backend.test.ts` and `test_ai_gateway.py`.

---

## Incident Scenario 4: Unauthorized External Tool SSRF Execution

### Incident Description
An AI agent attempted to invoke a registered tool with URL `http://169.254.169.254/latest/meta-data/` to probe internal cloud instance metadata.

### Root Cause Analysis (RCA)
- **Root Cause:** Unvalidated external URL parameters allowed arbitrary network requests.
- **Impact:** Server-Side Request Forgery (SSRF) risk.

### Implemented Prevention & Mitigation
1. **SSRF Blocking Filter:** In `ToolExecutor.ts`, hostnames matching `localhost`, `127.0.0.1`, `169.254.169.254`, and private CIDR ranges are immediately blocked with a security exception.
2. **Tool Allowlist Guardrail:** Agents can only execute tools explicitly listed in their `toolPermissions` array.
3. **Sandboxed Calculator:** Arithmetic formulas are parsed strictly with regex `[^0-9+\-*/().\s]` before evaluation, eliminating arbitrary shell execution risks.
