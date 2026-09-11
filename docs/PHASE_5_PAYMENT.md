# Phase 5: Mock Payment & Order Confirmation Architecture

## 1. Executive Summary

Phase 5 introduces a production-ready, provider-agnostic payment architecture to **Rubbish Revamp** (B2B Scrap-to-Value Marketplace). The system implements a mock payment gateway that closely models Razorpay's order-and-verification workflow.

### Core Objectives Achieved:
1. **Mock Gateway Abstraction**: A decoupled payment provider interface enabling seamless migration to real Razorpay or other payment processors without modifying order, inventory, or payment business logic.
2. **Order Confirmation Synchronicity**: Payment success (`SUCCEEDED`) updates collection request status from `pending` to `confirmed` atomically.
3. **Inventory Integrity**: Preserves Phase 4 atomic inventory allocation. Payment success maintains the `RESERVED` status and does not prematurely deduct stock. Actual fulfillment remains strictly bound to final delivery (`delivered`), while inventory release remains bound to order cancellation (`cancelled`).
4. **Resilient Failure Handling**: Payment failures (`FAILED`) and buyer cancellations (`CANCELLED`) leave collection requests in `pending` status, keeping reservations intact for immediate retry.
5. **Security & Idempotency**:
   - Total amount is strictly verified against the database request record, preventing client-side amount tampering.
   - Idempotency guarantees prevent duplicate debits, double confirmations, or race conditions.
   - An immutable audit ledger (`payment_transactions`) records all state transitions chronologically.

---

## 2. Architecture & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Buyer
    participant UI as BuyerOrders / MockCheckoutModal
    participant API as Payment Controller & Routes (/api/payments)
    participant Svc as Payment Service
    participant Prov as Payment Provider (Mock / Razorpay)
    participant ReqSvc as Request Service
    participant DB as MySQL (payments, collection_requests, reservations)

    Buyer->>UI: Clicks "Pay Now" on Pending Request
    UI->>API: POST /api/payments { requestId }
    API->>Svc: createPayment({ requestId, buyerId, paymentMethod })
    Svc->>DB: Fetch collection_request (validate status == 'pending')
    Svc->>Prov: createPaymentOrder({ amount, currency: 'INR', orderId })
    Prov-->>Svc: Provider Order (order_mock_xxx)
    Svc->>DB: INSERT into payments (status = 'PENDING') & payment_transactions
    Svc-->>UI: Return payment info & provider order details

    Buyer->>UI: Simulates Payment (Success / Failure / Cancel)
    alt Payment Succeeded
        UI->>API: POST /api/payments/:id/mock-success
        API->>Svc: processMockSuccess({ paymentId, buyerId })
        Svc->>Prov: verifyPayment(signature)
        Prov-->>Svc: Verification Valid
        Svc->>DB: UPDATE payments SET status = 'SUCCEEDED', paid_at = NOW()
        Svc->>ReqSvc: updateRequestStatus(requestId, 'confirmed')
        Note over ReqSvc,DB: Updates request to 'confirmed' & adds tracking update
        Note over DB: Inventory reservation remains 'RESERVED'
        Svc->>DB: INSERT into payment_transactions (action = 'PAYMENT_SUCCESS')
        Svc-->>UI: 200 OK (Payment & Order Confirmed)
    else Payment Failed
        UI->>API: POST /api/payments/:id/mock-failure
        API->>Svc: processMockFailure({ paymentId, reason })
        Svc->>DB: UPDATE payments SET status = 'FAILED'
        Svc->>DB: INSERT into payment_transactions (action = 'PAYMENT_FAILED')
        Note over DB: Request status remains 'pending'; inventory remains 'RESERVED'
        Svc-->>UI: 200 OK (Payment marked failed; can retry)
    else Buyer Cancelled Checkout
        UI->>API: POST /api/payments/:id/cancel
        API->>Svc: cancelPayment({ paymentId, reason })
        Svc->>DB: UPDATE payments SET status = 'CANCELLED'
        Svc->>DB: INSERT into payment_transactions (action = 'PAYMENT_CANCELLED')
        Svc-->>UI: 200 OK (Payment cancelled; request pending)
    end
```

---

## 3. Database Schema

### 3.1 `payments` Table
Main payment record linked 1:1 or 1:N with collection requests.

```sql
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(36) PRIMARY KEY,
  request_id VARCHAR(36) NOT NULL,
  buyer_id VARCHAR(36) NOT NULL,
  seller_id VARCHAR(36) NOT NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'mock',
  provider_order_id VARCHAR(128) NULL,
  provider_payment_id VARCHAR(128) NULL,
  provider_signature VARCHAR(255) NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  payment_method VARCHAR(50) NULL,
  idempotency_key VARCHAR(128) NULL UNIQUE,
  error_message TEXT NULL,
  paid_at TIMESTAMP NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payments_request_id (request_id),
  INDEX idx_payments_buyer_id (buyer_id),
  INDEX idx_payments_seller_id (seller_id),
  INDEX idx_payments_status (status),
  INDEX idx_payments_provider_order (provider_order_id),
  CONSTRAINT fk_payments_request FOREIGN KEY (request_id) REFERENCES collection_requests (id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_buyer FOREIGN KEY (buyer_id) REFERENCES users (id),
  CONSTRAINT fk_payments_seller FOREIGN KEY (seller_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.2 `payment_transactions` Table (Audit Ledger)
Immutable chronological audit log for compliance and reconciliation.

```sql
CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(36) PRIMARY KEY,
  payment_id VARCHAR(36) NOT NULL,
  action ENUM('CREATED', 'PROCESSING', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED', 'REFUND_INITIATED', 'REFUND_SUCCESS', 'REFUND_FAILED') NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  provider_reference VARCHAR(128) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pmt_txn_payment_id (payment_id),
  CONSTRAINT fk_pmt_txn_payment FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

---

## 4. Payment Lifecycle & State Machine

```
               [ Create Payment ]
                       │
                       ▼
                 ┌───────────┐
                 │  PENDING  │◄─────────────────────┐
                 └─────┬─────┘                      │
                       │                            │ Retry
         ┌─────────────┼──────────────┐             │
         ▼             ▼              ▼             │
   ┌───────────┐ ┌───────────┐ ┌─────────────┐     │
   │ SUCCEEDED │ │  FAILED   │ │  CANCELLED  │─────┘
   └─────┬─────┘ └───────────┘ └─────────────┘
         │
   [ Triggers: Request -> Confirmed ]
   [ Inventory remains RESERVED ]
         │
         ▼
 ┌───────────────┐
 │REFUND_PENDING │
 └───────┬───────┘
         ▼
   ┌───────────┐
   │ REFUNDED  │
   └───────────┘
```

### State Transitions & Side Effects

| From State | To State | Trigger | Request Status Impact | Inventory Impact |
| :--- | :--- | :--- | :--- | :--- |
| *None* | `PENDING` | `POST /api/payments` | Remains `pending` | Reservation remains `RESERVED` |
| `PENDING` | `SUCCEEDED` | `POST /api/payments/:id/mock-success` | Transitions to `confirmed` | Reservation remains `RESERVED` |
| `PENDING` | `FAILED` | `POST /api/payments/:id/mock-failure` | Remains `pending` | Reservation remains `RESERVED` (retryable) |
| `PENDING` | `CANCELLED` | `POST /api/payments/:id/cancel` | Remains `pending` | Reservation remains `RESERVED` (retryable) |
| `SUCCEEDED` | `REFUNDED` | `POST /api/payments/:id/mock-refund` | May transition if cancelled | Inventory released if request is cancelled |

---

## 5. Security & Edge Case Handling

1. **Amount Tampering Protection**:
   - The client cannot supply arbitrary amounts. The backend queries `collection_requests` by ID, calculates `request.amount`, and forces the payment order amount to match the database value.
2. **Duplicate Confirmation Prevention**:
   - If `processMockSuccess` is invoked on an already `SUCCEEDED` payment, the service idempotently returns the existing successful record with `{ idempotent: true }` without executing duplicate database updates or order status transitions.
3. **Double Payment Creation Re-use**:
   - Calling `createPayment` on a request with an existing `PENDING` payment returns the existing payment order rather than creating orphaned records.
4. **Invalid Request State Rejection**:
   - Attempting to pay for an order in `delivered`, `cancelled`, or already `confirmed` states with existing succeeded payments returns a `400 Bad Request` or `409 Conflict`.
5. **Cross-Tenant Access Control**:
   - Only the buyer associated with `collection_requests.buyer_id` can initiate or update payment for the request. Other users receive `403 Forbidden`.

---

## 6. Razorpay Migration Guide

To switch from the Mock Gateway to live Razorpay, execute the following steps without rewriting order or inventory models:

1. **Install Razorpay SDK**:
   ```bash
   npm install razorpay
   ```
2. **Configure Environment Variables**:
   ```env
   PAYMENT_PROVIDER=razorpay
   RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
   RAZORPAY_KEY_SECRET=yyyyyyyyyyyyyyyy
   RAZORPAY_WEBHOOK_SECRET=zzzzzzzzzzzzzzzz
   ```
3. **Implement Razorpay Provider**:
   Create `backend/src/providers/razorpayPaymentProvider.js` implementing the existing `IPaymentProvider` interface:
   - `createPaymentOrder({ amount, currency, orderId, notes })` -> Calls `razorpay.orders.create()`
   - `verifyPayment({ providerOrderId, providerPaymentId, providerSignature })` -> Uses HMAC SHA256 verification
   - `getPaymentStatus(providerPaymentId)` -> Calls `razorpay.payments.fetch()`
   - `refundPayment({ providerPaymentId, amount, notes })` -> Calls `razorpay.payments.refund()`
4. **Switch Provider in `backend/src/services/paymentProviderService.js`**:
   Update `getProvider()` to instantiate `RazorpayPaymentProvider` when `PAYMENT_PROVIDER === 'razorpay'`.
5. **Replace Frontend Mock Modal with Razorpay Checkout Script**:
   Include `https://checkout.razorpay.com/v1/checkout.js` and open the native modal with the `provider_order_id` returned by `/api/payments`.

---

## 7. Verification & Test Suite

The automated test suite in `backend/tests/phase5_payment.test.js` covers 11 comprehensive test scenarios against live MySQL:

```
PASS  tests/phase5_payment.test.js
  Phase 5 - Payment & Order Confirmation Tests
    ✓ 1. Should create a mock payment order for a pending request (128 ms)
    ✓ 2. Should reject payment creation from unauthorized user (18 ms)
    ✓ 3. Should process mock payment success and confirm collection request (64 ms)
    ✓ 4. Should enforce idempotency on duplicate mock success calls (22 ms)
    ✓ 5. Should reuse existing pending payment if not expired (25 ms)
    ✓ 6. Should process mock payment failure and leave request pending (45 ms)
    ✓ 7. Should process checkout cancellation and keep request pending (42 ms)
    ✓ 8. Should prevent payment creation for non-pending request (20 ms)
    ✓ 9. Should ignore client-side amount tampering and enforce DB amount (38 ms)
    ✓ 10. Should record chronological audit entries in payment_transactions (19 ms)
    ✓ 11. Phase 4 Regression: payment success should maintain RESERVED status and not fulfill (24 ms)

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
Snapshots:   0 total
Time:        1.45 s
```
