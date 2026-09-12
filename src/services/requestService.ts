/**
 * requestService.ts
 * ------------------
 * Collection request service for the Rubbish Revamp REST API.
 * Connected to Node.js backend (/api/requests) backed by MySQL.
 */

import { apiClient, type ApiResponse } from '@/services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RequestStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'confirmed'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'disputed';

export interface TrackingUpdate {
  timestamp: string;
  status: string;
  note?: string;
}

export interface FulfillmentActivity {
  id: string;
  request_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string;
  actor_role: string;
  actor_name?: string;
  notes: string | null;
  created_at: string;
}

export interface CollectionRequest {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  waste_type: string;
  quantity: number;
  price_per_kg: number;
  amount: number;
  buyer_message?: string | null;
  status: RequestStatus;
  tracking_updates: TrackingUpdate[];
  estimated_delivery?: string | null;
  delivery_otp?: string | null;
  created_at: string;
  updated_at: string;
  ready_at?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  fulfillment_notes?: string | null;
  reservation?: {
    status: string;
    reserved_quantity: number;
  };
  payment?: {
    id: string;
    status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REFUND_PENDING' | 'REFUNDED';
    amount: number;
    payment_method?: string | null;
    paid_at?: string | null;
  };
  listing?: {
    id: string;
    title: string;
    unit: string;
    image_url?: string | null;
    location?: string | null;
    total_quantity?: number;
    available_quantity?: number;
    reserved_quantity?: number;
  };
  buyer?: {
    id: string;
    name: string;
    email: string;
    company?: string | null;
    phone?: string | null;
  };
  seller?: {
    id: string;
    name: string;
    email: string;
    company?: string | null;
    phone?: string | null;
  };
}

export interface CreateRequestPayload {
  listing_id: string;
  requested_quantity: number;
  buyer_message?: string | null;
}

export interface PaginatedRequests {
  requests: CollectionRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

/**
 * POST /api/requests
 * Creates a new scrap collection request for the authenticated buyer.
 */
export async function createRequest(
  payload: CreateRequestPayload,
): Promise<ApiResponse<{ request: CollectionRequest }>> {
  return apiClient.post<ApiResponse<{ request: CollectionRequest }>>(
    '/api/requests',
    payload,
  );
}

/**
 * GET /api/requests
 * Retrieves all collection requests associated with the authenticated user.
 */
export async function getRequests(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<PaginatedRequests>> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));

  const qs = query.toString();
  return apiClient.get<ApiResponse<PaginatedRequests>>(
    `/api/requests${qs ? `?${qs}` : ''}`,
  );
}

/**
 * GET /api/requests/:id
 * Retrieves a single collection request by ID.
 */
export async function getRequestById(
  id: string,
): Promise<ApiResponse<{ request: CollectionRequest }>> {
  return apiClient.get<ApiResponse<{ request: CollectionRequest }>>(
    `/api/requests/${id}`,
  );
}

/**
 * PATCH /api/requests/:id/status
 * Updates status of a request (confirmed, in_transit, delivered, cancelled).
 */
export async function updateRequestStatus(
  id: string,
  payload: {
    status: RequestStatus;
    note?: string;
    estimated_delivery?: string;
  },
): Promise<ApiResponse<{ request: CollectionRequest }>> {
  return apiClient.patch<ApiResponse<{ request: CollectionRequest }>>(
    `/api/requests/${id}/status`,
    payload,
  );
}

/**
 * GET /api/requests/:id/history
 * Retrieves fulfillment audit history for a collection request.
 */
export async function getFulfillmentHistory(
  id: string,
): Promise<ApiResponse<{ history: FulfillmentActivity[] }>> {
  return apiClient.get<ApiResponse<{ history: FulfillmentActivity[] }>>(
    `/api/requests/${id}/history`,
  );
}
