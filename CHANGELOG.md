# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
