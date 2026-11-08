# Model-selected Local Eum tools — implementation plan

**Goal:** Replace the fixed four-tool sequence with bounded, model-selected actions while preserving HOST authorization, read-only tools and the existing report UI.

**Approved scope:** User approved continuing the Agent improvement on main. Keep the current Chat Completions proxy, which does not support native tool calls. This plan is the implementation specification; no database schema changes, credential changes, commits or pushes are included. Remote function deployment requires a separate review of the completed changes.

**Architecture:** The model returns one JSON action: a named tool with object arguments and a short reason, or finish. The server validates and executes only its four allowlisted tools and passes the result back before the next selection. Evaluation and cost outputs remain mandatory for the report; searches are optional and may be refined. Neither a tool order nor invented tool results are supplied by the server.

**Limits:** Six executed tools; two executions per tool; seven selection rounds; one final report; 90 seconds for the model/tool loop. The per-model-request timeout is at most 30 seconds and never exceeds the remaining budget. Log only tool names, counts, durations and diagnostic codes. Return redacted selection reasons to the HOST UI. Preserve JWT/HOST/approval/ownership checks, citation validation and trusted fee calculations.

## Execution in this workspace

1. Update `agent-core.test.mjs` to use model-selected sequences and explicit finish. Verify reordered, skipped and repeated searches; reject unlisted/multiple calls, bad arguments, early finish loops, excessive calls and elapsed budgets. Retain authorization, citation and cost tests. Run the tests before changing the core and confirm failures.
2. Update `codyssey-client.test.mjs` for JSON tool/finish choices and arbitrary tool rejection. Change `codyssey-client.mjs` to describe all allowed tools to plain chat and parse the selected name instead of accepting a forced name. Preserve response/credential masking.
3. Replace the fixed loop in `agent-core.mjs` with the bounded selection loop. Feed missing required output feedback back to the model without selecting its next tool. Preserve the final report format. Add execution metadata and return selection reasons in the trace.
4. Map `AGENT_LIMIT` to HTTP 422 in `index.ts`, add localized safe frontend copy, and render ordered traces with distinct keys and optional reasons in `AiExperienceAgent.jsx`. Old deployed traces without reasons remain compatible.
5. Run `node --test supabase/functions/local-eum-agent/*.test.mjs`, related frontend tests, `npm run build`, `npm run lint` and `git diff --check`. Review the diff for changes outside Local Eum. Record that mock tests do not establish deployed HOST/model success.
6. Update `docs/local-eum/ai-agent-runbook.md` with the new contract, limits, local test results and the pending deployment step. After deployment approval, verify the target project, deploy the function, test existing/idea/plan flows with an approved HOST, and inspect tool traces. Actual two-scenario evidence from the preceding deployed version must not be relabeled as evidence of this new version.
