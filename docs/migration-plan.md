# Rubbish Revamp — Migration Plan

> **Phase**: 1 (Foundation) — Completed  
> **Next Phase**: 2 (Backend Implementation)

---

## 1. Current Architecture

The application currently runs as a **frontend-only SPA** backed entirely by **Supabase** (BaaS):

```
React SPA (Vite + TypeScript)
  ↓ (supabase-js direct client)
Supabase
  ├── PostgreSQL database (tables: profiles, user_roles, waste_listings,
  │                               transactions, notifications, ratings)
  ├── Supabase Auth (email/password, session management, password reset)
  ├── Supabase Storage (listing images in `listing-images` bucket)
  └── Supabase Realtime (postgres_changes subscription for notifications)
```

**No separate backend server exists.** The React app talks directly to Supabase.

---

## 2. Target Architecture

```
React SPA (Vite + TypeScript)
  ↓ HTTP REST (JWT)
Node.js + Express (backend/)
  ↓ mysql2
MySQL 8.0 (database/)
```

The frontend will communicate exclusively through the REST API.
Supabase will be fully removed from the application.

---

## 3. Current Supabase Dependencies

| File | Supabase Feature | Migration Target |
|---|---|---|
| `src/integrations/supabase/client.ts` | `createClient` | Remove entirely |
| `src/hooks/useAuth.tsx` | `supabase.auth.*` | `POST /api/auth/*` |
| `src/pages/Auth.tsx` | `signInWithPassword`, `signUp` | `authService.ts` |
| `src/pages/ForgotPassword.tsx` | `resetPasswordForEmail` | `authService.ts` |
| `src/pages/ResetPassword.tsx` | `updateUser` | `authService.ts` |
| `src/hooks/useWasteListings.ts` | `supabase.from('waste_listings')` | `listingService.ts` |
| `src/hooks/useWasteListings.ts` | Supabase Storage (image upload) | Backend multipart endpoint |
| `src/hooks/useTransactions.ts` | `supabase.from('transactions')` | `requestService.ts` |
| `src/hooks/useNotifications.tsx` | `supabase.from('notifications')` + Realtime | `notificationService.ts` + SSE/polling |
| `src/hooks/useGreenScore.ts` | Supabase queries | `dashboardService.ts` |
| `src/hooks/useRatings.ts` | `supabase.from('ratings')` + RPC | `requestService.ts` / `/api/ratings` |
| `src/components/Navbar.tsx` | `supabase.from('profiles')` | `authService.getMe()` |
| `src/pages/Profile.tsx` | `supabase.from('profiles')` | `authService.updateProfile()` |

---

## 4. Proposed Node.js + Express + MySQL Architecture

### Backend Layers

```
Route → Middleware → Controller → Service → DB (mysql2)
```

| Layer | Responsibility |
|---|---|
| **Router** | Map HTTP method + path to controller |
| **Middleware** | CORS, auth guard (JWT verify), request validation |
| **Controller** | Parse req, call service, format response |
| **Service** | Business logic, orchestration |
| **DB** | `pool.execute(SQL)` via mysql2/promise |

### Error Handling Convention
- All async handlers wrapped in try/catch
- Errors propagate to global Express error handler
- Consistent `{ success, message, error }` envelope

---

## 5. Frontend Migration Strategy

### Approach: Incremental Hook-by-Hook Replacement

Do NOT rewrite all hooks at once. Replace them one at a time to minimise risk:

#### Recommended Migration Order:
1. **Auth** — highest impact, required for all others
2. **Waste Listings** — core feature, large but isolated
3. **Collection Requests** — depends on listings + auth
4. **Notifications** — depends on auth; realtime is a separate concern
5. **Dashboard / Analytics** — aggregation layer, depends on others
6. **Ratings** — depends on requests
7. **Profile** — depends on auth
8. **Green Score** — depends on transactions

#### Per-Hook Migration Steps:
1. Implement backend endpoint
2. Implement TypeScript service function in `src/services/`
3. Update hook to use service instead of Supabase
4. Remove Supabase imports from hook
5. Test thoroughly
6. Move on to next hook

---

## 6. Database Migration Strategy

### Phase 2: Schema Setup
1. Execute `database/schema.sql` on local MySQL 8.0
2. Execute `database/seed.sql` for dev data
3. Review and finalise column types + indexes
4. Add migrations to `database/migrations/`

### Phase 3: Production Data Migration (if applicable)
- Export Supabase PostgreSQL data via `pg_dump` or Supabase dashboard
- Write a data transformation script (PostgreSQL → MySQL type mapping)
- Key differences to handle:
  - UUID: Supabase uses `uuid`, MySQL uses `CHAR(36)` or `BINARY(16)`
  - JSON: both support it natively
  - Timestamps: `TIMESTAMPTZ` → `DATETIME`
  - Boolean: `BOOLEAN` → `TINYINT(1)`

---

## 7. Authentication Migration Plan

### Current: Supabase Auth
- Sessions managed by Supabase (localStorage + refresh tokens)
- `supabase.auth.onAuthStateChange()` used as the auth state listener

### Target: JWT + bcrypt
1. `POST /api/auth/register` — hash password with bcrypt, insert user, return JWT
2. `POST /api/auth/login` — verify password, sign JWT, return token
3. Frontend stores JWT in `localStorage` as `rr_access_token`
4. `useAuth.tsx` refactored to:
   - Store token in state/localStorage instead of Supabase session
   - On app load: verify token validity via `GET /api/auth/me`
   - Remove all `supabase.auth.*` calls

### Password Reset Flow (Target):
1. `POST /api/auth/forgot-password { email }` → send email with signed reset token
2. Email contains link to `/reset-password?token=...`
3. `POST /api/auth/reset-password { token, newPassword }` → verify + update

### Email Provider: TBD (Phase 2)
Options: Nodemailer + Gmail, SendGrid, Resend, AWS SES

---

## 8. Listing Migration Plan

| Current (Supabase) | Target (REST API) |
|---|---|
| `supabase.from('waste_listings').select('*')` | `GET /api/listings` |
| `.insert({ ...listing })` | `POST /api/listings` |
| `.update(updates).eq('id', id)` | `PATCH /api/listings/:id` |
| `.delete().eq('id', id)` | `DELETE /api/listings/:id` |
| Supabase Storage image upload | `POST /api/listings/:id/image` (multer) |

The `filterListings()` function in `useWasteListings.ts` currently filters client-side.
In Phase 2, move filtering to SQL `WHERE` clauses via query parameters.

---

## 9. Collection Request Migration Plan

| Current (Supabase `transactions`) | Target (REST API `collection_requests`) |
|---|---|
| Select all transactions | `GET /api/requests` |
| Insert transaction | `POST /api/requests` |
| Update status | `PATCH /api/requests/:id/status` |
| JSON `tracking_updates` column | MySQL JSON column (same structure) |

Note: Supabase calls it `transactions`; MySQL schema uses `collection_requests` for clarity.
The frontend types in `requestService.ts` already use `CollectionRequest`.

---

## 10. Dashboard Migration Plan

Currently, dashboard KPIs are computed by the frontend via Supabase queries and client-side aggregation.

In Phase 2:
- Move aggregation to SQL (`COUNT`, `SUM`, `AVG`, `GROUP BY`)
- Expose via `GET /api/dashboard/seller` and `GET /api/dashboard/buyer`
- Frontend fetches pre-computed KPIs instead of raw data

Recharts components and chart structure in `src/pages/Analytics.tsx` are preserved.
Only the data source changes.

---

## 11. Features to Preserve

| Feature | Priority |
|---|---|
| Buyer/Seller dual-role system | Critical |
| Waste listing CRUD with image upload | Critical |
| Collection request lifecycle (pending → delivered) | Critical |
| Order tracking with status updates | Critical |
| Post-delivery rating & review | High |
| Notification system | High |
| Green/eco score | High |
| Analytics dashboard (Recharts) | High |
| Dark/Light theme | Medium |
| Responsive design | Medium |
| Password reset flow | Medium |
| Plans/subscription page | Low (Phase 3) |
| Payment integration (Razorpay) | Phase 3 |

---

## 12. Features to Postpone or Remove

| Feature | Decision | Reason |
|---|---|---|
| Supabase Realtime notifications | Replace with polling in Phase 2, SSE in Phase 3 | No WebSocket server yet |
| Supabase Storage (images) | Replace with multer + local/S3 in Phase 2 | Needs backend setup |
| Firebase (currently unused) | Remove in Phase 2 | Never integrated, adds bundle weight |
| `@lovable.dev/cloud-auth-js` | Remove in Phase 2 | Lovable platform-specific, not needed |
| KYC verification flow | Phase 3 | Needs third-party integration |
| Admin panel | Phase 3 | Out of Phase 2 scope |
| AI matching (premium feature) | Phase 4 | Complex ML integration |

---

## 13. Risks and Precautions

| Risk | Severity | Mitigation |
|---|---|---|
| Breaking auth during migration | 🔴 High | Migrate auth last; keep Supabase auth until new auth is fully tested |
| MySQL UUID vs PostgreSQL UUID mismatch | 🟡 Medium | Use `CHAR(36)` in MySQL; generate UUIDs on the backend |
| Supabase Realtime loss during transition | 🟡 Medium | Use polling (30s interval) as temporary replacement |
| Data loss during Supabase → MySQL export | 🔴 High | Always back up Supabase data before any migration step |
| Frontend breaking during incremental migration | 🟡 Medium | Keep Supabase active until each hook is fully replaced + tested |
| CORS misconfiguration | 🟡 Medium | Set `FRONTEND_ORIGIN` env var correctly; test from browser |
| SQL injection in Phase 2 | 🔴 High | Always use parameterised queries with `pool.execute(sql, [params])` |
| JWT secret exposure | 🔴 High | Never commit `.env`; use strong random secret in production |
| Image upload size limits | 🟠 Low-Medium | Set `MAX_FILE_SIZE_MB` env var; validate on backend with multer |
| Node.js version incompatibility | 🟢 Low | Lock to Node.js 18 LTS in `package.json` engines field |

---

## Phase Roadmap

| Phase | Focus | Key Deliverables |
|---|---|---|
| **1** ✅ | Foundation | Structure, branding, backend scaffold, service stubs, docs |
| **2** | Core Backend | Auth API, Listings API, Requests API, MySQL schema, hook migration |
| **3** | Advanced Features | Notifications (SSE), Image upload, Admin panel, Razorpay |
| **4** | Production | Deployment, CI/CD, monitoring, AI matching (optional) |
