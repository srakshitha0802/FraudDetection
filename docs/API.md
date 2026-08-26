# Sentinel B2B API Reference

This document outlines the endpoints, request/response payloads, and error contracts for the Sentinel Platform.

---

## 1. Core Endpoints

### POST `/api/v1/risk/analyze`
Evaluates individual transaction risk.

*   **Request Headers**: `Content-Type: application/json`
*   **Request Schema**:
    ```json
    {
      "transaction_id": "string (1-100 chars, required)",
      "user_id": "string (1-100 chars, required)",
      "amount": "number (non-negative finite, required)",
      "currency": "string (default: 'INR')",
      "payment_method": "string ('UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'WALLET')",
      "device_id": "string",
      "ip_address": "string",
      "location": "string",
      "operating_mode": "string ('MONITOR' | 'REVIEW' | 'PROTECT', default: 'REVIEW')"
    }
    ```
*   **Response Schema (200 OK)**:
    ```json
    {
      "transaction_id": "string",
      "fraud_probability": "number",
      "calibrated_probability": "number",
      "risk_score": "integer (0-100)",
      "risk_level": "string ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')",
      "decision": "string ('APPROVED' | 'PENDING' | 'BLOCKED')",
      "threshold_mode": "string",
      "incident_id": "string | null",
      "signals": ["string"],
      "is_duplicate": "boolean (optional)"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Missing fields or malformed payload values (NaN, negative, oversized strings).
    *   `409 Conflict`: Idempotency collision where same transaction ID is sent with different parameters.
    *   `429 Too Many Requests`: Rate limit exceeded.

---

### POST `/api/v1/incidents/detect`
Manually triggers the baseline incident detection engine to cluster transactions.

*   **Response Schema (200 OK)**:
    ```json
    {
      "created_incidents": "integer",
      "scanned_transactions": "integer",
      "clusters_formed": "integer"
    }
    ```

---

### GET `/api/v1/incidents`
Lists correlated incident cases. Supports filtering by `status`, `severity`, and `type`.

*   **Response Schema (200 OK)**:
    ```json
    [
      {
        "incident_id": "string",
        "severity": "string",
        "type": "string",
        "status": "string",
        "exposure_amount": "number",
        "confidence_score": "number",
        "created_at": "string",
        "affected_transactions": "integer",
        "affected_users": "integer"
      }
    ]
    ```

---

### POST `/api/v1/incidents/:id/resolve`
Updates status and logs analyst justification in audit trails.

*   **Request Schema**:
    ```json
    {
      "status": "string ('RESOLVED_FRAUD' | 'RESOLVED_FALSE_POSITIVE' | 'RESOLVED')",
      "reason": "string (required)",
      "analyst_id": "string"
    }
    ```
*   **Response Schema (200 OK)**:
    ```json
    {
      "success": true,
      "incident_id": "string",
      "status": "string"
    }
    ```

---

## 2. Health & Readiness Indicators

### GET `/health`
Process liveness check.

*   **Response (200 OK)**:
    ```json
    {
      "status": "healthy",
      "version": "v4.0.0",
      "model_version": "v3.0-lightgbm",
      "database": "ok",
      "model": "loaded"
    }
    ```

### GET `/ready`
Model service readiness check. Returns HTTP 503 if LightGBM or mappings failed to load on start.

*   **Response (200 OK)**:
    ```json
    {
      "status": "ready",
      "database": "connected",
      "cache": "initialized"
    }
    ```

---

## 3. Standard Error Contract

When a request fails, Sentinel returns a clean JSON block suppressing internal stack traces:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid transaction payload: amount must be a finite non-negative number",
  "request_id": "req-98214"
}
```
Error codes include: `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `IDEMPOTENCY_CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`.
