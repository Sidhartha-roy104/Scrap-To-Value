/**
 * services/userService.ts
 * ------------------------
 * User profile operations using the Rubbish Revamp REST API.
 */

import { apiClient, type ApiResponse } from '@/services/api';
import type { RRUser } from '@/types/auth';

export interface UserResponse {
  user: RRUser;
}

// Fields the user is allowed to update on their own profile
export interface ProfileUpdatePayload {
  display_name?: string | null;
  phone?: string | null;
  company_name?: string | null;
  company_address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  company_type?: string | null;
  company_description?: string | null;
}

/**
 * GET /api/users/me
 * Retrieves current authenticated user profile from Express + MySQL.
 * Passes Authorization: Bearer <JWT> via apiClient.
 */
export async function getCurrentUser(): Promise<RRUser> {
  const response = await apiClient.get<ApiResponse<UserResponse>>('/api/users/me');

  if (!response.success || !response.data?.user) {
    throw new Error(response.message ?? 'Failed to retrieve user profile');
  }

  return response.data.user;
}

/**
 * PATCH /api/users/me
 * Updates the current user's business profile via Express + MySQL.
 * Only sends changed/provided fields.
 */
export async function updateCurrentUser(
  payload: ProfileUpdatePayload,
): Promise<RRUser> {
  const response = await apiClient.patch<ApiResponse<UserResponse>>(
    '/api/users/me',
    payload,
  );

  if (!response.success || !response.data?.user) {
    throw new Error(response.message ?? 'Failed to update profile');
  }

  return response.data.user;
}
