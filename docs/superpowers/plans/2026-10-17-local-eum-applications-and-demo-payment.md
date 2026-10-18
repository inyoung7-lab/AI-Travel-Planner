# 로컬이음 참가 신청 및 시연 결제 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 모든 공개 로컬이음 체험의 모집 회차에서 로그인 사용자와 비회원이 신청하고, 접수번호와 실제 입금이 불가능한 시연용 가상계좌 표기를 확인하게 한다.

**Architecture:** 신청 및 시연 결제 레코드는 검토용 Supabase SQL 마이그레이션으로 추가하고, `SECURITY DEFINER` RPC 한 번으로 신청·정원 임시 보류·시연 결제를 원자적으로 생성한다. 기존 상세 페이지 안에 신청 화면과 결과 화면을 연결해 `App.jsx` 라우트 변경을 피하고, Auth 세션이 있는 경우에만 현재 Supabase 사용자 ID를 서버 함수가 연결한다.

**Tech Stack:** React 19, React Router 7, Supabase JS 2, PostgreSQL PL/pgSQL, Node.js `node:test`, Vite, Oxlint.

**Spec:** `docs/superpowers/specs/2026-10-17-local-eum-applications-and-demo-payment-design.md`

## Global Constraints

- 적용 범위는 현재 공개된 시연 체험 12개의 모집 중 회차 전체다.
- 신청 접수는 결제 또는 참가 확정이 아니다.
- `DEMO-` 표시 번호는 은행이 발급한 가상계좌가 아니며 입금할 수 없다.
- 카드 결제는 비활성 상태로 표시하고 카드 정보 입력을 받지 않는다.
- 신청 생성은 `lc_submit_experience_application` RPC를 사용하고 클라이언트에서 신청 테이블에 직접 쓰지 않는다.
- 로그인 사용자 ID는 요청 인자로 받지 않고 서버에서 `auth.uid()`로 읽는다.
- 정원 검사는 회차 행 잠금 아래 수행하고, 신청당 인원은 1명 이상이며 남은 좌석을 넘지 않는다.
- 유효 기간은 접수 후 24시간이다. 만료된 시연 신청은 정원 계산에서 제외한다.
- 호스트는 자신의 체험 신청 연락 정보만 조회할 수 있으며, 비회원은 공개 SELECT로 신청을 조회할 수 없다.
- 개인정보 안내 버전과 동의 시각을 저장한다. 실제 운영 전 개인정보 보유 기간과 만료 데이터 삭제 절차를 안내해야 한다.
- 서비스 키, 실제 카드 정보, 실제 은행 계좌 정보는 브라우저에 노출하거나 저장하지 않는다.
- 공통 Header, `src/App.jsx`, Oracle 관련 파일은 수정하지 않는다.
- 원격 Supabase 적용은 SQL 검토와 별도 명시 승인을 받은 뒤 진행한다.
- 기존 미커밋 파일은 이번 변경과 구분하고, 사용자 최종 승인 전 커밋·Push하지 않는다.

---

## File Map

- Create `docs/local-eum/migrations/20261017_experience_applications.applied.sql`: 신청·결제 테이블, 인덱스, RLS, grants, 안전한 접수 RPC와 검증 쿼리.
- Create `src/pages/local-eum/applicationValidation.js`: 신청 입력 검증과 RPC 오류의 사용자 메시지 변환.
- Create `src/pages/local-eum/applicationValidation.test.js`: 순수 검증 함수와 오류 변환의 `node:test` 사례.
- Create `src/pages/local-eum/applicationRpcPayload.js`: 입력 데이터를 SQL RPC의 고정 `p_*` 매개변수 객체로 변환하는 순수 함수.
- Create `src/pages/local-eum/applicationRpcPayload.test.js`: RPC 이름에 대응하는 매개변수 이름, 정규화, 필드 전달을 `node:test`로 확인한다.
- Create `src/pages/local-eum/applicationRepository.js`: Supabase RPC 호출과 결과 정규화. 입력 매개변수는 순수 payload 함수에 위임한다.
- Modify `src/pages/local-eum/experienceRepository.js`: 여행자 공개 회차 조회에 `recruit_deadline`을 포함한다.
- Create `src/pages/local-eum/components/ExperienceApplicationFlow.jsx`: Auth 초기화, 로그인/비회원 신청 폼, 제출 상태, 결과와 결제 안내 렌더링.
- Modify `src/pages/local-eum/ExperienceDetail.jsx`: `?apply=1` 검색 파라미터로 신청 화면을 표시하고 선택된 회차·상세로 돌아가는 경로를 유지한다.
- Modify `src/pages/local-eum/components/ExperienceDetailContent.jsx`: 모집 가능한 회차에 신청 버튼을 표시하고, 체험·회차 시연 상태와 가격을 신청 컴포넌트에 전달한다.
- Create `src/pages/local-eum/components/ExperienceApplication.css` and import it from the application flow: 신청 양식, 결제 선택, 접수 결과, 오류와 모바일 레이아웃 스타일을 분리한다.

## Task 1: 검토용 신청 및 시연 결제 마이그레이션

**Files:**
- Create: `docs/local-eum/migrations/20261017_experience_applications.applied.sql`

**Interfaces:**
- Produces: `public.lc_applications`, `public.lc_application_payments`, `public.lc_submit_experience_application(bigint,text,text,text,text,integer,text,text,boolean) returns jsonb`.
- RPC parameters in order: `p_session_id`, `p_name`, `p_email`, `p_phone`, `p_contact_language`, `p_attendee_count`, `p_note`, `p_privacy_notice_version`, `p_privacy_consent`.
- RPC returns only the new receipt result: `application_id`, `receipt_code`, `session_id`, `experience_title`, `starts_at`, `ends_at`, `attendee_count`, `unit_fee_amount`, `total_amount`, `payment_status`, `demo_reference`, `expires_at`.

- [x] **Step 1: Create both tables with explicit constraints**

  Define generated identity primary keys; foreign keys to `lc_sessions` and `lc_applications`; required applicant name/email and contact language; optional phone/note; nullable Auth UUID; attendee count >= 1; nonnegative stored totals; unique receipt code; `PENDING` application and `DEMO_ONLY` payment state checks; fixed 24-hour expiry; and a `privacy_notice_version` plus consent timestamp. Store the demo reference as text with a `DEMO-` prefix, never as a bank account field. Add indexes for session/status/expiry, authenticated applicant, host session lookup, and payment/application lookup.

- [x] **Step 2: Add owner-only RLS and narrow function grants**

  Enable RLS. Revoke direct anonymous table access and direct insert/update/delete from `anon` and `authenticated`. Allow authenticated applicants to select their own Auth-linked application and payment; allow an approved HOST to select applications only when `lc_private.lc_owns_experience()` matches the application’s session experience; allow ADMIN according to the existing `lc_private.lc_has_role('ADMIN')` policy. Do not create an anonymous select policy. Grant only RPC execution to `anon, authenticated`, and set its `search_path` to empty with all relations fully qualified.

- [x] **Step 3: Implement the atomic RPC checks and writes**

  Reject missing consent, malformed or oversized name/email/phone/note/language/version, and attendee counts below one. Lock the selected `lc_sessions` row with `FOR UPDATE`, join its experience/template/host, then reject a missing or non-public experience, non-`RECRUITING` session, passed deadline, already-started session, or invalid fee/capacity. Sum attendee counts for unexpired `PENDING` applications on that session; reject if the new count exceeds remaining capacity. Use `auth.uid()` for `auth_user_id`, calculate `total_amount` from the locked session fee, generate unique receipt and `DEMO-` values with `gen_random_bytes`, set expiry to `now() + interval '24 hours'`, then insert the application and `DEMO_ONLY` payment together and return the result fields above. Catch no errors that would turn failed validation into a successful receipt.

- [x] **Step 4: Add read-only preflight and postflight queries in SQL comments**

  Include queries to confirm both tables, RLS flags, function signature/grants, constraints, and existing application count before and after application. The initial draft was reviewed, then applied only after separate user approval; record preflight and postflight outcomes.

- [x] **Step 5: Review the SQL against local schema definitions**

  Compare each referenced column and helper function to `docs/local-eum/initial_schema.draft.sql` and `docs/local-eum/migrations/20261016_demo_catalog.draft.sql`. Run a repository search for every column in the draft. Fix any guessed schema assumptions before proceeding. Do not apply to remote Supabase before separate approval. The approved SQL was later applied to the specified project.

## Task 2: Input rules and RPC repository

**Files:**
- Create: `src/pages/local-eum/applicationValidation.js`
- Create: `src/pages/local-eum/applicationValidation.test.js`
- Create: `src/pages/local-eum/applicationRpcPayload.js`
- Create: `src/pages/local-eum/applicationRpcPayload.test.js`
- Create: `src/pages/local-eum/applicationRepository.js`
- Modify: `src/pages/local-eum/experienceRepository.js`

**Interfaces:**
- Produces `validateApplicationInput(input, session, privacyNoticeVersion) -> { valid, errors }`.
- Produces `applicationErrorMessage(error) -> string`.
- Produces `toApplicationRpcPayload(input) -> { p_session_id, p_name, p_email, p_phone, p_contact_language, p_attendee_count, p_note, p_privacy_notice_version, p_privacy_consent }`.
- Produces `submitExperienceApplication(input, db = supabase) -> Promise<ReceiptResult>`; calls RPC `lc_submit_experience_application` with `toApplicationRpcPayload(input)`.
- Consumes the migration RPC result contract from Task 1.

- [x] **Step 1: Test valid and invalid form input**

  Use `node:test` and `node:assert/strict`. Assert valid Korean name/email/language/consent passes; blank name, malformed email, missing consent, invalid language, attendee count 0, attendee count above the session capacity, and over-limit note fail with field-specific errors. The database RPC, not client validation, decides whether enough seats remain at submission time.

- [x] **Step 2: Run the validation tests and verify they fail**

  Run: `node --test src/pages/local-eum/applicationValidation.test.js`
  Expected: FAIL because the validation module does not exist yet.

- [x] **Step 3: Implement validation and safe error messages**

  Keep validation pure and do not trust client fee or remaining seats for final acceptance. Map known RPC codes (`APPLICATION_CLOSED`, `SESSION_FULL`, `INVALID_APPLICATION`, `CONSENT_REQUIRED`) to Korean messages; map unknown Supabase errors to a generic retry message without exposing SQL text.

- [x] **Step 4: Run validation tests and verify they pass**

  Run: `node --test src/pages/local-eum/applicationValidation.test.js`
  Expected: all named validation cases pass.

- [x] **Step 5: Test exact RPC parameter mapping**

  Assert a fixed input maps to the exact nine `p_*` parameter names, trims name/email/note consistently, uses the selected session ID and attendee count, and never emits an Auth UID or client-computed fee. Assert empty optional phone/note map to `null`.

- [x] **Step 6: Run repository tests**

  Run: `node --test src/pages/local-eum/applicationValidation.test.js src/pages/local-eum/applicationRpcPayload.test.js`
  Expected: all local application tests pass without network access or Supabase secrets. The Supabase repository wrapper itself is verified by build/lint; no test imports the Vite-only environment module under raw Node.

## Task 3: Application form, auth behavior, and receipt screen

**Files:**
- Create: `src/pages/local-eum/components/ExperienceApplicationFlow.jsx`
- Create: `src/pages/local-eum/components/ExperienceApplication.css`

**Interfaces:**
- Component props: `{ record, session, onBack }`.
- Consumes `getAuthSession()` and `submitExperienceApplication()`.
- On success stores the RPC `ReceiptResult` in component state and switches to a receipt view; it does not fetch guest records by receipt code.

- [x] **Step 1: Implement Auth loading and prefill behavior**

  On mount call `getAuthSession()`. For a session, set email from `session.user.email`, use `session.user.user_metadata.full_name` then `name` as optional name prefill, and show the logged-in account email. For no session, render the same required name/email fields without asking the visitor to create an account. Allow both users to edit name and email; the server still associates authenticated submission from `auth.uid()`.

- [x] **Step 2: Implement fields and consent**

  Render required name, email, contact language, attendee count, required privacy consent, and optional phone/note. Set attendee options from one through the session capacity. Show unit price and calculated total for display only. Include a visible privacy notice version and the note that contact details support application confirmation and host follow-up.

- [x] **Step 3: Implement payment choice display and submit states**

  Show the demo virtual-account choice selected with a `DEMO-` unavailable-for-deposit disclosure. Show card payment disabled with “준비 중”. Never render a card-number field. On submit validate locally, disable repeat submission, call the RPC, then show the receipt view; map server rejection to a form alert and re-enable submit.

- [x] **Step 4: Implement receipt view and return behavior**

  Render receipt code, experience, session start/end, attendee count, unit/total amounts, demo reference, 24-hour expiry, and clear “신청 접수 · 결제 및 참가 미확정” copy. Add an `onBack` action that returns to the selected experience/session. Do not add a public application lookup endpoint or imply that payment was received.

- [x] **Step 5: Add responsive styles**

  Reuse existing `let-section`, button, input, and muted color patterns. Add focused class names for two-column form/summary on desktop, stacked mobile layout, field errors, disabled card choice, demo warning, receipt status and keyboard-visible focus. Keep the shared site Header unchanged.

## Task 4: Connect every public experience detail to application flow

**Files:**
- Modify: `src/pages/local-eum/ExperienceDetail.jsx`
- Modify: `src/pages/local-eum/components/ExperienceDetailContent.jsx`
- Create: `src/pages/local-eum/components/ExperienceApplication.css`

**Interfaces:**
- Detail CTA navigates to the existing route with `?session=<id>&apply=1`.
- `ExperienceDetail` reads `apply=1`, renders `ExperienceApplicationFlow`, and keeps experience/session loading and selection based on `experienceRepository.js`.
- Back action removes `apply` but preserves selected `session` in the query string.

- [x] **Step 1: Add an application CTA for the selected recruiting session**

  In `ExperienceDetailContent`, render “참가 신청” only when a selected session exists, status is recruiting, the start time is in the future, and `recruit_deadline` is absent or in the future. Add `recruit_deadline` to `experienceRepository.js` public session columns. Preserve the selected session ID and use a button/link that is accessible by keyboard. The RPC remains authoritative if time changes after page load. Do not hide or reorder other catalog experiences.

- [x] **Step 2: Switch the detail body into application mode from the query string**

  In `ExperienceDetail`, read `apply` from `useSearchParams()`. When set to `1`, render the application flow using the already loaded record and selected session; if no matching recruiting session exists, show a clear unavailable state with a return link. Otherwise render current detail content. `App.jsx` remains unchanged.

- [x] **Step 3: Verify query state transitions**

  Manually verify a CTA on at least two different experience IDs preserves the correct `session`, the return action restores the same detail selection, and reloading the form URL loads the form for the correct session without exposing a guest application record.

## Task 5: Verification and approved database application

**Files:**
- Review all files listed above; no further source files are changed in this task.

- [x] **Step 1: Run focused tests**

  Run: `node --test src/pages/local-eum/applicationValidation.test.js src/pages/local-eum/applicationRpcPayload.test.js src/pages/local-eum/experiencePresentation.test.js src/pages/local-eum/experienceImageSource.test.js`
  Expected: all focused tests pass.

- [x] **Step 2: Run lint and production build**

  Run: `npm run lint`
  Expected: exit code 0.

  Run: `npm run build`
  Expected: Vite completes and emits production assets.

- [x] **Step 3: Inspect final changed-file scope**

  Run: `git status --short` and `git diff --check`. Confirm the application changes are limited to this plan’s files and distinguish pre-existing user edits. Do not stage or commit any file.

- [x] **Step 4: Report verified database application**

  Report the applied SQL path and target project ID `rhkaxmqdkztpbljkunxb`, the two new tables, RLS policies and RPC, preflight/postflight counts and privileges, and test/build/lint results. No application or payment rows were created; no existing experience or session data was modified.

## Self-Review

- Spec purpose, all-public-experience scope, signed-in and guest flows, receipt, demo-only payment, disabled card, PII/RLS, atomic capacity handling, 24-hour hold, expiry behavior, no real payment confirmation, forbidden file scope, migration review, and test/build/lint criteria map to Tasks 1–5.
- Guest applications have no anonymous read policy or lookup endpoint; the receipt is returned only from the submission RPC and held in the current component state.
- Auth identity is never accepted as a caller-supplied UID; RPC parameter types and names are defined once and reused by the repository.
- The approved schema was applied remotely after the user gave separate approval. No existing application, payment, experience, or session rows were changed. No image overwrite, common Header/App/Oracle edit, commit, or push occurred.
- Privacy retention duration remains an explicit pre-production operating decision from the spec; implementation records the notice version and consent time without inventing a retention period.
