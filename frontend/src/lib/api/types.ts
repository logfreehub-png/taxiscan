export type UserRole = "driver" | "passenger" | "admin";

export interface User {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  role: UserRole;
  city: string;
  avatar: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  gender?: "male" | "female" | "";
  profile_completed?: boolean;
  home_lat: number | null;
  home_lng: number | null;
  has_card: boolean;
  card_last4: string;
  date_joined: string;
  subscription: {
    status: string;
    is_active: boolean;
    days_left: number;
    expires_at: string;
    auto_renew: boolean;
  } | null;
}

export interface AdminDashboard {
  users: { total: number; passengers: number; drivers: number; new_7d: number; new_30d: number; never_logged_in: number; profile_incomplete: number };
  subscriptions: { active: number; trial: number };
  revenue: { total_uzs: number; total_usd: number; today_uzs: number; last_7d_uzs: number; last_30d_uzs: number };
  transactions: { total: number; success: number; failed: number; pending: number; refunded: number };
  estimates: { total: number; last_7d: number; last_30d: number };
  daily_chart: Array<{ date: string; revenue_uzs: number; new_users: number }>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AdminUserListItem {
  id: number;
  phone: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  city: string;
  age: number | null;
  gender: string;
  has_card: boolean;
  card_last4: string;
  profile_completed: boolean;
  is_active: boolean;
  avatar_url: string | null;
  subscription_status: string | null;
  total_spent_uzs: number;
  transactions_count: number;
  date_joined: string;
  last_login: string | null;
  last_seen: string | null;
  total_seconds_active: number;
  inactive_days: number | null;
}

export type Tier = "econom" | "comfort" | "comfort_plus" | "business" | "delivery";

export interface TaxiService {
  id: number;
  code: string;
  name: string;
  brand: string;
  tier: Tier;
  color: string;
  logo_url: string | null;
  website: string;
  deeplink_template: string;
  base_fare_uzs: number;
  per_km_uzs: number;
  per_minute_uzs: number;
  minimum_fare_uzs: number;
  is_active: boolean;
  sort_order: number;
}

export interface Region {
  id: number;
  name: string;
  city: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: any } | null;
}

export interface DemandRegion {
  region_id: number;
  region_name: string;
  city: string;
  center_lat: number;
  center_lng: number;
  searches: number;
  avg_price: number;
  share_pct: number;
  rank: number | null;
  level: "high" | "medium" | "low";
  surge: number;
}

export interface DemandResponse {
  enabled: boolean;
  updated_at: string;
  window: string;
  totals: { searches: number; drivers: number; passengers: number; regions: number } | null;
  here: DemandRegion | null;
  destination: DemandRegion | null;
  regions: DemandRegion[];
}

export interface EstimateRow {
  service: {
    id: number;
    code: string;
    name: string;
    brand?: string;
    tier?: Tier;
    color: string;
    logo: string | null;
    deeplink_template: string;
  };
  price_uzs: number;
  distance_km: number;
  duration_min: number;
  surge: number;
  source: string;
  is_cheapest?: boolean;
  diff_from_cheapest?: number;
}

export interface EstimateResponse {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  region: { id: number; name: string; city: string } | null;
  route: {
    distance_km: number;
    duration_min: number;
    geometry: { type: string; coordinates: [number, number][] };
    source: string;
  };
  results: EstimateRow[];
  current_surge: number;
  surge_reason?: string;
  weather?: {
    boost: number;
    reason: string | null;
    temp_c?: number | null;
    weather_code?: number | null;
    precip_mm?: number | null;
    snow_cm?: number | null;
    wind_kmh?: number | null;
  };
}

export interface Subscription {
  id: number;
  status: string;
  status_display: string;
  is_active: boolean;
  days_left: number;
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  monthly_price_usd: number;
  monthly_price_uzs: number;
  discount_percent: number;
  last_charge_at: string | null;
  next_charge_at: string | null;
}

export interface PaymeCheckout {
  order_id: number;
  amount_uzs: number;
  checkout_url: string;
  paid?: boolean;
  detail?: string;
}

export interface Card {
  id: number;
  holder_name: string;
  card_last4: string;
  expiry_month: number;
  expiry_year: number;
  card_type: "uzcard" | "humo" | "visa" | "mastercard";
  is_default: boolean;
  created_at: string;
}

export interface Transaction {
  id: number;
  amount_usd: number;
  amount_uzs: number;
  status: "pending" | "success" | "failed" | "refunded";
  status_display: string;
  card_last4: string;
  description: string;
  error_message: string;
  external_id: string;
  created_at: string;
}

export interface ServiceStat {
  service__id: number;
  service__code: string;
  service__name: string;
  service__color: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  avg_distance: number;
  avg_duration: number;
  count: number;
  is_cheapest?: boolean;
}

export interface DailyStatsResponse {
  period_days: number;
  region_id: number | null;
  total_requests: number;
  services: ServiceStat[];
}

export interface FavoriteRoute {
  id: number;
  title: string;
  start_address: string;
  start_lat: number;
  start_lng: number;
  end_address: string;
  end_lat: number;
  end_lng: number;
  created_at: string;
}
