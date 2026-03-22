# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.1.0] - 2026-03-22

### Fixed
- Social auth errors now display inside the `SocialAuth` component and call `clearError()` to prevent double-display in parent forms (`SignInForm`, `SignUpFlow`)
- Fixed regression where social auth failure on `RegisterPage` Step 1 was silently invisible — error now shown in the correct step context
- `auth/popup-closed-by-user` error message updated to mention env var and Firebase Authorized Domains as common causes on fresh deployments
- Error color in `SocialAuth` unified to use design system token `text-verdict-fail` instead of hardcoded `text-red-500`
- `firebaseConfigured` export added to `firebase.js` — `SocialAuth` renders "Social sign-in is not configured." when Firebase env vars are absent

### Added
- Meta tag fallback for Firebase config (`fb-api-key`, `fb-auth-domain`, `fb-project-id`) enables Docker runtime injection path as alternative to build-time env vars
- Named error handling for `auth/account-exists-with-different-credential`, `auth/popup-blocked`, `auth/popup-closed-by-user`, `auth/unauthorized-domain` with readable user-facing messages
- CLAUDE.md: Docker base image rules, npm install vs npm ci rules, Firebase auth deployment checklist and error code reference
- TODOS.md: created with P2 items for Firebase health endpoint and Vitest auth unit tests

## [Unreleased]

### Added
- Public `/benchmarks` page with static benchmark results (no auth required)
- Research paper section on landing page with animated stat cards
- Open-source community health files: CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
- GitHub issue templates and PR template

## [0.1.0] — 2026-03-11

Initial open-source release of Quorum.

### Added
- Adaptive orchestration layer: risk scorer routes each test case to council/hybrid/single strategy
- Council mode: OpenAI (faithfulness) + Anthropic (groundedness) + Gemini (context relevancy), aggregated by Claude Sonnet 4
- Hybrid mode: zero-cost deterministic checks (Jaccard similarity, entity matching, freshness, completeness) + single LLM judge
- Single mode: Gemini 2.0 Flash only — lowest cost path for low-risk cases
- SSE streaming with 17 event types (`risk_scored`, `strategy_selected`, `judge_start`, `judge_complete`, `aggregator_start`, etc.)
- Cursor-paginated evaluation history with strategy/verdict filters
- Per-evaluation cost breakdown with savings estimate vs. all-council baseline
- Authenticated `/app` dashboard: upload, live streaming view, history, webhooks, API keys, benchmark runner
- Landing page with WebGL Prism background, animated terminal demo, and waitlist form
- Python SDK (`sdk/python/`) and zero-dependency ESM SDK
- CI/CD GitHub Action: `quorum-evaluate` custom action + RAG quality gate workflow
- Docker Compose full-stack configuration
- 5,000-case benchmark against RAGTruth and HaluBench corpora

### Architecture
- Backend: Node.js 20 ESM, Express, MongoDB/Mongoose, Zod validation
- Frontend: React 18, Vite 6, TailwindCSS 3, SSE via `useSSE` hook
- Intentional circular dependency between `orchestrator.js` and `adaptiveRouter.js` (safe — function declarations, call-time only)

[Unreleased]: https://github.com/AlexLopezGomez/Quorum---Council-LLMs/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/AlexLopezGomez/Quorum---Council-LLMs/releases/tag/v0.1.0
