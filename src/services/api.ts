/**
 * api.ts
 * -------
 * Base HTTP client for communicating with the Rubbish Revamp Node.js backend.
 *
 * PHASE 1 NOTE:
 *   This file is prepared but NOT yet used by any existing hook or component.
 *   All data fetching is still handled by Supabase clients in src/hooks/.
 *   In Phase 2, existing hooks will be migrated to use this client.
 *
 * Usage (Phase 2+):
 *   import { apiClient } from '@/services/api';
 *   const data = await apiClient.get('/listings');
 */

import { TOKEN_KEY } from '@/types/auth';

const RAW_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Builds the full API URL, ensuring no duplicate `/api` prefix or double slashes.
 */
function buildUrl(endpoint: string): string {
  const base = RAW_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (base.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    return `${base}${cleanEndpoint.slice(4)}`;
  }
  return `${base}${cleanEndpoint}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Request helper
// ---------------------------------------------------------------------------

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = buildUrl(endpoint);

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.headers) {
    Object.assign(headers, options.headers as Record<string, string>);
  }

  // Attach JWT from localStorage if available
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && token.trim() && token !== 'undefined' && token !== 'null') {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body.message || body.error || response.statusText || 'An API error occurred';
    throw new ApiError(response.status, message, body);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// apiClient — thin REST verbs
// ---------------------------------------------------------------------------

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, body: unknown, options?: RequestInit) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>(endpoint, {
      method: 'POST',
      body: isFormData ? (body as BodyInit) : JSON.stringify(body),
      ...options,
    });
  },

  put: <T>(endpoint: string, body: unknown, options?: RequestInit) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>(endpoint, {
      method: 'PUT',
      body: isFormData ? (body as BodyInit) : JSON.stringify(body),
      ...options,
    });
  },

  patch: <T>(endpoint: string, body: unknown, options?: RequestInit) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>(endpoint, {
      method: 'PATCH',
      body: isFormData ? (body as BodyInit) : JSON.stringify(body),
      ...options,
    });
  },

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),
};
