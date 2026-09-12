/**
 * hooks/useWasteListings.ts
 * -------------------------
 * Waste listing management hook connected to the Node.js + MySQL backend.
 * Uses TanStack React Query for caching, optimistic updates, and instant invalidation.
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DbWasteListing,
  ListingFilters,
  getListings,
  createListing,
  updateListing,
  deleteListing,
  uploadListingImage,
  CreateListingPayload,
} from '@/services/listingService';

export type { DbWasteListing, ListingFilters };

export interface CreateListingInput {
  waste_type: string;
  title: string;
  quantity: number;
  unit?: string;
  price_per_kg: number;
  total_price?: number;
  location: string;
  country?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  image?: File;
}

export function useWasteListings() {
  const queryClient = useQueryClient();

  // 1. Fetch Listings from MySQL backend via listingService
  const {
    data: listings = [],
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['waste_listings'],
    queryFn: async () => {
      const res = await getListings({ status: 'All', limit: 200 });
      return res.data?.listings ?? [];
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  // 2. Add Listing Mutation
  const addMutation = useMutation({
    mutationFn: async (input: CreateListingInput) => {
      // Step A: Client-side validation
      if (!input.title?.trim()) throw new Error('Scrap material name is required.');
      if (!input.waste_type?.trim()) throw new Error('Waste category is required.');
      if (isNaN(input.quantity) || Number(input.quantity) <= 0) {
        throw new Error('Quantity must be a positive number greater than 0.');
      }
      if (isNaN(input.price_per_kg) || Number(input.price_per_kg) < 0) {
        throw new Error('Price per kg must be 0 or greater.');
      }
      if (!input.location?.trim() && (!input.city?.trim() || !input.state?.trim())) {
        throw new Error('Facility location is required.');
      }

      // Step B: Send payload to backend /api/listings (using FormData if file is attached)
      let res;
      if (input.image) {
        const formData = new FormData();
        formData.append('title', input.title.trim());
        formData.append('waste_type', input.waste_type);
        formData.append('quantity', String(input.quantity));
        formData.append('unit', input.unit || 'kg');
        formData.append('price_per_kg', String(input.price_per_kg));
        formData.append('location', input.location.trim());
        if (input.country?.trim()) formData.append('country', input.country.trim());
        if (input.state?.trim()) formData.append('state', input.state.trim());
        if (input.district?.trim()) formData.append('district', input.district.trim());
        if (input.city?.trim()) formData.append('city', input.city.trim());
        if (input.latitude !== undefined && input.latitude !== null) {
          formData.append('latitude', String(input.latitude));
        }
        if (input.longitude !== undefined && input.longitude !== null) {
          formData.append('longitude', String(input.longitude));
        }
        if (input.description?.trim()) {
          formData.append('description', input.description.trim());
        }
        formData.append('status', 'Available');
        formData.append('image', input.image);

        res = await createListing(formData);
      } else {
        const payload: CreateListingPayload = {
          title: input.title.trim(),
          waste_type: input.waste_type,
          quantity: Number(input.quantity),
          unit: input.unit || 'kg',
          price_per_kg: Number(input.price_per_kg),
          location: input.location.trim(),
          country: input.country?.trim() || 'India',
          state: input.state?.trim() || null,
          district: input.district?.trim() || null,
          city: input.city?.trim() || null,
          latitude: input.latitude !== undefined ? input.latitude : null,
          longitude: input.longitude !== undefined ? input.longitude : null,
          description: input.description?.trim() || null,
          image_url: null,
          status: 'Available',
        };

        res = await createListing(payload);
      }
      if (!res.success || !res.data?.listing) {
        throw new Error(res.message || 'Failed to create listing');
      }
      return res.data.listing;
    },
    onSuccess: () => {
      // Instantly refresh query cache so listing appears in both Seller Dashboard and Buyer Marketplace
      queryClient.invalidateQueries({ queryKey: ['waste_listings'] });
    },
  });

  // 3. Update Listing Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const res = await updateListing(id, updates);
      if (!res.success || !res.data?.listing) {
        throw new Error(res.message || 'Failed to update listing');
      }
      return res.data.listing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_listings'] });
    },
  });

  // 4. Delete Listing Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteListing(id);
      if (!res.success) {
        throw new Error(res.message || 'Failed to delete listing');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_listings'] });
    },
  });

  // 5. Filtering helper
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
        const wt = filters.wasteType || filters.waste_type;
        if (wt && wt !== 'All' && listing.waste_type !== wt) return false;
        if (filters.location && filters.location !== 'All' && !listing.location.includes(filters.location)) {
          return false;
        }
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
    queryError,
    refetch,
    addListing: addMutation.mutateAsync,
    updateListing: (id: string, updates: Record<string, unknown>) =>
      updateMutation.mutateAsync({ id, updates }),
    deleteListing: deleteMutation.mutateAsync,
    filterListings,
    isAdding: addMutation.isPending,
  };
}

/**
 * Hook for server-side marketplace listing discovery with search, filters, sorting, and pagination.
 */
export function useMarketplaceListings(filters: ListingFilters) {
  return useQuery({
    queryKey: ['marketplace_listings', filters],
    queryFn: async () => {
      const res = await getListings({
        ...filters,
        status: 'Available',
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Failed to fetch marketplace listings');
      }
      return res.data;
    },
    staleTime: 1000 * 15,
  });
}

