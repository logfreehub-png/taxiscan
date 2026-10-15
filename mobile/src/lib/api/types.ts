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
  geometry?: { type: "Polygon" | "MultiPolygon"; coordinates: any } | null;
}

export interface ServiceInfo {
  id: number;
  code: string;
  name: string;
  brand?: string;
  tier?: Tier;
  color: string;
  logo: string | null;
  deeplink_template: string;
  base_fare_uzs?: number;
  per_km_uzs?: number;
  per_minute_uzs?: number;
  minimum_fare_uzs?: number;
}

export interface PriceRow {
  service: ServiceInfo;
  price_uzs: number;
  distance_km: number;
  duration_min: number;
  surge: number;
  source: string;
  is_cheapest?: boolean;
  diff_from_cheapest?: number;
  breakdown?: {
    base: number;
    distance_part: number;
    time_part: number;
    surge_extra: number;
  };
}

export interface RouteFromApi {
  id: number;
  label: string;
  distance_km: number;
  duration_min: number;
  geometry: { type: string; coordinates: [number, number][] };
  source: string;
  is_fastest: boolean;
  is_cheapest_route: boolean;
  cheapest_price_uzs: number;
  prices: Array<{ service_id: number; brand: string; tier: string; color: string; price_uzs: number }>;
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
  routes?: RouteFromApi[];
  results: PriceRow[];
  current_surge: number;
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
  discount_percent?: number;
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

export interface LiveRow {
  service: { id: number; code: string; name: string; brand: string; color: string; tier: string };
  price_uzs: number;
  prev_price_uzs: number;
  change_uzs: number;
  change_pct: number;
  trend: "up" | "down" | "flat";
  is_cheapest?: boolean;
}

export interface LiveResponse {
  updated_at: string;
  minute_bucket: string;
  results: LiveRow[];
}

export interface BrandSeries {
  brand: string;
  color: string;
  current: number;
  max: number;
  min: number;
  trend?: "up" | "down" | "flat";
  trend_pct?: number;
}

export interface HourlyStatsResponse {
  updated_at: string;
  date?: string;
  tier?: string | null;
  available_tiers?: string[];
  series: BrandSeries[];
  chart: Array<Record<string, any>>;
  rising?: { brand: string; trend_pct: number; color: string } | null;
}
