# Rubbish Revamp — Architecture Overview

## System Overview

**Rubbish Revamp** is a B2B Digital Recycling Marketplace built for Indian MSMEs.

This document describes the **target architecture** after full migration from Supabase to a traditional full-stack setup.

---

## Target Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                            │
│                                                                  │
│   React 18 + TypeScript + Vite                                   │
│   ┌────────────────────────────────────────────────────────┐     │
│   │  Pages (React Router v6)                               │     │
│   │    ↓                                                   │     │
│   │  Custom Hooks (useAuth, useWasteListings, ...)         │     │
│   │    ↓                                                   │     │
│   │  Service Layer (src/services/*.ts)                     │     │
│   │    ↓                                                   │     │
│   │  apiClient (fetch-based HTTP client)                   │     │
│   └────────────────────────────────────────────────────────┘     │
└────────────────────────────┬─────────────────────────────────────┘
                             │  HTTPS REST (JSON)
                             │  Authorization: Bearer <JWT>
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER                              │
│                                                                  │
│   Node.js 18+ + Express.js                                       │
│   ┌────────────────────────────────────────────────────────┐     │
│   │  Express Router                                        │     │
│   │    /api/health        → healthRoutes.js                │     │
│   │    /api/auth          → authRoutes.js         [Phase 2]│     │
│   │    /api/listings      → listingRoutes.js      [Phase 2]│     │
│   │    /api/requests      → requestRoutes.js      [Phase 2]│     │
│   │    /api/dashboard     → dashboardRoutes.js    [Phase 2]│     │
│   │    /api/notifications → notificationRoutes.js [Phase 2]│     │
│   │    /api/admin         → adminRoutes.js        [Phase 3]│     │
│   │                                                        │     │
│   │  Middleware                                            │     │
│   │    cors → morgan → auth guard → validation             │     │
│   │                                                        │     │
│   │  Controllers → Services → DB Layer                     │     │
│   └────────────────────────────────────────────────────────┘     │
└────────────────────────────┬─────────────────────────────────────┘
                             │  mysql2 connection pool
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
│                                                                  │
│   MySQL 8.0                                                      │
│   ┌────────────────────────────────────────────────────────┐     │
│   │  users                                                 │     │
│   │  waste_listings                                        │     │
│   │  collection_requests                                   │     │
│   │  ratings                                               │     │
│   │  notifications                                         │     │
│   └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Current Architecture (Phase 1 — Supabase)

```
React SPA
  ↓ (direct Supabase JS client)
Supabase (PostgreSQL + Auth + Realtime + Storage)
```

The frontend speaks directly to Supabase with no intermediate server.

---

## Data Flow: Request Lifecycle (Target)

```
1. User action (e.g., "Place Order")
2. React Component calls: createRequest(payload)  ← requestService.ts
3. apiClient.post('/api/requests', payload)        ← api.ts
4. HTTP POST → http://localhost:5000/api/requests
5. Express router → authMiddleware (verify JWT)
6. requestController.createRequest()
7. requestService (business logic)
8. pool.execute('INSERT INTO collection_requests ...')
9. MySQL responds
10. JSON response → React Query cache update → UI re-renders
```

---

## Backend Module Structure

```
backend/src/
├── config/
│   └── db.js               ← mysql2 connection pool
├── controllers/            ← request/response handling [Phase 2]
│   ├── authController.js
│   ├── listingController.js
│   ├── requestController.js
│   └── dashboardController.js
├── routes/
│   ├── healthRoutes.js     ← IMPLEMENTED (Phase 1)
│   ├── authRoutes.js       [Phase 2]
│   ├── listingRoutes.js    [Phase 2]
│   └── requestRoutes.js    [Phase 2]
├── services/               ← business logic layer [Phase 2]
├── middleware/             ← auth guard, validation [Phase 2]
├── validators/             ← Joi/Zod schemas [Phase 2]
├── utils/                  ← helpers, error classes [Phase 2]
├── app.js                  ← Express app setup
└── server.js               ← Entry point
```

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | React + TypeScript | 18.3 / 5.8 |
| **Build Tool** | Vite + SWC | 5.4 |
| **Routing** | React Router DOM | v6 |
| **UI** | Tailwind CSS + shadcn/ui | 3.4 |
| **State** | TanStack React Query + Context | v5 |
| **Forms** | React Hook Form + Zod | 7.x / 3.x |
| **Animations** | Framer Motion | 12.x |
| **Backend** | Node.js + Express | 18+ / 4.x |
| **Database** | MySQL | 8.0 |
| **DB Client** | mysql2/promise | 3.x |
| **Auth (target)** | JWT + bcrypt | — |

---

## Authentication Flow (Target — Phase 2)

```
1. POST /api/auth/login { email, password }
2. Server: bcrypt.compare(password, user.password_hash)
3. Server: jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' })
4. Response: { accessToken, user }
5. Frontend: localStorage.setItem('rr_access_token', token)
6. All subsequent requests: Authorization: Bearer <token>
7. Middleware: jwt.verify(token, JWT_SECRET) → req.user
```

---

## Realtime Notifications Strategy (Phase 2 Decision Required)

Currently handled by Supabase Realtime (postgres_changes subscription).

Options for Phase 2:
| Option | Complexity | Description |
|---|---|---|
| **Polling** | Low | GET /api/notifications every 30s |
| **SSE** | Medium | Server-Sent Events (one-way stream) |
| **WebSocket** | High | Bidirectional, requires socket.io |

**Recommendation**: Start with polling in Phase 2, migrate to SSE in Phase 3.
