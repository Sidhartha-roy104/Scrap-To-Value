/**
 * services/adminService.ts
 * ------------------------
 * Frontend client for Admin APIs.
 */

import { apiClient, type ApiResponse } from '@/services/api';
import type { RequestStatus, TrackingUpdate, FulfillmentActivity } from '@/services/requestService';

export interface AdminStats {
  users: {
    total: number;
    buyers: number;
    sellers: number;
    admins: number;
    active: number;
    inactive: number;
  };
  orders: {
    total: number;
    pending: number;
    awaiting_payment: number;
    confirmed: number;
    ready_for_pickup: number;
    in_transit: number;
    delivered: number;
    cancelled: number;
    disputed: number;
    total_fulfilled_quantity: number;
    total_order_volume: number;
  };
  payments: {
    total: number;
    succeeded: number;
    total_succeeded_amount: number;
    pending: number;
    failed: number;
  };
  disputes: {
    total: number;
    active: number;
    open: number;
    under_review: number;
    resolved: number;
    rejected: number;
    closed: number;
  };
  inventory: {
    total_listings: number;
    available_quantity: number;
    reserved_quantity: number;
    fulfilled_quantity: number;
  };
}

export interface AdminOrder {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  waste_type: string;
  quantity: number;
  price_per_kg: number;
  amount: number;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  ready_at?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  fulfillment_notes?: string | null;
  buyer_message?: string | null;
  dispute_count: number;
  listing: {
    id: string;
    title: string;
    unit: string;
    image_url?: string | null;
  };
  buyer: {
    id: string;
    name: string;
    email: string;
    company?: string | null;
  };
  seller: {
    id: string;
    name: string;
    email: string;
    company?: string | null;
  };
  reservation?: {
    status: string;
    reserved_quantity: number;
  };
  payment?: {
    id: string;
    status: string;
    amount: number;
    payment_method?: string | null;
    paid_at?: string | null;
  };
}

export interface AdminOrderDetails extends AdminOrder {
  tracking_updates: TrackingUpdate[];
  estimated_delivery?: string | null;
  listing: {
    id: string;
    title: string;
    unit: string;
    image_url?: string | null;
    location?: string | null;
    available_quantity: number;
    reserved_quantity: number;
    fulfilled_quantity: number;
  };
  buyer: {
    id: string;
    name: string;
    email: string;
    company?: string | null;
    phone?: string | null;
  };
  seller: {
    id: string;
    name: string;
    email: string;
    company?: string | null;
    phone?: string | null;
  };
  fulfillment_activity: FulfillmentActivity[];
  disputes: Array<{
    id: string;
    reason: string;
    status: string;
    raised_by_name?: string;
    created_at: string;
  }>;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  full_name: string | null;
  company_name?: string | null;
  company_address?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  kyc_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  listing_count: number;
  buyer_order_count: number;
  seller_order_count: number;
}

export async function getAdminStats(): Promise<ApiResponse<{ stats: AdminStats }>> {
  return apiClient.get<ApiResponse<{ stats: AdminStats }>>('/api/admin/stats');
}

export async function getAdminOrders(params?: {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  buyerId?: string;
  sellerId?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ orders: AdminOrder[]; total: number; page: number; totalPages: number }>> {
  const qs = new URLSearchParams();
  if (params?.search) qs.append('search', params.search);
  if (params?.status) qs.append('status', params.status);
  if (params?.dateFrom) qs.append('dateFrom', params.dateFrom);
  if (params?.dateTo) qs.append('dateTo', params.dateTo);
  if (params?.buyerId) qs.append('buyerId', params.buyerId);
  if (params?.sellerId) qs.append('sellerId', params.sellerId);
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));

  const queryStr = qs.toString();
  return apiClient.get<ApiResponse<{ orders: AdminOrder[]; total: number; page: number; totalPages: number }>>(
    `/api/admin/orders${queryStr ? `?${queryStr}` : ''}`
  );
}

export async function getAdminOrderById(id: string): Promise<ApiResponse<{ order: AdminOrderDetails }>> {
  return apiClient.get<ApiResponse<{ order: AdminOrderDetails }>>(`/api/admin/orders/${id}`);
}

export async function getAdminUsers(params?: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ users: AdminUser[]; total: number; page: number; totalPages: number }>> {
  const qs = new URLSearchParams();
  if (params?.search) qs.append('search', params.search);
  if (params?.role) qs.append('role', params.role);
  if (params?.status) qs.append('status', params.status);
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));

  const queryStr = qs.toString();
  return apiClient.get<ApiResponse<{ users: AdminUser[]; total: number; page: number; totalPages: number }>>(
    `/api/admin/users${queryStr ? `?${queryStr}` : ''}`
  );
}

export async function getAdminUserById(id: string): Promise<ApiResponse<{ user: AdminUser }>> {
  return apiClient.get<ApiResponse<{ user: AdminUser }>>(`/api/admin/users/${id}`);
}

export async function updateUserStatus(
  id: string,
  isActive: boolean
): Promise<ApiResponse<{ user: AdminUser }>> {
  return apiClient.patch<ApiResponse<{ user: AdminUser }>>(`/api/admin/users/${id}/status`, {
    is_active: isActive,
  });
}
