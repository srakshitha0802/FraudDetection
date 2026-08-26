# Sentinel Production readiness Check Report

Generated on: 2026-08-26T03:34:38Z

---

## 1. Quality Gate Summary

*   **Launch Decision Status**: **PASS - READY FOR LAUNCH**
*   **Secrets Scan**: **PASS**
*   **Adversarial Input Validation**: **PASS**
*   **E2E API Endpoints Check**: **PASS**

---

## 2. API Contract Check Status

| Endpoint Validation | Target Check | Status |
| :--- | :--- | :---: |
| **GET /health** | Process liveness | PASS |
| **GET /ready** | Model and dependency readiness | PASS |
| **POST /api/v1/risk/analyze (Success)** | Scoring response | PASS |
| **POST /api/v1/risk/analyze (Idempotency duplicate)** | Returns duplicate: true | PASS |
| **POST /api/v1/risk/analyze (Idempotency collision)** | Returns HTTP 409 conflict | PASS |
| **POST /api/v1/risk/analyze (Adversarial rejection)** | Returns HTTP 400 malformed | PASS |

---

## 3. Legitimate Hard Negatives

*   **Large Legit Transactions Block Rate**: 0.00%
*   **Travel Anomaly Block Rate**:          0.00%

---

## 4. Model Drift Comparison

| Segment | Precision | Recall | F1 Score | ROC-AUC |
| :--- | :---: | :---: | :---: | :---: |
| **Month 6** | 7.69% | 49.31% | 13.31% | 0.8310 |
| **Month 7** | 9.02% | 49.30% | 15.26% | 0.8348 |
