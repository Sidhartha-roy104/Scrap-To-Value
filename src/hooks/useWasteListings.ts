import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';


export type DbWasteListing = Tables<'waste_listings'>;

export interface ListingFilters {
  search?: string;
  wasteType?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  status?: string;
}

async function fetchListings(): Promise<DbWasteListing[]> {
  const { data, error } = await supabase
    .from('waste_listings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useWasteListings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['waste_listings'],
    queryFn: fetchListings,
  });

  const addMutation = useMutation({
    mutationFn: async (input: {
      waste_type: string;
      title: string;
      quantity: number;
      unit: string;
      price_per_kg: number;
      total_price: number;
      location: string;
      description: string;
      image?: File;
    }) => {
      if (!user) throw new Error('Not authenticated');

      let image_url: string | null = null;

      if (input.image) {
        const fileExt = input.image.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(filePath, input.image);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('listing-images')
          .getPublicUrl(filePath);
        image_url = urlData.publicUrl;
      }

      const { image, ...rest } = input;
      const { error } = await supabase.from('waste_listings').insert({
        ...rest,
        user_id: user.id,
        status: 'Available',
        image_url,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waste_listings'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from('waste_listings').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waste_listings'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('waste_listings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waste_listings'] }),
  });

  const filterListings = useCallback(
    (filters: ListingFilters): DbWasteListing[] => {
      return listings.filter((listing) => {
        if (filters.search) {
          const s = filters.search.toLowerCase();
          const matchesSearch =
            listing.title.toLowerCase().includes(s) ||
            listing.waste_type.toLowerCase().includes(s) ||
            listing.location.toLowerCase().includes(s);
          if (!matchesSearch) return false;
        }
        if (filters.wasteType && filters.wasteType !== 'All' && listing.waste_type !== filters.wasteType) return false;
        if (filters.location && filters.location !== 'All' && listing.location !== filters.location) return false;
        if (filters.priceMin !== undefined && listing.price_per_kg < filters.priceMin) return false;
        if (filters.priceMax !== undefined && listing.price_per_kg > filters.priceMax) return false;
        if (filters.status && filters.status !== 'All' && listing.status !== filters.status) return false;
        return true;
      });
    },
    [listings]
  );

  return {
    listings,
    isLoading,
    addListing: addMutation.mutateAsync,
    updateListing: (id: string, updates: Record<string, unknown>) => updateMutation.mutateAsync({ id, updates }),
    deleteListing: deleteMutation.mutateAsync,
    filterListings,
    isAdding: addMutation.isPending,
  };
}
