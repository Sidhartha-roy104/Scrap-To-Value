/**
 * hooks/useUserRole.ts
 * ---------------------
 * User role management hook.
 *
 * PHASE 2 MIGRATION:
 *   Previously: Called supabase.rpc('get_user_role') on every mount.
 *   Now: Reads role directly from the authenticated user object (embedded in JWT).
 *   Role is set at registration time and available immediately after login.
 *
 * setRole (Supabase mutation): Stubbed for Phase 2.
 *   For new REST users, role is set at registration and cannot be changed via
 *   this hook in Phase 2. A PUT /api/auth/role endpoint will be added in Phase 3.
 *
 * NOTE: RoleSelectionScreen will only appear for legacy Supabase users.
 *       REST API users always have a role embedded in their JWT from day 1.
 */

import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'buyer' | 'seller' | 'admin';

export function useUserRole() {
  const { user } = useAuth();

  // Role is embedded in the JWT and populated in user by useAuth.
  const role = (user?.role as AppRole) ?? null;

  // isLoading mirrors useAuth loading — role is available as soon as user is.
  // No separate async fetch needed anymore.
  const isLoading = false;

  /**
   * setRole — TODO Phase 3
   * In Phase 2, role is set at registration and cannot be changed here.
   * When Phase 3 adds PUT /api/auth/role, implement this properly.
   *
   * For now: throws to prevent silent no-ops. Components using setRole
   * (RoleSelectionScreen) are only shown for legacy Supabase users who have
   * no role — new REST users always have a role.
   */
  const setRole = useCallback(async (_newRole: AppRole) => {
    throw new Error(
      '[useUserRole] setRole() is not implemented in Phase 2. ' +
      'Role is set at registration and embedded in the JWT. ' +
      'A role-update endpoint will be added in Phase 3.'
    );
  }, []);

  return {
    role,
    isLoading,
    setRole,
    isSettingRole: false,
  };
}
