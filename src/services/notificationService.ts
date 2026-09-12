/**
 * services/notificationService.ts
 * --------------------------------
 * Frontend API client for Rubbish Revamp Notification endpoints (/api/notifications).
 * Connected to Express + MySQL backend.
 */

import { apiClient, type ApiResponse } from '@/services/api';

export type NotificationType =
  | 'ORDER_CREATED'
  | 'ORDER_ACCEPTED'
  | 'ORDER_CANCELLED'
  | 'ORDER_CONFIRMED'
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED'
  | 'READY_FOR_PICKUP'
  | 'ORDER_IN_TRANSIT'
  | 'ORDER_DELIVERED'
  | 'DISPUTE_RAISED'
  | 'DISPUTE_UNDER_REVIEW'
  | 'DISPUTE_RESOLVED'
  | 'DISPUTE_REJECTED'
  | 'DISPUTE_CLOSED'
  | 'SELLER_VERIFICATION_UPDATED'
  | 'LISTING_FLAGGED'
  | 'ADMIN_ALERT'
  | 'SYSTEM_ALERT'
  | 'listing'
  | 'deal'
  | 'score'
  | 'system';

export interface AppNotification {
  id: string;
  recipient_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  related_request_id?: string | null;
  related_dispute_id?: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  link?: string | null;
  is_read: boolean;
  read: boolean;
  created_at: string;
  createdAt?: string;
  read_at?: string | null;
}

export interface NotificationPreferences {
  orders_enabled: boolean;
  payments_enabled: boolean;
  fulfillment_enabled: boolean;
  disputes_enabled: boolean;
  listings_enabled: boolean;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * GET /api/notifications
 */
export async function getNotifications(params?: {
  unreadOnly?: boolean;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<NotificationListResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.unreadOnly) queryParams.append('unreadOnly', 'true');
  if (params?.type && params.type !== 'All') queryParams.append('type', params.type);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));

  const url = `/api/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.get<ApiResponse<NotificationListResponse>>(url);
}

/**
 * GET /api/notifications/unread-count
 */
export async function getUnreadCount(): Promise<ApiResponse<{ unreadCount: number }>> {
  return apiClient.get<ApiResponse<{ unreadCount: number }>>('/api/notifications/unread-count');
}

/**
 * PATCH /api/notifications/:id/read
 */
export async function markAsRead(id: string): Promise<ApiResponse<{ id: string; is_read: boolean }>> {
  return apiClient.patch<ApiResponse<{ id: string; is_read: boolean }>>(`/api/notifications/${id}/read`, {});
}

/**
 * PATCH /api/notifications/read-all
 */
export async function markAllAsRead(): Promise<ApiResponse<{ updatedCount: number }>> {
  return apiClient.patch<ApiResponse<{ updatedCount: number }>>('/api/notifications/read-all', {});
}

/**
 * DELETE /api/notifications/:id
 */
export async function deleteNotification(id: string): Promise<ApiResponse<{ id: string; deleted: boolean }>> {
  return apiClient.delete<ApiResponse<{ id: string; deleted: boolean }>>(`/api/notifications/${id}`);
}

/**
 * DELETE /api/notifications
 */
export async function clearAllNotifications(): Promise<ApiResponse<{ deletedCount: number }>> {
  return apiClient.delete<ApiResponse<{ deletedCount: number }>>('/api/notifications');
}

/**
 * GET /api/notifications/preferences
 */
export async function getNotificationPreferences(): Promise<ApiResponse<NotificationPreferences>> {
  return apiClient.get<ApiResponse<NotificationPreferences>>('/api/notifications/preferences');
}

/**
 * PATCH /api/notifications/preferences
 */
export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<ApiResponse<NotificationPreferences>> {
  return apiClient.patch<ApiResponse<NotificationPreferences>>('/api/notifications/preferences', prefs);
}
