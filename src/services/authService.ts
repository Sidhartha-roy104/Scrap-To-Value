/**
 * services/authService.ts
 * ------------------------
 * Authentication service for the Rubbish Revamp REST API.
 *
 * PHASE 2: login, register, getMe, logout are fully implemented.
 * PHASE 3 (TODO): forgotPassword, resetPassword require email delivery (nodemailer/Resend).
 *                 Supabase still handles these until Phase 3.
 */

import { apiClient } from '@/services/api';
import type { AuthResponse, MeResponse, RRUser } from '@/types/auth';
import { TOKEN_KEY } from '@/types/auth';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// login — POST /api/auth/login
// ---------------------------------------------------------------------------
export interface LoginCredentials {
  email: string;
  password: string;
}

export async function login(credentials: LoginCredentials): Promise<{ user: RRUser; token: string }> {
  const response = await apiClient.post<AuthResponse>('/api/auth/login', credentials);

  if (!response.success || !response.data) {
    throw new Error(response.message ?? 'Login failed');
  }

  storeToken(response.data.token);
  return response.data;
}

// ---------------------------------------------------------------------------
// register — POST /api/auth/register
// ---------------------------------------------------------------------------
export interface RegisterCredentials {
  full_name: string;
  email: string;
  password: string;
  role: 'buyer' | 'seller';
}

export async function register(credentials: RegisterCredentials): Promise<{ user: RRUser; token: string }> {
  const response = await apiClient.post<AuthResponse>('/api/auth/register', credentials);

  if (!response.success || !response.data) {
    throw new Error(response.message ?? 'Registration failed');
  }

  storeToken(response.data.token);
  return response.data;
}

// ---------------------------------------------------------------------------
// getMe — GET /api/auth/me
// ---------------------------------------------------------------------------
export async function getMe(): Promise<RRUser> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await apiClient.get<MeResponse>('/api/auth/me');

  if (!response.success || !response.data) {
    throw new Error(response.message ?? 'Failed to fetch user');
  }

  return response.data.user;
}

// ---------------------------------------------------------------------------
// logout — client-side only (JWT is stateless)
// ---------------------------------------------------------------------------
export function logout(): void {
  clearToken();
}

// ---------------------------------------------------------------------------
// forgotPassword — TODO Phase 3
// Supabase still handles this via ForgotPassword.tsx
// ---------------------------------------------------------------------------
export async function forgotPassword(_email: string): Promise<void> {
  // TODO Phase 3: POST /api/auth/forgot-password
  // Requires nodemailer or Resend for email delivery.
  // ForgotPassword.tsx currently uses supabase.auth.resetPasswordForEmail().
  throw new Error(
    '[authService] forgotPassword() not implemented yet. ' +
    'ForgotPassword.tsx still uses Supabase for Phase 2.'
  );
}

// ---------------------------------------------------------------------------
// resetPassword — TODO Phase 3
// Supabase still handles this via ResetPassword.tsx
// ---------------------------------------------------------------------------
export async function resetPassword(_token: string, _newPassword: string): Promise<void> {
  // TODO Phase 3: POST /api/auth/reset-password
  // Requires token verification and email delivery infrastructure.
  // ResetPassword.tsx currently uses supabase.auth.updateUser().
  throw new Error(
    '[authService] resetPassword() not implemented yet. ' +
    'ResetPassword.tsx still uses Supabase for Phase 2.'
  );
}
