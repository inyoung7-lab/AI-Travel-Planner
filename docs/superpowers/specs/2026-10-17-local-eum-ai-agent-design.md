# Local Eum AI Experience Agent — design

**Date:** 2026-10-17  
**Status:** User-directed implementation; remote deployment and secrets remain separate approvals.

## Purpose

An approved HOST can diagnose one of their own Local Eum experiences or a new idea. A model calls server-controlled read-only tools to compare existing experiences, retrieve cited local knowledge, score customer value, and calculate revenue/cost scenarios. It returns two or more distinct improvement directions and can elaborate the HOST's chosen direction into an editable operating plan. The result is an AI suggestion, never an approved product or a database update.

## Architecture

The React host session editor embeds a small AI work area. It sends the current Supabase user JWT through `supabase.functions.invoke('local-eum-agent')`. A separate Supabase Edge Function verifies the user and HOST role, resolves their host ID server-side, and checks that an existing experience belongs to them. It uses a Supabase client scoped to that user's JWT so table RLS still applies. The function calls Codyssey COPA's OpenAI-compatible Chat Completions endpoint with four allowlisted function tools. Tool arguments are validated on the server before execution. A hard limit bounds model turns, tool calls, output tokens, request text, and per-isolate request frequency. The Codyssey key exists only in Edge secrets.

The RAG corpus is a checked-in, small set of regional facts with title, source URL and verification date. Retrieval ranks relevant records and supplies their text as lower-trust data. The model cites only source IDs actually returned by retrieval. The report explains when verified evidence or direct cost figures are unavailable. Existing DB records can be read even before the optional translation migration.

The same Edge Function serves `analyze` and `plan`. `plan` receives the selected improvement direction as user input and executes a fresh tool cycle. The HOST can edit the returned operating plan in React and explicitly copy its detailed description into the existing experience editor draft. No AI result is saved automatically.

## Boundaries and evidence

- Existing `hykang` changes, HOST #500's ten experiences, HOST #501's two experiences, shared Header, App routing, Express/Oracle server, sessions, and places are untouched.
- The function queries only current schema columns. Missing translation columns do not affect it.
- A local mocked model test proves provider request conversion, tool-call orchestration, RAG citation filtering, authorization guard contracts, output validation, and the four requested business scenarios. Actual Codyssey connectivity cannot be claimed without an API key and a function run.
- No SQL migration is needed for the MVP. Deploying the Edge Function and configuring its secret require separate approval. The in-memory rate limit is per Edge isolate; a durable/global quota needs a later approved datastore.

## Acceptance

1. Server-side HOST auth and ownership checks reject cross-host experience IDs.
2. Real model requests use Chat Completions function calls; only named, validated, read-only tools run.
3. Existing and new-idea flows use actual experience lookup plus ranked RAG documents, deterministic scoring and cost arithmetic.
4. Model output is validated and reports citation IDs/URLs from retrieved evidence only.
5. React shows progress, failure/retry, ko/en/ja result language, alternative comparison, operating plan, HOST editing, and explicit handoff to the existing editor draft.
6. Tests and logs distinguish mocked orchestration from actual API calls; build and lint pass.
