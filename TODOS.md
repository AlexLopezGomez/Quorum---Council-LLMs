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

### Vitest + React Testing Library — auth unit tests

**What:** Set up Vitest + RTL and write unit tests for: `firebaseConfigured=false` renders "not configured", each named Firebase error code (`popup-blocked`, `popup-closed-by-user`, `account-exists`, `unauthorized-domain`) produces the correct user-facing message, and `SocialAuth` buttons disable during loading.

**Why:** Zero test coverage on auth flows. Given the auth instability history (signInWithPopup ↔ signInWithRedirect back-and-forth, multiple CVE/config fixes), a regression test suite would have caught breakage earlier. The `auth/popup-closed-by-user` message was misleading until this session — a test would have locked in the correct behavior.

**Pros:** Locks in current behavior. Fast to write with CC+gstack once framework is in place.

**Cons:** Adds dev dependencies (vitest, @testing-library/react). Requires initial setup.

**Context:** No test framework configured as of 2026-03-21. Start with `frontend/src/components/auth/SocialAuth.test.jsx` and `frontend/src/context/AuthContext.test.jsx`. Mock Firebase SDK calls (`vi.mock('firebase/auth')`).

**Effort:** M (human ~1 day) → S with CC+gstack (~20 min)

**Priority:** P2

**Depends on:** Nothing. Can be added independently.
