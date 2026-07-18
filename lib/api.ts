/**
 * Typed API client for the Turf Booking Platform backend.
 * Now routing to Next.js API Routes which interface with Supabase + Prisma.
 */
import axios, { AxiosInstance } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Since we are using Next.js API Routes and Supabase Auth,
// the browser automatically sends the session cookies with every request.
// We no longer need to manually attach JWT access_tokens.

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  // Now handled directly by Supabase in the frontend (e.g., auth.tsx) or custom API routes.
  // We keep the signatures here for compatibility if needed in components,
  // but it's recommended to use the Supabase client directly for OTP.
  requestOTP: (phone: string) =>
    apiClient.post("/auth/otp/request/", { phone }),

  verifyOTP: (phone: string, code: string, name?: string) =>
    apiClient.post("/auth/otp/verify/", { phone, code, name }),

  ownerLogin: (phone: string, password: string) =>
    apiClient.post("/auth/owner/login/", { phone, password }),

  ownerRegister: (data: { phone: string; password: string; name: string; business_name: string }) =>
    apiClient.post("/auth/owner/register/", data),

  getMe: () => apiClient.get("/auth/me"),
};

// ── Turfs ─────────────────────────────────────────────────────────────────
export const turfsApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get("/turfs/", { params }),

  get: (id: number | string) => apiClient.get(`/turfs/${id}/`),

  create: (data: FormData) =>
    apiClient.post("/turfs/", data, { headers: { "Content-Type": "multipart/form-data" } }),

  update: (id: number | string, data: Partial<object>) =>
    apiClient.patch(`/turfs/${id}/`, data),

  getSlots: (id: number | string, date: string) =>
    apiClient.get(`/turfs/${id}/slots/`, { params: { date } }),

  getAvailability: (id: number | string, start: string, days: number = 7) =>
    apiClient.get(`/turfs/${id}/availability/`, { params: { start, days } }),

  addSchedule: (id: number | string, data: object) =>
    apiClient.post(`/turfs/${id}/schedules/`, data),

  getSchedules: (id: number | string) => apiClient.get(`/turfs/${id}/schedules/`),

  addOverride: (id: number | string, data: object) =>
    apiClient.post(`/turfs/${id}/overrides/`, data),

  uploadPhoto: (id: number | string, file: File) => {
    const form = new FormData();
    form.append("image", file);
    return apiClient.post(`/turfs/${id}/upload-photo/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ── Bookings ──────────────────────────────────────────────────────────────
export const bookingsApi = {
  create: (data: {
    turf_id: string;
    date: string;
    start_times: string[];
    player_name: string;
    player_phone: string;
    player_count?: number;
    payment_method?: string;
    notes?: string;
    session_id?: string;
  }) => apiClient.post("/bookings/", data),

  createOffline: (data: object) => apiClient.post("/bookings/offline/", data),

  get: (id: string, phone?: string) =>
    apiClient.get(`/bookings/${id}/`, { params: phone ? { phone } : {} }),

  cancel: (id: string, reason?: string, phone?: string) =>
    apiClient.post(`/bookings/${id}/cancel/`, { reason, phone }),

  myBookings: (params?: { phone?: string; status?: string }) =>
    apiClient.get("/bookings/mine/", { params }),

  ownerBookings: (turfId: string, date?: string) =>
    apiClient.get(`/bookings/turf/${turfId}/`, { params: date ? { date } : {} }),

  acquireLock: (turf_id: string, date: string, start_times: string[], session_id?: string) =>
    apiClient.post("/bookings/lock/", { turf_id, date, start_times, session_id }),

  releaseLock: (turf_id: string, date: string, start_times: string[], session_id?: string) =>
    apiClient.delete("/bookings/lock/", { data: { turf_id, date, start_times, session_id } }),
};

// ── Payments ──────────────────────────────────────────────────────────────
export const paymentsApi = {
  getPayouts: () => apiClient.get("/payments/payouts/"),
  getFeeBalance: () => apiClient.get("/payments/balance/"),
};

// ── Reviews ───────────────────────────────────────────────────────────────
export const reviewsApi = {
  forTurf: (turfId: string) => apiClient.get(`/reviews/turf/${turfId}/`),
  create: (data: { booking_id: string; rating: number; comment?: string; player_phone?: string }) =>
    apiClient.post("/reviews/", data),
};

// ── Analytics ─────────────────────────────────────────────────────────────
export const analyticsApi = {
  owner: (params?: { days?: number; turf_id?: string }) =>
    apiClient.get("/analytics/owner/", { params }),
  admin: (params?: { days?: number }) =>
    apiClient.get("/analytics/admin/", { params }),
};
