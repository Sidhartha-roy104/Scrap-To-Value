/**
 * services/paymentService.ts
 * --------------------------
 * Frontend API client for payment lifecycle and mock checkout simulations.
 * Communicates with /api/payments.
 */

import { apiClient, type ApiResponse } from '@/services/api';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export interface PaymentInfo {
  id: string;
  request_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  provider: string;
  provider_order_id?: string | null;
  provider_payment_id?: string | null;
  status: PaymentStatus;
  failure_reason?: string | null;
  created_at: string;
  updated_at: string;
  paid_at?: string | null;
  failed_at?: string | null;
  refunded_at?: string | null;
}

export interface CreatePaymentResponse {
  payment: PaymentInfo;
  order_id: string;
  provider: string;
  provider_order_id?: string | null;
  mock_checkout_token?: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reused: boolean;
}

/**
 * Initiates payment for an order/request.
 */
export async function createPayment({
  requestId,
  paymentMethod = 'mock_upi',
}: {
  requestId: string;
  paymentMethod?: string;
}): Promise<ApiResponse<CreatePaymentResponse>> {
  return apiClient.post<ApiResponse<CreatePaymentResponse>>('/payments', {
    request_id: requestId,
    payment_method: paymentMethod,
  });
}

/**
 * Simulates a successful checkout in mock mode.
 */
export async function simulateMockSuccess({
  paymentId,
  mockPaymentId,
}: {
  paymentId: string;
  mockPaymentId?: string;
}): Promise<ApiResponse<{ payment: PaymentInfo; message: string; alreadyProcessed?: boolean }>> {
  return apiClient.post<ApiResponse<{ payment: PaymentInfo; message: string; alreadyProcessed?: boolean }>>(
    `/payments/${paymentId}/mock-success`,
    { mock_payment_id: mockPaymentId }
  );
}

/**
 * Simulates a failed checkout in mock mode.
 */
export async function simulateMockFailure({
  paymentId,
  reason,
}: {
  paymentId: string;
  reason?: string;
}): Promise<ApiResponse<{ payment: PaymentInfo; message: string }>> {
  return apiClient.post<ApiResponse<{ payment: PaymentInfo; message: string }>>(
    `/payments/${paymentId}/mock-failure`,
    { reason }
  );
}

/**
 * Cancels a pending checkout session.
 */
export async function cancelPaymentCheckout({
  paymentId,
  reason,
}: {
  paymentId: string;
  reason?: string;
}): Promise<ApiResponse<{ payment: PaymentInfo }>> {
  return apiClient.post<ApiResponse<{ payment: PaymentInfo }>>(
    `/payments/${paymentId}/cancel`,
    { reason }
  );
}

/**
 * Retrieves payment details by payment ID.
 */
export async function getPaymentById(
  paymentId: string
): Promise<ApiResponse<{ payment: PaymentInfo }>> {
  return apiClient.get<ApiResponse<{ payment: PaymentInfo }>>(`/payments/${paymentId}`);
}

/**
 * Retrieves latest payment associated with an order/request.
 */
export async function getPaymentByRequestId(
  requestId: string
): Promise<ApiResponse<{ payment: PaymentInfo | null }>> {
  return apiClient.get<ApiResponse<{ payment: PaymentInfo | null }>>(`/payments/order/${requestId}`);
}
