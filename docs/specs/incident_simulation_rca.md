# Verified incident findings ? 27 November 2026

## Cross-tenant organization switch
The original endpoint permitted any signed-in user to change organization. The fix checks membership, limits ordinary users to their own organization, and retains cross-tenant administration only for the explicit platform role. Regression tests reject switch and resource reassignment attacks.

## Privileged public signup
Public signup originally accepted an arbitrary role. Strict server validation now rejects the field and assigns organization-owner only in a newly created tenant. The regression attempts PLATFORM_ADMINISTRATOR and receives 400.

## Approval skipped work and queue resume stalled
The original engine marked approvals complete without executing subsequent nodes. Checkpoints now retain the graph, context, and cursor. A deployed verification exposed a second defect: BullMQ reused the completed pause job ID. Job IDs now include checkpoint progress. The deployed API report verifies an approval followed by a real calculator result of 42.

## Retired model and provider outage
The initial Gemini model returned HTTP 404. Live model verification selected gemini-3.1-flash-lite. Real RAG inference is verified. A multi-step tool run executed calculator correctly (323), then encountered an upstream timeout. The execution failed explicitly; it was not presented as a successful AI result. Provider latency remains an external operational limit.

## Runaway loops, quotas, and unsafe tools
Backend regression tests force repeated tool calls and stop at the configured step budget. Token headroom and daily execution limits are tested before provider invocation. Calculator rejects code, malformed expressions and division by zero. Disabled and foreign-tenant tools cannot be borrowed.

## Credential handling and backup
Refresh rotation rejects replay, API keys enforce scopes and revocation, and credentials use authenticated encryption. A real Neon backup was encrypted and restored to an isolated schema; all 15 table counts matched before the verification transaction was rolled back.

No invented token spike, fabricated outage timeline, or unmeasured performance claim is included here.
