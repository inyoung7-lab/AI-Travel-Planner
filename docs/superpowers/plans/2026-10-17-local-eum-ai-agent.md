# Local Eum AI Experience Agent Implementation Plan

**Goal:** Deliver an executable, locally testable HOST Agent using LLM tool calls and cited retrieval, with React integration, while leaving remote deployment for explicit approval.

**Architecture:** A Supabase Edge Function authenticates an approved HOST using their JWT and RLS-scoped database client. A pure orchestration module owns Codyssey Chat Completions tool calls, argument validation, bounded execution, RAG search, numeric evaluation, cost calculation, and report validation. The existing session editor embeds a separate React Agent panel and only copies a reviewed plan into the unsaved experience description draft.

**Tech Stack:** React 19, Supabase Auth/PostgREST/Edge Functions, Deno 2, Codyssey COPA OpenAI-compatible Chat Completions API, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-17-local-eum-ai-agent-design.md`

## Constraints

- No Supabase SQL, Storage changes, Edge deployment, external API purchase/secret configuration, Git staging/commit/push.
- Preserve all current staged/unstaged `hykang` work and Local Eum ko/en/ja behavior.
- Do not edit common Header, App, Express/Oracle, or other team features.
- Logs contain tool name, duration, outcome and count only; no input text, JWT or API key.

## Tasks

- [x] Add cited regional knowledge corpus and deterministic retrieval, value-scoring and cost tools.
- [x] Implement bounded agent loop with strict tool schemas, argument checks, report schema validation and trace.
- [x] Implement Edge HTTP handler with JWT, HOST role, ownership checks, per-isolate rate limit, locale and input bounds.
- [x] Embed analysis/planning panel into `SessionEdit.jsx` with explicit draft handoff.
- [x] Add mocked-model tests for actual tool dispatch, RAG citations, malformed output, cross-host guard, four scenarios and ko/en/ja request validation.
- [x] Validate with Deno check, targeted Node tests, `npm run build`, `npm run lint`, `git diff --check` (rerun after final edits).
- [x] Document secrets, local execution, deployment checkpoint, five-user test script and capstone evidence gaps.
