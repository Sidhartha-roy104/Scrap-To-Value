/**
 * dashboardService.ts
 * --------------------
 * Dashboard KPI / analytics service for the Rubbish Revamp backend REST API.
 *
 * PHASE 1 STATUS: Stubs only — NOT connected to any backend endpoint.
 * CURRENT DATA SOURCE: Supabase (various tables aggregated in components).
 *
 * In Phase 2:
 *   - Implement each function against /api/dashboard endpoints.
 *   - Replace direct Supabase aggregation calls in BuyerDashboard.tsx
 *     and SellerDashboard.tsx with these functions.
 */

import { apiClient, type ApiResponse } from '@/services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SellerKPIs {
  totalListings: number;
  activeListings: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  averageRating: number | null;
  totalRatings: number;
  greenScore: number;
  co2Saved: number; // kilograms
  wasteRecycled: number; // kilograms
}

export interface BuyerKPIs {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalSpend: number;
  uniqueSellers: number;
  greenScore: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  orders: number;
}

export interface WasteTypeBreakdown {
  wasteType: string;
  quantity: number;
  revenue: number;
  percentage: number;
}

// ---------------------------------------------------------------------------
// Service functions (Phase 2 — TODO)
// ---------------------------------------------------------------------------

/**
 * TODO Phase 2: GET /api/dashboard/seller
 * Returns KPIs for the seller dashboard.
 */
export async function getSellerKPIs(): Promise<ApiResponse<SellerKPIs>> {
  // TODO Phase 2: return apiClient.get('/api/dashboard/seller');
  throw new Error('[dashboardService] getSellerKPIs() is not implemented yet. Currently aggregated from Supabase.');
}

/**
 * TODO Phase 2: GET /api/dashboard/buyer
 * Returns KPIs for the buyer dashboard.
 */
export async function getBuyerKPIs(): Promise<ApiResponse<BuyerKPIs>> {
  // TODO Phase 2: return apiClient.get('/api/dashboard/buyer');
  throw new Error('[dashboardService] getBuyerKPIs() is not implemented yet. Currently aggregated from Supabase.');
}

/**
 * TODO Phase 2: GET /api/dashboard/seller/revenue
 * Returns monthly revenue time-series for analytics charts.
 */
export async function getRevenueTimeSeries(
  _months?: number,
): Promise<ApiResponse<RevenueDataPoint[]>> {
  // TODO Phase 2: return apiClient.get(`/api/dashboard/seller/revenue?months=${months ?? 6}`);
  throw new Error('[dashboardService] getRevenueTimeSeries() is not implemented yet. Currently aggregated from Supabase.');
}

/**
 * TODO Phase 2: GET /api/dashboard/seller/waste-breakdown
 * Returns waste type distribution for analytics pie charts.
 */
export async function getWasteTypeBreakdown(): Promise<ApiResponse<WasteTypeBreakdown[]>> {
  // TODO Phase 2: return apiClient.get('/api/dashboard/seller/waste-breakdown');
  throw new Error('[dashboardService] getWasteTypeBreakdown() is not implemented yet. Currently aggregated from Supabase.');
}

/**
 * TODO Phase 2: GET /api/dashboard/seller/green-score
 * Returns the current green/eco score for the authenticated user.
 */
export async function getGreenScore(): Promise<ApiResponse<{ score: number; level: string; co2Saved: number }>> {
  // TODO Phase 2: return apiClient.get('/api/dashboard/seller/green-score');
  throw new Error('[dashboardService] getGreenScore() is not implemented yet. Currently handled by useGreenScore.ts.');
}
