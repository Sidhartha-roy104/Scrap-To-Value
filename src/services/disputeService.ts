/**
 * services/disputeService.ts
 * --------------------------
 * Frontend client for Dispute Management APIs.
 */

import { apiClient, type ApiResponse } from '@/services/api';

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected' | 'closed';

export interface Dispute {
  id: string;
  request_id: string;
  raised_by: string;
  user_role: 'buyer' | 'seller';
  reason: string;
  description: string | null;
  status: DisputeStatus;
  admin_resolution: string | null;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  raised_by_user?: {
    id: string;
    name: string;
    email: string;
  };
  resolved_by_user?: {
    id: string;
    name: string;
  } | null;
  order?: {
    id: string;
    waste_type: string;
    quantity: number;
    amount: number;
    status: string;
    listing_title?: string;
    buyer_name?: string;
    seller_name?: string;
  };
}

export interface DisputeActivity {
  id: string;
  dispute_id: string;
  actor_id: string;
  actor_name?: string;
  actor_role: string;
  action: string;
  previous_status: string | null;
  new_status: string;
  notes: string | null;
  created_at: string;
}

export interface DisputeDetails extends Dispute {
  activity_history: DisputeActivity[];
}

export async function createDispute(payload: {
  request_id: string;
  reason: string;
  description?: string;
}): Promise<ApiResponse<{ dispute: Dispute }>> {
  return apiClient.post<ApiResponse<{ dispute: Dispute }>>('/api/disputes', payload);
}

export async function getDisputes(params?: {
  status?: string;
  request_id?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ disputes: Dispute[]; total: number; page: number; totalPages: number }>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.append('status', params.status);
  if (params?.request_id) qs.append('request_id', params.request_id);
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));

  const queryStr = qs.toString();
  return apiClient.get<ApiResponse<{ disputes: Dispute[]; total: number; page: number; totalPages: number }>>(
    `/api/disputes${queryStr ? `?${queryStr}` : ''}`
  );
}

export async function getDisputeById(id: string): Promise<ApiResponse<{ dispute: DisputeDetails }>> {
  return apiClient.get<ApiResponse<{ dispute: DisputeDetails }>>(`/api/disputes/${id}`);
}

export async function updateDisputeStatus(
  id: string,
  payload: {
    status: DisputeStatus;
    admin_resolution?: string;
    admin_notes?: string;
  }
): Promise<ApiResponse<{ dispute: Dispute }>> {
  return apiClient.patch<ApiResponse<{ dispute: Dispute }>>(`/api/disputes/${id}/status`, payload);
}

export async function getDisputeHistory(
  id: string
): Promise<ApiResponse<{ history: DisputeActivity[] }>> {
  return apiClient.get<ApiResponse<{ history: DisputeActivity[] }>>(`/api/disputes/${id}/history`);
}
