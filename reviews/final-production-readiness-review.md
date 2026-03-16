# Final production-readiness review (pre-deploy gate)

This review captures the final go/no-go findings before first live deployment.

## Verdict
- Current status: **Not ready for first live server deployment**.
- Primary blockers are release pipeline and runtime packaging issues that can prevent API/web from booting reliably in production.

## Critical findings
1. API Docker entrypoint points to a non-existent build artifact (`dist/main.js` vs actual `dist/src/main.js`).
2. Prisma Client generation is not guaranteed in production image build and OpenAPI generation flow, causing runtime/tooling failures (`@prisma/client did not initialize yet`).
3. OpenAPI generation fails in current state, so contract publishing/drift checks are not reliable.

## High findings
1. CI jobs run commands that map to missing scripts (`pnpm -r run typecheck`, `pnpm -r run test:unit`), which can false-pass and skip real checks.
2. Web production compose env uses `API_ORIGIN`/`API_BASE_PATH` instead of `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_API_BASE_PATH`; this can point health probes/fetches to localhost defaults in production.
3. API unit test suite currently fails due to resolver mapping gaps for `.js` imports in domain package (`staging/staging.service.js`).

## Medium findings
1. Domain adapter tests are skipped when no container runtime is available, reducing confidence for DB adapter correctness in CI/local environments.
2. Security headers include `'unsafe-inline'` for scripts/styles in production CSP, which is pragmatic but weaker than nonce/hash-based CSP for long-term hardened posture.

## Low findings
1. One lint warning remains in web app (`no-unused-vars`), small but should be cleaned before live handover.
