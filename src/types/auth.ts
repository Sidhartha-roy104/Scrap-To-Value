/**
 * types/auth.ts
 * --------------
 * Shared TypeScript types for the Rubbish Revamp REST authentication layer.
 *
 * These types represent what the Node.js backend returns.
 * They intentionally mirror the Supabase User interface where possible
 * to minimise changes needed in existing components.
 */

export type AppRole = 'buyer' | 'seller' | 'admin';

/**
 * Safe user object returned by the REST API.
 * Never contains password_hash or other sensitive fields.
 * Maps 1-to-1 with authService.js safeUser() output.
 */
export interface RRUser {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  company_name: string | null;
  company_address?: string | null;
  phone: string | null;
  avatar_url: string | null;
  kyc_verified: boolean;
  created_at: string;
  // Phase 13: Extended B2B business profile fields
  city?: string | null;
  state?: string | null;
  country?: string | null;
  company_type?: string | null;
  company_description?: string | null;
}

/**
 * JWT payload embedded in the token.
 * Matches what signToken() produces in backend/src/utils/jwt.js
 */
export interface JWTPayload {
  id: string;
  email: string;
  role: AppRole;
  iat: number;
  exp: number;
}

/**
 * Response shape from POST /api/auth/login and POST /api/auth/register
 */
export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: RRUser;
    token: string;
  };
}

/**
 * Response shape from GET /api/auth/me
 */
export interface MeResponse {
  success: boolean;
  message?: string;
  data: {
    user: RRUser;
  };
}

// ---------------------------------------------------------------------------
// localStorage key — centralised so it never drifts
// ---------------------------------------------------------------------------
export const TOKEN_KEY = 'rr_access_token';
