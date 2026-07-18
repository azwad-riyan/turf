/** Shared TypeScript types matching the Django backend models. */

export interface User {
  id: number;
  phone: string;
  name: string;
  role: "player" | "owner" | "admin";
  created_at: string;
  owner_profile?: OwnerProfile;
}

export interface OwnerProfile {
  id: number;
  business_name: string;
  verification_status: "pending" | "verified" | "rejected";
  verified_at: string | null;
}

export interface TurfPhoto {
  id: number;
  image: string;
  is_primary: boolean;
  order: number;
}

export interface OperatingSchedule {
  id: number;
  day_of_week: number;
  day_name: string;
  open_time: string;   // "HH:MM"
  close_time: string;  // "HH:MM"
  slot_duration_min: number;
  is_closed: boolean;
}

export interface TurfListItem {
  id: number;
  name: string;
  address: string;
  area: string;
  lat: string | null;
  lng: string | null;
  sport_types: string[];
  amenities: string[];
  base_price: number;
  is_active: boolean;
  average_rating: string;
  total_reviews: number;
  owner_name: string;
  primary_photo: string | null;
}

export interface TurfDetail extends TurfListItem {
  description: string;
  contact_phone: string;
  cancellation_hours: number;
  photos: TurfPhoto[];
  schedules: OperatingSchedule[];
  created_at: string;
}

export type SlotStatus = "open" | "booked" | "blocked" | "locked" | "past";

export interface Slot {
  start_time: string;   // "HH:MM"
  end_time: string;     // "HH:MM"
  status: SlotStatus;
  price: number;
  booking_id: number | null;
  label: string;        // "06:00 AM – 07:30 AM"
}

export interface Booking {
  id: number;
  turf_id: number;
  turf_name: string;
  turf_address: string;
  player_name: string;
  player_phone: string;
  player_count: number;
  date: string;
  start_time: string;
  end_time: string;
  slot_label: string;
  source: "online" | "offline_manual";
  status: "pending_payment" | "confirmed" | "cancelled" | "completed" | "no_show";
  payment_method: "cash" | "bkash" | "nagad";
  payment_status: "unpaid" | "paid" | "refunded";
  amount: number;
  platform_fee: number;
  amount_paid: number;
  notes: string;
  created_at: string;
  cancelled_at: string | null;
  cancellation_reason: string;
}

export interface Review {
  id: number;
  turf_id: number;
  rating: number;
  comment: string;
  player_name: string;
  created_at: string;
}

export interface Payout {
  id: number;
  owner_name: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  fee_deducted: number;
  net_payout: number;
  status: "pending" | "processing" | "paid";
  paid_at: string | null;
  created_at: string;
}

export interface OwnerAnalytics {
  period: { start: string; end: string; days: number };
  total_bookings: number;
  total_revenue: number;
  platform_fees: number;
  net_revenue: number;
  status_breakdown: { status: string; count: number }[];
  bookings_by_day: { day: number; count: number }[];
  returning_players: number;
  new_players: number;
}

export interface AdminAnalytics {
  period: { start: string; end: string };
  total_bookings: number;
  active_bookings: number;
  cancelled_bookings: number;
  gmv: number;
  platform_fees: number;
  active_turfs: number;
  total_users: number;
  top_turfs: { turf__name: string; turf__id: number; bookings: number; revenue: number }[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    detail?: unknown;
  };
}

export type Sport = "football" | "cricket" | "volleyball";

export const SPORT_LABELS: Record<Sport, string> = {
  football: "⚽ Football",
  cricket: "🏏 Cricket",
  volleyball: "🏐 Volleyball",
};

export const AMENITY_LABELS: Record<string, string> = {
  lights: "💡 Lights",
  changing_room: "🚿 Changing Room",
  parking: "🅿️ Parking",
  water: "💧 Water",
  cafeteria: "☕ Cafeteria",
  gallery: "🪑 Gallery",
};
