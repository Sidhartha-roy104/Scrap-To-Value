import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Rating {
  id: string;
  transaction_id: string;
  buyer_id: string;
  seller_id: string;
  rating: number;
  review: string | null;
  created_at: string;
}

export interface SellerRating {
  avg_rating: number;
  total_ratings: number;
}

export function useRatings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch ratings the current user has given
  const { data: myRatings = [] } = useQuery({
    queryKey: ['ratings', 'mine', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('buyer_id', user!.id);
      if (error) throw error;
      return data as Rating[];
    },
    enabled: !!user,
  });

  const submitRating = useMutation({
    mutationFn: async (input: {
      transaction_id: string;
      seller_id: string;
      rating: number;
      review?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('ratings').insert({
        transaction_id: input.transaction_id,
        buyer_id: user.id,
        seller_id: input.seller_id,
        rating: input.rating,
        review: input.review || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] });
      queryClient.invalidateQueries({ queryKey: ['seller_rating'] });
    },
  });

  const getRatingForTransaction = (transactionId: string): Rating | undefined =>
    myRatings.find(r => r.transaction_id === transactionId);

  return {
    myRatings,
    submitRating: submitRating.mutateAsync,
    isSubmitting: submitRating.isPending,
    getRatingForTransaction,
  };
}

export function useSellerRating(sellerId: string | undefined) {
  return useQuery({
    queryKey: ['seller_rating', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_seller_avg_rating', { _seller_id: sellerId! });
      if (error) throw error;
      const row = (data as unknown as SellerRating[])?.[0];
      return row ?? { avg_rating: 0, total_ratings: 0 };
    },
    enabled: !!sellerId,
  });
}
