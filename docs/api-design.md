# Rubbish Revamp — API Design (Preliminary)

> **Status**: Preliminary catalogue — Phase 1.
> Detailed request/response schemas will be defined in Phase 2.

---

## Base URL

```
Development:  http://localhost:5000
Production:   https://api.rubbishrevamp.in  (TBD)
```

---

## Authentication

All protected endpoints require:

```
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

Tokens are obtained via `POST /api/auth/login`.

---

## Standard Response Envelope

All endpoints return JSON with this shape:

```json
// Success
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message"
}

// Error
{
  "success": false,
  "message": "Error description",
  "error": "VALIDATION_ERROR"  // optional machine-readable code
}
```

---

## API Groups

---

### `/api/health` — Server Health ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | None | Server liveness check |
| GET | `/api/health/db` | None | Database connectivity check |

**GET /api/health** — Response:
```json
{
  "success": true,
  "message": "Rubbish Revamp API is running",
  "timestamp": "2026-09-11T10:30:00.000Z",
  "environment": "development",
  "version": "1.0.0"
}
```

---

### `/api/auth` — Authentication [Phase 2]

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Create new user account |
| POST | `/api/auth/login` | None | Authenticate + get JWT |
| POST | `/api/auth/logout` | JWT | Invalidate session |
| GET | `/api/auth/me` | JWT | Get current user profile |
| POST | `/api/auth/forgot-password` | None | Send reset email |
| POST | `/api/auth/reset-password` | Token | Set new password |
| PUT | `/api/auth/profile` | JWT | Update profile fields |
| PUT | `/api/auth/change-password` | JWT | Change password |

**POST /api/auth/register** — Request body:
```json
{
  "email": "seller@example.com",
  "password": "SecurePass@123",
  "displayName": "Rajesh Kumar",
  "role": "seller",
  "companyName": "Kumar Textiles",
  "phone": "+91-9876543210"
}
```

**POST /api/auth/login** — Request body:
```json
{
  "email": "seller@example.com",
  "password": "SecurePass@123"
}
```

---

### `/api/listings` — Waste Listings [Phase 2]

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/listings` | Optional | Browse listings (paginated, filterable) |
| GET | `/api/listings/:id` | Optional | Get single listing |
| POST | `/api/listings` | JWT (seller) | Create new listing |
| PATCH | `/api/listings/:id` | JWT (owner) | Update listing |
| DELETE | `/api/listings/:id` | JWT (owner) | Delete listing |
| POST | `/api/listings/:id/image` | JWT (owner) | Upload listing image |
| GET | `/api/listings/my` | JWT (seller) | Get seller's own listings |

**Query Parameters (GET /api/listings)**:
```
?search=steel
&wasteType=Metal
&location=Erode
&priceMin=10
&priceMax=50
&status=Available
&page=1
&limit=20
```

---

### `/api/requests` — Collection Requests [Phase 2]

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/requests` | JWT | List user's requests (buyer or seller view) |
| GET | `/api/requests/:id` | JWT | Get request with tracking history |
| POST | `/api/requests` | JWT (buyer) | Place a new collection request |
| PATCH | `/api/requests/:id/status` | JWT (seller) | Update request status |
| POST | `/api/requests/:id/confirm-delivery` | JWT (buyer) | Confirm delivery (OTP) |
| POST | `/api/requests/:id/cancel` | JWT | Cancel a request |

---

### `/api/dashboard` — Analytics & KPIs [Phase 2]

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard/seller` | JWT (seller) | Seller KPI summary |
| GET | `/api/dashboard/buyer` | JWT (buyer) | Buyer KPI summary |
| GET | `/api/dashboard/seller/revenue` | JWT (seller) | Monthly revenue timeseries |
| GET | `/api/dashboard/seller/waste-breakdown` | JWT (seller) | Waste type pie data |
| GET | `/api/dashboard/seller/green-score` | JWT (seller) | Eco/green score |

---

### `/api/notifications` — Notifications [Phase 2]

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | JWT | Get all notifications |
| PATCH | `/api/notifications/:id/read` | JWT | Mark single as read |
| PATCH | `/api/notifications/read-all` | JWT | Mark all as read |
| DELETE | `/api/notifications` | JWT | Clear all notifications |

**Real-time consideration**: See `docs/architecture.md` — Realtime section.

---

### `/api/ratings` — Ratings [Phase 2]

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/ratings` | JWT (buyer) | Submit rating after delivery |
| GET | `/api/ratings/seller/:id` | None | Get seller's public ratings |
| GET | `/api/ratings/seller/:id/summary` | None | Avg rating + count |

---

### `/api/admin` — Admin Panel [Phase 3]

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/users` | JWT (admin) | List all users |
| PATCH | `/api/admin/users/:id/status` | JWT (admin) | Activate/deactivate user |
| GET | `/api/admin/listings` | JWT (admin) | Moderate listings |
| GET | `/api/admin/requests` | JWT (admin) | View all orders |
| POST | `/api/admin/disputes/:id/resolve` | JWT (admin) | Resolve a dispute |

---

## Error Codes

| HTTP Status | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation failed) |
| 401 | Unauthorised (no/invalid JWT) |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate email) |
| 422 | Unprocessable Entity |
| 500 | Internal Server Error |
| 503 | Service Unavailable (DB down) |

---

## Pagination Convention

All list endpoints that return arrays use:

```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 142,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```
