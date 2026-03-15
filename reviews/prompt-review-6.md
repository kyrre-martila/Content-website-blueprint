# Prompt Review 6 — Post Hardening Run Review

## 1) Executive summary

- **Overall production-readiness score:** **7.4 / 10**.
- **Readiness by environment:**
  - **Local development:** **8.5 / 10** (strong defaults, workable guardrails, good hardening coverage).
  - **Staging:** **7.5 / 10** (mostly viable, but CI/workflow posture and contract assurance are not fully reliable).
  - **Technical pilot client:** **7.2 / 10** (strong baseline but still requires manual governance discipline).
  - **Non-technical editorial client:** **6.5 / 10** (safety is much better, but a few high-impact sharp edges remain).
- **Top 3 remaining blockers:**
  1. **OpenAPI drift still occurring in committed artifact** (contract changed after regeneration, proving drift reached mainline).
  2. **RBAC inconsistency in duplicate media delete endpoint** (`/admin/content/media/:id` allows editor delete while `/admin/media/:id` requires admin).
  3. **CI/CD policy and docs are materially out of sync** (required workflows/docs describe checks that are disabled or renamed).

## 2) Findings

### Critical

#### 1. Contract artifact drift reached repository state
- **Why it matters:** Generated contract is the source for SDKs and downstream typed integrations. If committed spec lags routes/DTOs, client generation and API behavior diverge in production.
- **Affected files/modules:**
  - `packages/contracts/openapi.v1.json`
  - `apps/api/scripts/generate-openapi.ts`
  - `.github/workflows/tools.yml`
- **Evidence:** Regenerating OpenAPI produced changes (new pagination query params and `revisionNote` fields), so the checked-in spec was stale before this review.
- **Recommended fix:**
  - Keep contract regeneration as a **required** status check on PRs to protected branches.
  - Add a local pre-commit or pre-push guard for `openapi.v1.json` drift.
  - Consider a route-level contract test matrix instead of only a narrow smoke subset.

#### 2. Duplicate media-delete routes have conflicting authorization (privilege regression risk)
- **Why it matters:** There are two admin media APIs with different role floors. The older content-scoped route permits editor deletion, undermining the hardened restriction expected for destructive media actions.
- **Affected files/modules:**
  - `apps/api/src/modules/content/content.controller.ts` (`DELETE admin/content/media/:id`)
  - `apps/api/src/modules/content/media.controller.ts` (`DELETE admin/media/:id`)
  - `packages/contracts/openapi.v1.json` (both route families exposed)
- **Recommended fix:**
  - Remove/deprecate `admin/content/media` endpoints or harden them to admin-only for deletes.
  - Add regression tests asserting editors receive 403 for **all** media-delete routes.

### High

#### 3. Contract-validation test coverage is too narrow for current route surface
- **Why it matters:** The existing contract test validates only login/register/me, while the largest hardening surface (content admin, revisions, redirects, role management) is unverified by runtime spec conformance tests.
- **Affected files/modules:**
  - `apps/api/test/contract/openapi-contract.spec.ts`
- **Recommended fix:**
  - Add contract conformance tests for: revisions list/get/restore, redirects CRUD, user role patch, media upload/delete, content type deletion guard.
  - Include negative auth/role scenarios in contract+RBAC integration tests.

#### 4. CI workflows are not currently enforcing stated production checks
- **Why it matters:** Core workflows are mostly manual (`workflow_dispatch`/`workflow_call`) and PR triggers are commented out in key workflow files, reducing real gating against regressions.
- **Affected files/modules:**
  - `.github/workflows/ci-pr.yml`
  - `.github/workflows/build.yml`
  - `.github/workflows/tools.yml`
- **Recommended fix:**
  - Re-enable PR event triggers for required quality gates.
  - Mark OpenAPI drift check and tests as required branch protections.

### Medium

#### 5. Redirect list endpoint is unbounded (scales poorly)
- **Why it matters:** Redirect tables can grow significantly in agency environments. Unbounded reads create memory/latency risk and slow admin UX.
- **Affected files/modules:**
  - `apps/api/src/modules/redirects/redirects.controller.ts` (`findMany` without pagination)
  - `apps/web/lib/admin/redirects.ts` (consumes entire list)
- **Recommended fix:**
  - Add offset/cursor pagination with max limit, and update admin UI to page incrementally.

#### 6. Workflow governance remains soft for “approval required” mode
- **Why it matters:** Editors are constrained from direct publish, which is good; however there is no explicit approval policy toggle/enforcer for multi-step approvals, leaving governance mostly convention-based.
- **Affected files/modules:**
  - `apps/api/src/modules/content/content.controller.ts` (`resolveWorkflowUpdate`)
  - `README.md` / `DEPLOY.md` (approval flow marked planned)
- **Recommended fix:**
  - Add optional feature flag for strict approval pipeline (e.g., enforce admin transition from `in_review` to `published`).

#### 7. Operational docs are inconsistent with real workflow filenames and trigger behavior
- **Why it matters:** Runbooks/docs that reference non-existent pipeline files create deployment and governance confusion during incidents.
- **Affected files/modules:**
  - `docs/CI_CD.md`
  - actual workflows under `.github/workflows/*.yml`
- **Recommended fix:**
  - Update docs to current workflow names and exact trigger semantics.
  - Add a docs validation checklist in release process.

### Low

#### 8. Health/readiness checks are good baseline but still shallow dependency-wise
- **Why it matters:** API readiness checks only DB. For mature production posture, dependency status for storage/email/queue integrations should also be surfaced where applicable.
- **Affected files/modules:**
  - `apps/api/src/modules/health/health.controller.ts`
  - `apps/web/app/api/health/route.ts`
- **Recommended fix:**
  - Keep DB as mandatory check, but add optional probes for configured storage and mail provider, with clear degraded vs hard-fail policy.

---

## 3) What improved since the previous review

1. **Role escalation guardrails are materially stronger**: `admin -> super_admin` assignment/removal is now gated to superadmin, including anti-self-escalation checks.
2. **Revision governance improved**: revision listing now supports pagination with cursor/limit patterns and repository-side retention pruning exists.
3. **Restore safety improved**: restore flows validate slug conflicts against active entities and redirect-source collisions for both pages and content items.
4. **Destructive structure controls strengthened**: content type create/update/delete moved to superadmin-only with item-count deletion safeguard.
5. **Scheduling clarity improved**: publish windows (`publishAt`/`unpublishAt`) are validated and enforced at request-time for public content, and docs now explicitly state no built-in scheduler worker.
6. **Audit footprint expanded**: coverage now includes role change, revision restore, schedule updates, redirect CRUD, and key auth events.
7. **Validation hot path improved**: content item reference validation moved toward batched lookups (`findManyByIds` / `findManyBySlugs`) instead of per-field/entry fetches.

## 4) Top 8 remaining improvements (ordered by practical impact)

1. **Eliminate media-delete RBAC inconsistency across route aliases.**
2. **Make OpenAPI drift check and test suite mandatory on PRs (not manual-only).**
3. **Expand contract conformance tests beyond auth/me to admin/content/revision/redirect routes.**
4. **Paginate redirects list API + admin UI.**
5. **Align CI/CD docs with actual workflow files and triggers.**
6. **Add strict optional approval-policy mode for agencies requiring editorial sign-off controls.**
7. **Add RBAC integration tests covering destructive endpoints for editor/admin/superadmin matrices.**
8. **Broaden readiness checks for optional dependencies (storage/mail) with degraded-state semantics.**

## 5) What should **not** be changed now

1. **Keep request-time publish window enforcement** (`publishAt`/`unpublishAt`) as baseline behavior until a dedicated scheduler worker is introduced.
2. **Keep revision retention pruning in persistence layer** (repository transaction scope is the correct locus).
3. **Keep route-level slug conflict checks on restore/update paths** (cross-entity and redirect-source guards are correct and valuable).
4. **Keep strict environment hardening gates** (secret quality checks + hardened env runtime assertions).
5. **Keep batched relation/media/page/content lookups in content validation path** (this is a concrete win and should be preserved).
