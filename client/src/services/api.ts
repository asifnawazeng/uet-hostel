/**
 * Base URL of the Express API.
 *
 * Defaults to the relative "/api" path so the Vite dev proxy forwards requests
 * to the backend. Set VITE_API_BASE_URL to an absolute URL for deployments
 * where the client and API are served from different origins.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** Shape of a failed API response. */
export interface ApiErrorBody {
  message: string;
}

/**
 * Thin fetch wrapper around the backend API.
 *
 * Business logic does not belong here - this is only responsible for building
 * the URL, sending the request and normalising errors.
 */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const body = (await response.json()) as Partial<ApiErrorBody>;
      if (body.message) {
        message = body.message;
      }
    } catch {
      // Response had no JSON body - keep the status-based message.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

/** Payload returned by the backend health endpoint. */
export interface HealthResponse {
  status: string;
  service: string;
  environment: string;
  timestamp: string;
}

/** Checks that the client can reach the backend API. */
export function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/health');
}