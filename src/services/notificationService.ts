/**
 * notificationService.ts
 * -----------------------
 * Notification service for the Rubbish Revamp backend REST API.
 *
 * PHASE 1 STATUS: Stubs only — NOT connected to any backend endpoint.
 * CURRENT DATA SOURCE: Supabase `notifications` table with Realtime subscription
 *   (see src/hooks/useNotifications.tsx).
 *
 * In Phase 2:
 *   - Implement REST polling or WebSocket connection against /api/notifications.
 *   - Replace Supabase Realtime subscription in useNotifications.tsx.
 *   - Consider Server-Sent Events (SSE) as a lightweight alternative to WebSockets.
 */

import { apiClient, type ApiResponse } from '@/services/api';

// ---------------------------------------------------------------------------
// Types (mirrors useNotifications.tsx AppNotification)
// ---------------------------------------------------------------------------

export type NotificationType = 'listing' | 'deal' | 'score' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface CreateNotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Service functions (Phase 2 — TODO)
// ---------------------------------------------------------------------------

/**
 * TODO Phase 2: GET /api/notifications
 * Returns all notifications for the authenticated user.
 */
export async function getNotifications(): Promise<ApiResponse<Notification[]>> {
  // TODO Phase 2: return apiClient.get('/api/notifications');
  throw new Error('[notificationService] getNotifications() is not implemented yet. Currently handled by Supabase + Realtime.');
}

/**
 * TODO Phase 2: PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 */
export async function markAsRead(
  _id: string,
): Promise<ApiResponse<void>> {
  // TODO Phase 2: return apiClient.patch(`/api/notifications/${id}/read`, {});
  throw new Error('[notificationService] markAsRead() is not implemented yet. Currently handled by Supabase.');
}

/**
 * TODO Phase 2: PATCH /api/notifications/read-all
 * Marks all notifications as read.
 */
export async function markAllAsRead(): Promise<ApiResponse<void>> {
  // TODO Phase 2: return apiClient.patch('/api/notifications/read-all', {});
  throw new Error('[notificationService] markAllAsRead() is not implemented yet. Currently handled by Supabase.');
}

/**
 * TODO Phase 2: DELETE /api/notifications
 * Clears all notifications for the authenticated user.
 */
export async function clearAllNotifications(): Promise<ApiResponse<void>> {
  // TODO Phase 2: return apiClient.delete('/api/notifications');
  throw new Error('[notificationService] clearAllNotifications() is not implemented yet. Currently handled by Supabase.');
}

/**
 * TODO Phase 2: Consider using SSE or WebSocket for real-time.
 * Supabase currently provides this via postgres_changes subscription.
 * In Phase 2, choose between:
 *   Option A: GET /api/notifications/stream (SSE — EventSource)
 *   Option B: WebSocket connection via ws/socket.io
 *   Option C: Polling every N seconds using getNotifications()
 */
export function subscribeToNotifications(
  _onNotification: (notification: Notification) => void,
): () => void {
  // TODO Phase 2: implement SSE or WebSocket subscription
  console.warn('[notificationService] subscribeToNotifications() is not implemented yet. Currently handled by Supabase Realtime.');
  // Return a no-op unsubscribe function
  return () => {};
}
