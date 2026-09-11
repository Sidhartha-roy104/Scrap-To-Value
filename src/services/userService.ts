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
