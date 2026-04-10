import type {
  FuelType,
  Station,
  PriceMap,
  StationDetail,
  FavoriteStation,
  GeocodedPlace,
} from "./types";

const BASE = "/api";

export async function getNearby(
  lat: number,
  lng: number,
  rad: number,
  type: FuelType
): Promise<Station[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    rad: String(rad),
    type,
  });
  const res = await fetch(`${BASE}/stations/nearby?${params}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.message ?? "Failed to fetch nearby stations");
  return data.stations as Station[];
}

export async function getPrices(ids: string[]): Promise<PriceMap> {
  if (ids.length === 0) return {};
  const params = new URLSearchParams({ ids: ids.join(",") });
  const res = await fetch(`${BASE}/stations/prices?${params}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.message ?? "Failed to fetch prices");
  return data.prices as PriceMap;
}

export async function getDetail(id: string): Promise<StationDetail> {
  const res = await fetch(`${BASE}/stations/${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.message ?? "Failed to fetch station detail");
  return data.station as StationDetail;
}

export async function getFavorites(): Promise<FavoriteStation[]> {
  const res = await fetch(`${BASE}/favorites`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.message ?? "Failed to fetch favorites");
  return data.favorites as FavoriteStation[];
}

export async function addFavorite(station: FavoriteStation): Promise<void> {
  const res = await fetch(`${BASE}/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(station),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.message ?? "Failed to add favorite");
}

export async function removeFavorite(id: string): Promise<void> {
  const res = await fetch(`${BASE}/favorites/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.message ?? "Failed to remove favorite");
}

export async function geocodeAddress(q: string): Promise<GeocodedPlace[]> {
  const params = new URLSearchParams({ q });
  const res = await fetch(`${BASE}/geocode?${params}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.message ?? "Geocoding failed");
  return data.places as GeocodedPlace[];
}
