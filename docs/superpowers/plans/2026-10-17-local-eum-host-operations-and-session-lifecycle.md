# 로컬이음 호스트 운영센터 및 회차 운영 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬이음 HOST가 자기 체험·회차·신청을 운영하고, 회차/체험 취소가 기록을 보존하면서 안전하게 반영되도록 한다.

**Architecture:** 기존 `/local-eum/host/profile` 진입점을 운영센터 화면으로 확장하고 현재 RLS 범위의 데이터만 조회한다. 회차 INSERT와 취소 상태는 검토용 SQL에 owner guard와 원자적 RPC로 정의하고, React는 성공 결과를 DB에서 재조회한다. AI 진단은 Edge Function 연결 문제를 분류해 설명하되 서버 키를 노출하지 않는다.

**Tech Stack:** React, React Router, Supabase JS, PostgreSQL/PLpgSQL, Node `node:test`, Vite, Oxlint.

**Spec:** `docs/superpowers/specs/2026-10-17-local-eum-host-operations-and-session-lifecycle-design.md`

## Global Constraints

- 기존 체험, 호스트, 신청, 결제 행을 새로 생성하거나 삭제하지 않는다.
- 검토용 SQL은 대상 프로젝트 `rhkaxmqdkztpbljkunxb`와 현재 제약/정책 이름 및 소유 관계를 검사한다. 예상과 다른 상태이면 트랜잭션을 중단한다.
- 원격 Supabase SQL 적용은 사용자가 SQL 전문과 대상 프로젝트를 확인한 뒤 별도 승인해야 한다.
- `Header`, `App.jsx`, Oracle 관련 파일, 기존 커밋 및 기존 미커밋 작업은 수정하지 않는다.
- 커밋, push, merge, 이미지 교체는 이 작업에 포함하지 않는다.
- 회차 취소는 해당 회차만 취소하고 신청 내역을 보존한다.
- 체험 취소는 체험과 시작 전 회차를 한 트랜잭션으로 취소하고 신청/결제 기록은 보존한다.
- 신청 승인, 거절, 연락 이력은 구현하지 않는다.
- API 키, 토큰, Authorization 헤더와 민감 요청 내용을 UI·로그·문서에 노출하지 않는다.

---

## File Map

- Modify `src/pages/local-eum/sessionRepository.js`: 회차 생성/취소 RPC 및 구체적인 권한/제약 오류 메시지.
- Modify `src/pages/local-eum/SessionEdit.jsx` and `SessionEdit.css`: 회차 취소 CTA를 눈에 띄게 유지하고 전체 체험 취소 확인 및 결과를 연결한다.
- Modify `src/pages/local-eum/HostProfileEdit.jsx` and related CSS: 현재 경로에서 운영 요약, 내 체험, 신청함, 프로필 편집을 표시한다.
- Modify `src/pages/local-eum/components/AiExperienceAgent.jsx`: edge invocation/network/configuration failure를 안전하게 사용자용 상태로 분류한다.
- Create `src/pages/local-eum/hostOperations.js` and `.test.js`: 운영센터 조회 결과의 소유 체험별 집계/표시 모델을 순수 함수로 만든다.
- Create `docs/local-eum/migrations/20261017_host_operations_lifecycle.review.sql`: 소유자 전용 초안 회차 INSERT 정책, 필요한 상태 제약, 원자적 체험 취소 RPC 및 검증 쿼리.
- Create/modify focused tests alongside repositories/components where Node-compatible pure logic is practical.
- Do not modify `src/App.jsx`, shared `Header`, Oracle files, or unrelated pre-existing work.

## Task 1: Review SQL lifecycle migration

**Files:**
- Create: `docs/local-eum/migrations/20261017_host_operations_lifecycle.review.sql`
- Read: `docs/local-eum/migrations/20261017_session_lifecycle.review.sql`
- Read: `docs/local-eum/migrations/20261017_experience_applications.applied.sql`

**Interfaces:**
- Produces a transaction guarded by target project marker/schema predicates; if expected tables, constraint definitions, policy names, or host ownership rows differ, raises an exception before altering data.
- Adds `CANCELLED` to session and experience status constraints only after asserting the inspected exact current definitions.
- Provides an owner-scoped `lc_cancel_experience(bigint)` transaction that verifies the authenticated HOST owns the experience, marks it `CANCELLED`, and marks only its not-yet-started sessions `CANCELLED` atomically.
- Preserves all application/payment rows and does not create notifications or refund effects.
- Adds an INSERT policy and narrow grants permitting only an authenticated owner HOST to insert `DRAFT` sessions for their experience.

- [x] **Step 1: Write preflight queries and exact guards**

Include read-only checks for project identity (`current_database()`, Supabase project setting if available), target tables, current status constraint definitions, session INSERT/UPDATE policies, application RPC signature, and experience ownership rows. Make the migration raise if a required object or exact expected predicate differs.

- [x] **Step 2: Define atomic cancellation and restricted grants**

Use `SECURITY DEFINER` only for the narrowly scoped cancellation RPC, set a fixed empty `search_path`, fully qualify every relation/function, lock the owned experience row before updating it, and revoke execution from `public` before granting only to `authenticated`. Check `auth.uid()` and `lc_private.lc_owns_experience()` inside the function.

- [x] **Step 3: Review without applying remotely**

Compare all columns, status checks and helper signatures to current checked-in migration/schema sources. Run a SQL parser or repository validation if available. Keep the file explicitly labeled review-only and do not call Supabase DDL tools.

## Task 2: Safe session create and cancellation feedback

**Files:**
- Modify: `src/pages/local-eum/sessionRepository.js`
- Modify: `src/pages/local-eum/SessionEdit.jsx`
- Modify: `src/pages/local-eum/SessionEdit.css`
- Test: `src/pages/local-eum/sessionLifecycle.test.js`

**Interfaces:**
- `createSession(userId, experienceId, payload)` remains owner-scoped and returns the inserted session only after Supabase returns a row.
- `cancelSession(sessionId, userId, expectedUpdatedAt)` uses an owner-scoped update with optimistic concurrency; `SESSION_LIFECYCLE_SCHEMA_REQUIRED`, `42501`, and stale-row cases map to actionable Korean messages.
- New `cancelExperience(experienceId, userId)` invokes `lc_cancel_experience` and returns the database's updated experience and canceled future sessions.

- [x] **Step 1: Add pure tests for session state/error mapping**

Test that cancelled status is rendered as unavailable, a constraint-missing error points to the review migration, permission errors identify owner policy, and stale rows request refresh. Do not assert Supabase internals through implementation-mirroring tests.

- [x] **Step 2: Implement cancellation repository call**

Call the SQL RPC with only experience ID; do not accept caller user ID as an authority. Keep client-side HOST session check for early messaging, but rely on database auth/ownership validation.

- [x] **Step 3: Add explicit experience cancellation UI**

Place an “체험 운영 취소” action beside the existing per-session cancel action, show the consequence in `window.confirm`, disable while dirty/saving, then show success and update local experience/session statuses from the RPC result.

- [x] **Step 4: Verify create result and selector refresh**

After creating a draft session, reload the owner's sessions and verify that the inserted ID exists before navigating. If the refresh omits the row, remain on the current page and display a recoverable error rather than navigate to a nonexistent session.

- [x] **Step 5: Run session lifecycle tests**

Run `node --test src/pages/local-eum/sessionLifecycle.test.js` and add focused tests for any new pure helper used by the repository.

## Task 3: Host Operations Center

**Files:**
- Modify: `src/pages/local-eum/HostProfileEdit.jsx`
- Modify: `src/pages/local-eum/SessionEdit.css` or a focused `HostOperations.css`
- Create: `src/pages/local-eum/hostOperations.js`
- Create: `src/pages/local-eum/hostOperations.test.js`
- Read: `src/pages/local-eum/sessionRepository.js`, `src/pages/local-eum/applicationRepository.js`

**Interfaces:**
- `buildHostOperationsModel(experiences, applications)` returns owned experience count, active session count, pending application count, and UI rows; it derives no approve/reject or contact-history fields.
- Repository reads use the existing authenticated client and RLS. The model does not infer ownership from user-supplied IDs.

- [x] **Step 1: Add model tests**

Cover empty data, multiple owned experiences and sessions, canceled sessions excluded from active counts, and PENDING applications grouped by session/experience. Preserve stable sorting by upcoming start time.

- [x] **Step 2: Load owner experiences and applications**

Use existing repository functions where available. Query only fields required by the dashboard and filter to returned owned session IDs; do not query all applications with service credentials or create new RLS bypasses.

- [x] **Step 3: Render operations sections at existing route**

Show summary cards, “내 체험” with links to session editor, “내 신청함” with current status and attendee/date information, and the existing host-profile editor. Include loading, empty, unauthenticated, and access-denied states.

- [x] **Step 4: Validate HOST isolation**

Use a repository test stub to verify requested IDs originate from the signed-in user's loaded owner experiences. Perform read-only Supabase checks for policy definitions; do not impersonate another HOST or mutate live data.

## Task 4: AI diagnostic errors

**Files:**
- Modify: `src/pages/local-eum/components/AiExperienceAgent.jsx`
- Modify: `src/pages/local-eum/components/AiExperienceAgent.css`
- Test: focused pure diagnostic classifier test if classifier can be kept independent of Supabase SDK.

**Interfaces:**
- `classifyAgentInvocationError(error)` returns one of `FUNCTION_NOT_DEPLOYED`, `ORIGIN_BLOCKED`, `AUTH_REQUIRED`, `UPSTREAM_FAILURE`, `NETWORK_FAILURE`, or `UNKNOWN`, with a localized safe message.
- The classifier never serializes arbitrary headers, tokens, request bodies, or raw server payloads into visible copy.

- [x] **Step 1: Add classifier cases**

Cover 404/function not found, CORS/network `Failed to send a request`, 401/403, 429, 5xx, and unknown failures. Ensure messages point to the right operator action.

- [x] **Step 2: Use the classifier in the AI panel**

Show a distinct function deployment notice for the known missing function route and preserve a retry action for transient errors. Avoid displaying a raw exception that could contain sensitive data.

- [x] **Step 3: Verify function locally and report deploy blocker**

Run existing `supabase/functions/local-eum-agent` tests. Check local CLI auth state without printing access tokens. If unauthenticated, give the user the exact `npx supabase login` and `npx supabase functions deploy local-eum-agent --project-ref rhkaxmqdkztpbljkunxb --use-api` commands to run locally; do not report the remote function as deployed.

## Task 5: Full verification and handoff

**Files:**
- Read-only: all files in `git status --short` before and after.

- [x] **Step 1: Run focused test suites**

Run session lifecycle, host operations model, and Supabase Edge Function tests. Inspect each exit code and summarize existing vs new failures.

- [x] **Step 2: Run lint and build**

Run `npm run lint` and `npm run build`. Do not edit unrelated files to silence old warnings.

- [x] **Step 3: Review diffs and status boundaries**

Confirm `App.jsx`, shared Header and Oracle paths are unchanged, previous staged/unstaged/untracked files remain untouched, and only task-specific new files are untracked. Do not stage, commit, push, or apply remote SQL.

- [x] **Step 4: Report concrete external steps**

Provide the review SQL path and explicitly state remote SQL is not applied. If CLI deployment cannot run, give its exact blocker and commands. Report local verification evidence and known pre-existing build warnings.

## Self-review

- Spec coverage: AI diagnostic in Task 4; create/cancel and transactional SQL in Tasks 1–2; owner-scoped dashboard and applications in Task 3; no approval/history invented; tests, lint, build, and git boundaries in Task 5.
- Placeholder scan: all tasks state concrete files, interfaces, commands, and expected behaviors; no TBD/TODO steps are present.
- Type consistency: the experience cancellation RPC accepts only `experienceId`; React calls `cancelExperience(experienceId, userId)` for the client session check, and repository sends only the experience ID to Supabase. `buildHostOperationsModel` receives loaded owner experiences and their readable applications.
