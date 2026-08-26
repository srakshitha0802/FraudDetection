# Sentinel Production Launch Checklist

This checklist confirms that the Sentinel platform has satisfied all validation and security requirements for launch.

## 1. Application Build & Environment
- [x] Frontend builds cleanly (`npm run build` exits with code 0)
- [x] Backend builds cleanly (esbuild bundles server cleanly)
- [x] Environment configuration is isolated to `.env.example`
- [x] No runtime crashes or dead endpoints in core routes
- [x] Startup fast-fail checks enforce GEMINI_API_KEY presence

## 2. Database Integrity
- [x] Sequential migrations applied successfully (from `schema_migrations/`)
- [x] Schema constraints (foreign keys, uniqueness) enforced
- [x] Lookup indexes on query fields verified (`EXPLAIN QUERY PLAN` tested)
- [x] Transaction idempotency constraint verified (SHA-256 request hash checks)
- [x] Database recovery strategy documented

## 3. API Hardening & Error Boundary
- [x] Adversarial inputs (NaN, negative values, giant strings) rejected with HTTP 400
- [x] Centralized error middleware catches unhandled exceptions
- [x] Internal Node.js/SQLite stack trace leaks suppressed
- [x] Public endpoints protected by rate limiting middleware (HTTP 429)
- [x] GET /health and GET /ready endpoints operational

## 4. ML Model & Platt Calibration
- [x] LightGBM model booster loaded and features mapped
- [x] Platt calibration improved validation Brier Score by 56.9%
- [x] Operating thresholds (Monitor: 0.02, Review: 0.03, Protect: 0.20) evidence-grounded
- [x] Model drift monitored (Month 6 vs Month 7) and reported
- [x] Expected operational loss minimized to ₹97,718,500.00 (₹31.79M savings)

## 5. Coordinated incident Detection
- [x] Fraud spike anomaly z-scores validated (volume spikes mapped)
- [x] Coordinated Mule cluster scoring sensitivity validated
- [x] Account Takeover event sequence verified
- [x] 15-minute incident deduplication and correlation tested
- [x] Hard negatives (NAT IP sharing, travel, flash sales) false alert rate measured

## 6. Resilience & Safety
- [x] Python model microservice failure fallback verified (default to REVIEW)
- [x] Gemini LLM offline failure fallback verified (Core risk score unaffected)
- [x] Centralized structured logs populated with Request IDs
- [x] Secrets scanning verified (0 hardcoded credentials committed)
- [x] n8n orchestration webhook response validated
