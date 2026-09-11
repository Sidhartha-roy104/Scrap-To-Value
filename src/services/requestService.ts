/**
 * requestService.ts
 * ------------------
 * Collection request (order) service for the Rubbish Revamp backend REST API.
 *
 * PHASE 1 STATUS: Stubs only — NOT connected to any backend endpoint.
 * CURRENT DATA SOURCE: Supabase `transactions` table (see src/hooks/useTransactions.ts).
 *
 * In Phase 2:
 *   - Implement each function against /api/requests endpoints.
 *   - The Supabase `transactions` table maps to `collection_requests` in MySQL.
 *   - Replace Supabase calls in useTransactions.ts with these functions.
 */

import { apiClient, type ApiResponse } from '@/services/api';

// ---------------------------------------------------------------------------
// Types (mirrors Supabase transactions Row)
// ---------------------------------------------------------------------------

export type RequestStatus =
  | 'pending'
  | 'confirmed'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'disputed';

export interface TrackingUpdate {
  timestamp: string;
  status: string;
  note?: string;
}

export interface CollectionRequest {
  id: string;
  listingId: string | null;
  buyerId: string;
  sellerId: string;
  wasteType: string;
  quantity: number;
  amount: number;
  status: RequestStatus;
  trackingUpdates: TrackingUpdate[];
  estimatedDelivery: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequestPayload {
  listingId: string;
  quantity: number;
  amount: number;
  wasteType: string;
  estimatedDelivery?: string;
}

export interface UpdateRequestPayload {
  status?: RequestStatus;
  trackingUpdate?: TrackingUpdate;
  estimatedDelivery?: string;
}

// ---------------------------------------------------------------------------
// Service functions (Phase 2 — TODO)
// ---------------------------------------------------------------------------

/**
 * TODO Phase 2: GET /api/requests
 * Returns all collection requests for the current user (buyer or seller view).
 */
export async function getRequests(): Promise<ApiResponse<CollectionRequest[]>> {
  // TODO Phase 2: return apiClient.get('/api/requests');
  throw new Error('[requestService] getRequests() is not implemented yet. Currently handled by Supabase.');
}

/**
 * TODO Phase 2: GET /api/requests/:id
 * Returns a single collection request with full tracking history.
 */
export async function getRequestById(
  _id: string,
): Promise<ApiResponse<CollectionRequest>> {
  // TODO Phase 2: return apiClient.get(`/api/requests/${id}`);
  throw new Error('[requestService] getRequestById() is not implemented yet. Currently handled by Supabase.');
}

/**
 * TODO Phase 2: POST /api/requests
 * Creates a new collection request (buyer places an order).
 */
export async function createRequest(
  _payload: CreateRequestPayload,
): Promise<ApiResponse<CollectionRequest>> {
  // TODO Phase 2: return apiClient.post('/api/requests', payload);
  throw new Error('[requestService] createRequest() is not implemented yet. Currently handled by Supabase.');
}

/**
 * TODO Phase 2: PATCH /api/requests/:id
 * Updates a request status or adds a tracking update.
 */
export async function updateRequest(
  _id: string,
  _payload: UpdateRequestPayload,
): Promise<ApiResponse<CollectionRequest>> {
  // TODO Phase 2: return apiClient.patch(`/api/requests/${id}`, payload);
  throw new Error('[requestService] updateRequest() is not implemented yet. Currently handled by Supabase.');
}

/**
 * TODO Phase 2: POST /api/requests/:id/confirm-delivery
 * Buyer confirms delivery (OTP or manual).
 */
export async function confirmDelivery(
  _id: string,
  _otp?: string,
): Promise<ApiResponse<CollectionRequest>> {
  // TODO Phase 2: return apiClient.post(`/api/requests/${id}/confirm-delivery`, { otp });
  throw new Error('[requestService] confirmDelivery() is not implemented yet. Currently handled by Supabase.');
}
