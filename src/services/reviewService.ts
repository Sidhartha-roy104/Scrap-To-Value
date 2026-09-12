/**
 * reviewService.ts
 * -----------------
 * Review & Ratings service for Rubbish Revamp B2B Marketplace.
 * Connects to backend endpoints at /api/reviews.
 */

import { apiClient, type ApiResponse } from '@/services/api';

export interface Review {
  id: string;
  request_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_role: 'buyer' | 'seller';
  rating: number;
  comment: string | null;
  status: 'visible' | 'hidden';
  created_at: string;
  updated_at: string;
  reviewer_name?: string;
  reviewer_company?: string | null;
  reviewer_avatar?: string | null;
  reviewee_name?: string;
  reviewee_company?: string | null;
  reviewee_avatar?: string | null;
  order_amount?: number;
  order_waste_type?: string;
}

export interface RatingSummary {
  averageRating: number;
  reviewCount: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface OrderReviewsData {
  requestId: string;
  orderStatus: string;
  reviews: Review[];
  canReview: boolean;
  myReview: Review | null;
  eligibleRole: 'buyer' | 'seller' | null;
  counterparty: {
    id: string;
    name: string;
    company: string | null;
    role: 'buyer' | 'seller';
  } | null;
}

export interface UserReviewsData {
  summary: RatingSummary;
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateReviewInput {
  requestId: string;
  rating: number;
  comment?: string | null;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string | null;
}

/**
 * Submit a review for a delivered order
 */
export async function createReview(input: CreateReviewInput): Promise<Review> {
  const res = await apiClient.post<ApiResponse<Review>>('/reviews', input);
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Failed to submit review');
  }
  return res.data;
}

export interface SellerReviewsData {
  sellerId: string;
  averageRating: number;
  reviewCount: number;
  summary: RatingSummary;
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Fetch public seller reviews and buyer-only rating summary
 */
export async function getSellerReviews(
  sellerId: string,
  params?: { page?: number; limit?: number; rating?: number }
): Promise<SellerReviewsData> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.rating) query.set('rating', String(params.rating));

  const url = `/reviews/seller/${sellerId}${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await apiClient.get<ApiResponse<SellerReviewsData>>(url);
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Failed to fetch seller reviews');
  }
  return res.data;
}

/**
 * Fetch reviews and ratings summary for a specific user (as reviewee)
 */
export async function getUserReviews(
  userId: string,
  params?: { page?: number; limit?: number; rating?: number; role?: 'seller' | 'buyer' }
): Promise<UserReviewsData> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.rating) query.set('rating', String(params.rating));
  if (params?.role) query.set('role', params.role);

  const url = `/reviews/user/${userId}${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await apiClient.get<ApiResponse<UserReviewsData>>(url);
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Failed to fetch user reviews');
  }
  return res.data;
}

/**
 * Fetch reviews and eligibility information for a specific order
 */
export async function getOrderReviews(requestId: string): Promise<OrderReviewsData> {
  const res = await apiClient.get<ApiResponse<OrderReviewsData>>(`/reviews/order/${requestId}`);
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Failed to fetch order reviews');
  }
  return res.data;
}

/**
 * Fetch reviews authored by the current authenticated user
 */
export async function getMyReviews(params?: {
  page?: number;
  limit?: number;
}): Promise<{ reviews: Review[]; pagination: any }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const url = `/reviews/my-reviews${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await apiClient.get<ApiResponse<{ reviews: Review[]; pagination: any }>>(url);
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Failed to fetch my reviews');
  }
  return res.data;
}

/**
 * Update an existing review rating or comment
 */
export async function updateReview(reviewId: string, input: UpdateReviewInput): Promise<Review> {
  const res = await apiClient.patch<ApiResponse<Review>>(`/reviews/${reviewId}`, input);
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Failed to update review');
  }
  return res.data;
}

/**
 * Delete / soft-hide a review
 */
export async function deleteReview(reviewId: string): Promise<void> {
  const res = await apiClient.delete<ApiResponse<{ message: string }>>(`/reviews/${reviewId}`);
  if (!res.success) {
    throw new Error(res.message || 'Failed to delete review');
  }
}
