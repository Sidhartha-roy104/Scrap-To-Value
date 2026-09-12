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

// ----------------------------------------------------
// Platform Operations Types & Client APIs
// ----------------------------------------------------

export interface AdminSeller {
  id: string;
  email: string;
  name: string;
  company?: string | null;
  address?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  kyc_verified: boolean;
  kyc_notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  listings_count: number;
  total_requests_count: number;
  completed_orders_count: number;
  total_sales_volume: number;
  total_fulfilled_kg: number;
}

export interface AdminBuyer {
  id: string;
  email: string;
  name: string;
  company?: string | null;
  address?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  orders_count: number;
  delivered_orders_count: number;
  total_ordered_amount: number;
  total_purchased_kg: number;
}

export interface AdminListing {
  id: string;
  title: string;
  waste_type: string;
  description?: string;
  quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  fulfilled_quantity: number;
  unit: string;
  price_per_kg: number;
  total_price: number;
  location?: string;
  image_url?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  seller: {
    id: string;
    name: string;
    email: string;
    company?: string | null;
    kyc_verified: boolean;
  };
}

export interface AdminInventoryItem {
  id: string;
  title: string;
  waste_type: string;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  fulfilled_quantity: number;
  unit: string;
  price_per_kg: number;
  status: string;
  created_at: string;
  seller_name: string;
  seller_company?: string | null;
}

export interface InventoryTransaction {
  id: string;
  listing_id: string;
  listing_title: string;
  waste_type: string;
  order_id?: string | null;
  transaction_type: string;
  quantity: number;
  previous_available_quantity: number;
  resulting_available_quantity: number;
  actor_name?: string | null;
  source: string;
  note?: string | null;
  created_at: string;
}

export interface AdminPaymentRecord {
  id: string;
  request_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
  buyer: {
    id: string;
    name: string;
    email: string;
  };
  seller: {
    id: string;
    name: string;
  };
  order: {
    waste_type: string;
    quantity: number;
  };
}

export interface AdminFulfillmentOrder {
  id: string;
  listing_id: string;
  listing_title: string;
  waste_type: string;
  quantity: number;
  amount: number;
  status: RequestStatus;
  ready_at?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  fulfillment_notes?: string | null;
  hours_in_status: number;
  is_delayed: boolean;
  created_at: string;
  updated_at: string;
  buyer: {
    id: string;
    name: string;
    company?: string | null;
  };
  seller: {
    id: string;
    name: string;
    company?: string | null;
  };
}

export interface AdminAnalyticsData {
  daily_trends: {
    date: string;
    orders: number;
    delivered: number;
    cancelled: number;
    volume: number;
  }[];
  category_distribution: {
    waste_type: string;
    orders: number;
    quantity_kg: number;
    amount: number;
  }[];
  dispute_distribution: {
    status: string;
    count: number;
  }[];
  user_distribution: {
    role: string;
    count: number;
    active: number;
  }[];
}

export interface AdminActivityLog {
  id: string;
  category: 'FULFILLMENT' | 'DISPUTE' | 'PAYMENT';
  reference_id: string;
  actor_id: string;
  actor_name: string;
  actor_email?: string | null;
  actor_role: string;
  action: string;
  notes?: string | null;
  created_at: string;
}

export interface SystemSettingItem {
  value: string;
  description?: string;
  updated_at: string;
}

// ----------------------------------------------------
// API Client Calls
// ----------------------------------------------------

export async function getAdminSellers(params?: {
  search?: string;
  kycStatus?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ sellers: AdminSeller[]; total: number; page: number; totalPages: number }>> {
  const qs = new URLSearchParams();
  if (params?.search) qs.append('search', params.search);
  if (params?.kycStatus) qs.append('kycStatus', params.kycStatus);
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));

  const queryStr = qs.toString();
  return apiClient.get(`/api/admin/sellers${queryStr ? `?${queryStr}` : ''}`);
}

export async function updateSellerVerification(
  sellerId: string,
  payload: { kyc_verified: boolean; kyc_notes?: string }
): Promise<ApiResponse<{ seller: AdminSeller }>> {
  return apiClient.patch(`/api/admin/sellers/${sellerId}/verify`, payload);
}

export async function getAdminBuyers(params?: {
  search?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ buyers: AdminBuyer[]; total: number; page: number; totalPages: number }>> {
  const qs = new URLSearchParams();
  if (params?.search) qs.append('search', params.search);
  if (params?.isActive) qs.append('isActive', params.isActive);
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));

  const queryStr = qs.toString();
  return apiClient.get(`/api/admin/buyers${queryStr ? `?${queryStr}` : ''}`);
}

export async function getAdminListings(params?: {
  search?: string;
  sellerId?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ listings: AdminListing[]; total: number; page: number; totalPages: number }>> {
  const qs = new URLSearchParams();
  if (params?.search) qs.append('search', params.search);
  if (params?.sellerId) qs.append('sellerId', params.sellerId);
  if (params?.category) qs.append('category', params.category);
  if (params?.status) qs.append('status', params.status);
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));

  const queryStr = qs.toString();
  return apiClient.get(`/api/admin/listings${queryStr ? `?${queryStr}` : ''}`);
}

export async function updateListingStatus(
  listingId: string,
  status: string
): Promise<ApiResponse<{ listing: AdminListing }>> {
  return apiClient.patch(`/api/admin/listings/${listingId}/status`, { status });
}

export async function getAdminInventory(params?: {
  search?: string;
  material?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{
  summary: {
    total_quantity: number;
    total_available: number;
    total_reserved: number;
    total_fulfilled: number;
    total_listings: number;
  };
  inventory: AdminInventoryItem[];
  total: number;
  page: number;
  totalPages: number;
}>> {
  const qs = new URLSearchParams();
  if (params?.search) qs.append('search', params.search);
  if (params?.material) qs.append('material', params.material);
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));

  const queryStr = qs.toString();
  return apiClient.get(`/api/admin/inventory${queryStr ? `?${queryStr}` : ''}`);
}

export async function getInventoryTransactions(params?: {
  listingId?: string;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ transactions: InventoryTransaction[]; total: number; page: number; totalPages: number }>> {
  const qs = new URLSearchParams();
  if (params?.listingId) qs.append('listingId', params.listingId);
  if (params?.type) qs.append('type', params.type);
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));

  const queryStr = qs.toString();
  return apiClient.get(`/api/admin/inventory/transactions${queryStr ? `?${queryStr}` : ''}`);
}

export async function getAdminPayments(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{
  summary: {
    total_payments: number;
    succeeded_count: number;
    succeeded_amount: number;
    pending_count: number;
    failed_count: number;
    total_volume: number;
  };
  payments: AdminPaymentRecord[];
  total: number;
  page: number;
  totalPages: number;
}>> {
  const qs = new URLSearchParams();
  if (params?.search) qs.append('search', params.search);
  if (params?.status) qs.append('status', params.status);
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));

  const queryStr = qs.toString();
  return apiClient.get(`/api/admin/payments${queryStr ? `?${queryStr}` : ''}`);
}

export async function getAdminFulfillment(params?: {
  stage?: string;
  delayedOnly?: boolean | string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{
  pipeline: {
    pending: number;
    awaiting_payment: number;
    confirmed: number;
    ready_for_pickup: number;
    in_transit: number;
    delivered: number;
    disputed: number;
    delayed: number;
  };
  orders: AdminFulfillmentOrder[];
  total: number;
  page: number;
  totalPages: number;
}>> {
  const qs = new URLSearchParams();
  if (params?.stage) qs.append('stage', params.stage);
  if (params?.delayedOnly !== undefined) qs.append('delayedOnly', String(params.delayedOnly));
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));

  const queryStr = qs.toString();
  return apiClient.get(`/api/admin/fulfillment${queryStr ? `?${queryStr}` : ''}`);
}

export async function getAdminAnalytics(): Promise<ApiResponse<AdminAnalyticsData>> {
  return apiClient.get('/api/admin/analytics');
}

export async function getAdminActivityLogs(params?: {
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ logs: AdminActivityLog[]; total: number; page: number; totalPages: number }>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));

  const queryStr = qs.toString();
  return apiClient.get(`/api/admin/activity-logs${queryStr ? `?${queryStr}` : ''}`);
}

export async function getSystemSettings(): Promise<ApiResponse<Record<string, SystemSettingItem>>> {
  return apiClient.get('/api/admin/settings');
}

export async function updateSystemSettings(
  settings: Record<string, string>
): Promise<ApiResponse<Record<string, SystemSettingItem>>> {
  return apiClient.patch('/api/admin/settings', settings);
}
