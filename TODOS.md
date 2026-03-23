# TODOS

## P2 — Auth

### Firebase auth health check endpoint

**What:** Add `GET /api/auth/firebase-health` that tests Firebase Admin SDK connectivity and returns a JSON status.

**Why:** A misconfigured Firebase setup (bad project ID, expired service account, wrong VITE_FIREBASE_* vars) is only discovered when a real user attempts OAuth. A health endpoint lets Render's health check or uptime monitoring catch this before users do.

**Pros:** Catches deploy-day auth failures early. Plugs directly into Render's health check URL.

**Cons:** Requires Firebase Admin SDK initialization check logic. Moderate effort.

**Context:** Emerged from the 2026-03-21 Firebase auth hardening session. The new `auth/popup-closed-by-user` error message now tells devs to check env vars — but a health endpoint would make that check automatic. Start in `backend/src/routes/auth.js`, add a `GET /health` handler that calls `getFirebaseAuth().tenantManager()` or a lightweight Admin SDK ping.

**Effort:** M (human ~4h) → S with CC+gstack (~15 min)

**Priority:** P2

**Depends on:** Nothing. Standalone addition.

---

## P3 — /paper figure callouts

### Figure insight callouts in PaperPage

**What:** Add a 1-sentence interpretive callout below each of the 5 figure captions in the paper. Style: small text in `var(--accent)` color with a left border or subtle background. Content: the key takeaway from each figure in plain language (e.g., "Gemini Flash is the Pareto-dominant configuration — highest accuracy at lowest cost.").

**Why:** Figures are currently data delivery only. A non-expert reader landing on Figure 3 (cost-accuracy pareto) without reading the surrounding paragraphs has no interpretive scaffold. Callouts make the figures scannable and self-contained.

**Pros:** Makes the paper more accessible to practitioners who scan figures first. Very low implementation effort.

**Cons:** Adds interpretation that belongs in the caption — could feel redundant for expert readers.

**Context:** Surfaced in 2026-03-23 design review. Callout text should be authored by the paper author, not generated. Suggested format: `<p style="font-size: 0.8125rem; color: var(--accent); border-left: 2px solid var(--accent); padding-left: 0.75rem; margin-top: 0.5rem;">{insight}</p>`.

**Effort:** XS (human ~30 min) → XS with CC+gstack (~5 min)

**Priority:** P3

**Depends on:** Author must provide the 5 insight sentences.

---

### Design system alignment + cross-page navigation — BenchmarksPage

**What:** Three changes in one pass:
1. **Token alignment**: Import `LandingPage.css` into BenchmarksPage and replace all hardcoded hex values (`#d99058`, `#3b3c36`, `#F5F3EF`, etc.) with CSS variables (`var(--accent)`, `var(--text-primary)`, `var(--bg)`, etc.).
2. **Cross-page nav links**: Add a `/paper` link to BenchmarksPage nav (next to the "Run your own" CTA). Add a `/benchmarks` link to PaperPage bottom CTA (next to the GitHub link).
3. **Back-to-top button**: Add a fixed bottom-right back-to-top button on both pages (small, copper-outlined, appears after 400px scroll).

**Why:** DESIGN_SYSTEM.md forbids hardcoded hex in JSX. BenchmarksPage has ~20 hardcoded hex instances. The two pages link to each other in CTAs but not in nav — users who land on /benchmarks have no top-level path to the paper.

**Pros:** Brings BenchmarksPage into design system compliance. Improves page-to-page discoverability.

**Cons:** The back-to-top button adds a small floating element to both pages — verify it doesn't overlap the mobile sticky TOC drawer button.

**Context:** Surfaced in 2026-03-23 design review.

**Effort:** S (human ~2h) → S with CC+gstack (~10 min)

**Priority:** P2

**Depends on:** Sticky TOC sidebar (coordinate back-to-top position with mobile TOC button).

---

### Vitest + React Testing Library — auth unit tests

**What:** Set up Vitest + RTL and write unit tests for: `firebaseConfigured=false` renders "not configured", each named Firebase error code (`popup-blocked`, `popup-closed-by-user`, `account-exists`, `unauthorized-domain`) produces the correct user-facing message, and `SocialAuth` buttons disable during loading.

**Why:** Zero test coverage on auth flows. Given the auth instability history (signInWithPopup ↔ signInWithRedirect back-and-forth, multiple CVE/config fixes), a regression test suite would have caught breakage earlier. The `auth/popup-closed-by-user` message was misleading until this session — a test would have locked in the correct behavior.

**Pros:** Locks in current behavior. Fast to write with CC+gstack once framework is in place.

**Cons:** Adds dev dependencies (vitest, @testing-library/react). Requires initial setup.

**Context:** No test framework configured as of 2026-03-21. Start with `frontend/src/components/auth/SocialAuth.test.jsx` and `frontend/src/context/AuthContext.test.jsx`. Mock Firebase SDK calls (`vi.mock('firebase/auth')`).

**Effort:** M (human ~1 day) → S with CC+gstack (~20 min)

**Priority:** P2

**Depends on:** Nothing. Can be added independently.

---

### Vitest + RTL — frontend component tests (ServiceKeysManager + auth)

**What:** Set up Vitest + React Testing Library for the frontend. Write tests for `ServiceKeysManager`: load states (loading shimmer, success list, error, empty state), create key flow (POST → modal), copy button (clipboard available + fallback), revoke flow (confirm → DELETE, cancel → no DELETE). Bundle with existing auth test TODO (`SocialAuth`, `AuthContext`).

**Why:** 0% frontend test coverage. The copy modal is a one-time-only interaction — clipboard unavailability would be a silent failure without a test. The revoke confirm flow also has no coverage.

**Pros:** Locks in ServiceKeysManager behavior. Establishes Vitest + RTL infra for all future frontend tests. Auth tests from the prior TODO come along for free once infra is set up.

**Cons:** Adds dev dependencies (`vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`). One-time setup cost.

**Context:** Emerged from 2026-03-22 ServiceKeysManager eng review. Frontend has no test framework; backend already runs Vitest. Start in `frontend/vitest.config.js`, then `frontend/src/components/ServiceKeysManager.test.jsx`. Mock `navigator.clipboard` and `../lib/api` module.

**Effort:** S (human ~1 day) → S with CC+gstack (~20 min)

**Priority:** P2

**Depends on:** Nothing. Can be bundled with next frontend feature session.

---

## P3 — Settings

### ARIA labels for "Configured" badge on provider cards

**What:** Add `aria-label="{Provider} key configured"` to the "Configured" badge `<span>` in `ApiKeysManager` for each provider card.

**Why:** Screen readers currently announce "Configured" three times in sequence with no provider context. A user navigating by keyboard hears "Configured, Configured, Configured" — the provider name is visible in the DOM but not associated to the badge.

**Pros:** 3-line fix. Correct a11y behavior.

**Cons:** None.

**Context:** Surfaced in 2026-03-23 Settings page design review. File: `frontend/src/components/ApiKeysManager.jsx`, the `<span>` with "Configured" text near line 147.

**Effort:** XS (human ~5 min) → XS with CC+gstack (~1 min)

**Priority:** P3

**Depends on:** Can be done in any PR that touches ApiKeysManager.

---

### Full Account settings tab

**What:** Build out the Account tab in Settings (`/app/settings/account`) with: display name edit, email change (requires re-authentication), password change form, and danger zone (delete account with confirmation).

**Why:** The Account tab currently ships as a read-only stub showing email/username. Users expect to manage their account from Settings. Password change and email change are standard auth operations.

**Pros:** Completes the settings experience. Reduces "where do I change my email?" support friction.

**Cons:** Email change requires Firebase re-auth flow. Danger zone (account deletion) requires backend cascade (delete evaluations, keys, user doc). Non-trivial backend work.

**Context:** Surfaced in 2026-03-23 Settings page design review. The tab stub (`/app/settings/account`) will ship in the initial Settings refactor PR to reserve the route. Full implementation is a separate PR. Auth flows must use `signInWithPopup` for re-auth (per CLAUDE.md Firebase rules).

**Effort:** L (human ~3 days) → M with CC+gstack (~45 min)

**Priority:** P2

**Depends on:** Settings refactor PR must ship first (adds the Account tab route).
