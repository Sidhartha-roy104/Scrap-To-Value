import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getUserReviews,
  getSellerReviews,
  getOrderReviews,
  getMyReviews,
  createReview,
  updateReview,
  deleteReview,
  type Review,
  type RatingSummary,
} from '@/services/reviewService';

export interface SellerRating {
  avg_rating: number;
  total_ratings: number;
  distribution?: Record<number, number>;
}

/**
 * Hook to fetch rating summary and visible reviews for any user (seller or buyer)
 */
export function useUserReviews(userId: string | undefined, role?: 'seller' | 'buyer') {
  return useQuery({
    queryKey: ['user_reviews', userId, role],
    queryFn: async () => {
      if (!userId) return null;
      return getUserReviews(userId, { role });
    },
    enabled: !!userId,
  });
}

/**
 * Hook for displaying public seller rating badges based strictly on buyer reviews
 */
export function useSellerRating(sellerId: string | undefined) {
  return useQuery({
    queryKey: ['seller_rating', sellerId],
    queryFn: async (): Promise<SellerRating> => {
      if (!sellerId) return { avg_rating: 0, total_ratings: 0 };
      try {
        const data = await getSellerReviews(sellerId);
        return {
          avg_rating: data.averageRating,
          total_ratings: data.reviewCount,
          distribution: data.summary.distribution,
        };
      } catch (err) {
        console.warn(`[useSellerRating] Failed to fetch rating for seller ${sellerId}:`, err);
        return { avg_rating: 0, total_ratings: 0 };
      }
    },
    enabled: !!sellerId,
  });
}

/**
 * Hook to inspect review status for a specific order
 */
export function useOrderReviews(requestId: string | undefined) {
  return useQuery({
    queryKey: ['order_reviews', requestId],
    queryFn: async () => {
      if (!requestId) return null;
      return getOrderReviews(requestId);
    },
    enabled: !!requestId,
  });
}

/**
 * Hook to fetch current user's authored reviews
 */
export function useMyReviews() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my_reviews', user?.id],
    queryFn: async () => {
      if (!user) return { reviews: [], pagination: { total: 0 } };
      return getMyReviews();
    },
    enabled: !!user,
  });
}
