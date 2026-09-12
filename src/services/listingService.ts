/**
 * listingService.ts
 * ------------------
 * Waste listing CRUD service for the Rubbish Revamp backend REST API.
 * Connects directly to Express + MySQL backend at /api/listings.
 */

import { apiClient, type ApiResponse } from '@/services/api';

// ---------------------------------------------------------------------------
// Types matching MySQL `waste_listings` table
// ---------------------------------------------------------------------------

export interface DbWasteListing {
  id: string;
  user_id: string;
  waste_type: string;
  title: string;
  description: string | null;
  quantity: number;
  total_quantity?: number;
  available_quantity?: number;
  reserved_quantity?: number;
  fulfilled_quantity?: number;
  unit: string;
  price_per_kg: number;
  total_price: number;
  location: string;
  image_url: string | null;
  status: 'Available' | 'Sold' | 'Pending';
  created_at: string;
  updated_at: string;
  seller?: {
    name: string;
    company: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
}

export interface CreateListingPayload {
  waste_type: string;
  title: string;
  description?: string | null;
  quantity: number;
  unit?: string;
  price_per_kg: number;
  total_price?: number;
  location: string;
  image_url?: string | null;
  status?: 'Available' | 'Sold' | 'Pending';
}

export interface UpdateListingPayload extends Partial<CreateListingPayload> {}

export interface ListingFilters {
  search?: string;
  category?: string;
  wasteType?: string;
  waste_type?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  min_price?: number;
  max_price?: number;
  min_quantity?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'quantity_desc';
  status?: string;
  user_id?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedListings {
  listings: DbWasteListing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Helper: Resolve Image URL
// ---------------------------------------------------------------------------

/**
 * Resolves an image URL to a full browser-accessible URL.
 * Handles null/undefined, relative paths (/uploads/...), and full URLs.
 */
export function resolveImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const backendOrigin = apiBase.replace(/\/api\/?$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${backendOrigin}${cleanPath}`;
}

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

/**
 * GET /api/listings
 * Retrieves listings with search, filters, sorting, and pagination.
 */
export async function getListings(
  filters?: ListingFilters,
): Promise<ApiResponse<PaginatedListings>> {
  const params = new URLSearchParams();

  if (filters?.search && filters.search.trim()) params.append('search', filters.search.trim());
  const cat = filters?.category || filters?.wasteType || filters?.waste_type;
  if (cat && cat !== 'All') params.append('category', cat);
  if (filters?.location && filters.location !== 'All') params.append('location', filters.location);
  
  const minP = filters?.min_price !== undefined ? filters.min_price : filters?.priceMin;
  if (minP !== undefined && minP !== null && !isNaN(minP)) params.append('min_price', String(minP));

  const maxP = filters?.max_price !== undefined ? filters.max_price : filters?.priceMax;
  if (maxP !== undefined && maxP !== null && !isNaN(maxP)) params.append('max_price', String(maxP));

  if (filters?.min_quantity !== undefined && filters.min_quantity !== null && !isNaN(filters.min_quantity)) {
    params.append('min_quantity', String(filters.min_quantity));
  }

  if (filters?.sort) params.append('sort', filters.sort);
  if (filters?.status && filters.status !== 'All') params.append('status', filters.status);
  if (filters?.user_id) params.append('user_id', filters.user_id);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  const qs = params.toString();
  const endpoint = qs ? `/listings?${qs}` : '/listings';

  return apiClient.get<ApiResponse<PaginatedListings>>(endpoint);
}

/**
 * GET /api/listings/:id
 * Retrieves a single listing by its ID.
 */
export async function getListingById(
  id: string,
): Promise<ApiResponse<{ listing: DbWasteListing }>> {
  return apiClient.get<ApiResponse<{ listing: DbWasteListing }>>(`/listings/${id}`);
}

/**
 * POST /api/listings
 * Creates a new waste listing with authenticated seller credentials.
 * Supports either JSON CreateListingPayload or multipart FormData.
 */
export async function createListing(
  payload: CreateListingPayload | FormData,
): Promise<ApiResponse<{ listing: DbWasteListing }>> {
  return apiClient.post<ApiResponse<{ listing: DbWasteListing }>>('/listings', payload);
}

/**
 * PATCH /api/listings/:id
 * Updates an existing waste listing owned by the seller.
 * Supports either JSON UpdateListingPayload or multipart FormData.
 */
export async function updateListing(
  id: string,
  payload: UpdateListingPayload | FormData,
): Promise<ApiResponse<{ listing: DbWasteListing }>> {
  return apiClient.patch<ApiResponse<{ listing: DbWasteListing }>>(`/listings/${id}`, payload);
}

/**
 * DELETE /api/listings/:id
 * Deletes a waste listing owned by the seller.
 */
export async function deleteListing(
  id: string,
): Promise<ApiResponse<void>> {
  return apiClient.delete<ApiResponse<void>>(`/listings/${id}`);
}

/**
 * POST /api/listings/upload-image
 * Uploads an image file using multipart/form-data and returns the browser-accessible URL.
 */
export async function uploadListingImage(
  file: File,
): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await apiClient.post<ApiResponse<{ imageUrl: string; imagePath: string }>>(
    '/listings/upload-image',
    formData
  );

  if (res.data?.imageUrl) {
    return resolveImageUrl(res.data.imageUrl) || res.data.imageUrl;
  }
  throw new Error(res.message || 'Failed to upload image');
}

export interface ListingInventory {
  listing_id: string;
  seller_id: string;
  title: string;
  waste_type: string;
  unit: string;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  fulfilled_quantity: number;
  price_per_kg: number;
  status: string;
  is_in_stock: boolean;
  balanced: boolean;
}

export interface InventoryHistoryItem {
  id: string;
  listing_id: string;
  order_id: string | null;
  transaction_type: 'ADDITION' | 'RESERVATION' | 'RELEASE' | 'FULFILLMENT' | 'ADJUSTMENT';
  quantity: number;
  previous_available_quantity: number;
  resulting_available_quantity: number;
  actor_id: string | null;
  actor_name: string | null;
  source: string;
  note: string | null;
  created_at: string;
}

/**
 * GET /api/inventory/listings/:id
 * Fetches real-time inventory breakdown for a listing.
 */
export async function getListingInventory(
  listingId: string
): Promise<ApiResponse<{ inventory: ListingInventory }>> {
  return apiClient.get<ApiResponse<{ inventory: ListingInventory }>>(`/inventory/listings/${listingId}`);
}

/**
 * GET /api/inventory/listings/:id/history
 * Fetches transaction ledger history for a listing (seller only).
 */
export async function getListingInventoryHistory(
  listingId: string,
  limit: number = 50
): Promise<ApiResponse<{ history: InventoryHistoryItem[] }>> {
  return apiClient.get<ApiResponse<{ history: InventoryHistoryItem[] }>>(`/inventory/listings/${listingId}/history?limit=${limit}`);
}

