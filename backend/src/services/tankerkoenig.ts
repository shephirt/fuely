import type {
  NearbyResponse,
  PricesResponse,
  DetailResponse,
  Station,
} from "../types";

const BASE_URL = "https://creativecommons.tankerkoenig.de/json";

// ── In-memory cache ───────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Helpers ───────────────────────────────────────────────────────────
function getApiKey(): string {
  const key = process.env.TANKERKOENIG_API_KEY;
  if (!key) {
    throw new Error("TANKERKOENIG_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Tankerkoenig returns `price` instead of the fuel-type key when a single
 * fuel type is requested. Normalise all stations so they always carry
 * explicit e5/e10/diesel fields.
 * Also coerce null prices to false — Tankerkoenig sends null for fuels a
 * station doesn't offer, but our frontend type is `number | false | undefined`.
 */
function normaliseStation(station: unknown, type: string): Station {
  const s = { ...(station as object) } as unknown as Station & { price?: number };
  if (type !== "all" && s.price !== undefined) {
    if (type === "e5") s.e5 = s.price;
    else if (type === "e10") s.e10 = s.price;
    else if (type === "diesel") s.diesel = s.price;
    delete s.price;
  }
  // Coerce null → false for all fuel price fields
  if ((s.e5 as unknown) === null) s.e5 = false;
  if ((s.e10 as unknown) === null) s.e10 = false;
  if ((s.diesel as unknown) === null) s.diesel = false;
  return s;
}

// ── API calls ─────────────────────────────────────────────────────────
export async function fetchNearby(
  lat: number,
  lng: number,
  rad: number,
  type: string
): Promise<NearbyResponse> {
  const cacheKey = `nearby:${lat.toFixed(4)}:${lng.toFixed(4)}:${rad}:${type}`;
  const cached = cacheGet<NearbyResponse>(cacheKey);
  if (cached) {
    console.log(`[cache hit] ${cacheKey}`);
    return cached;
  }

  const apikey = getApiKey();
  const url = new URL(`${BASE_URL}/list.php`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lng", String(lng));
  url.searchParams.set("rad", String(rad));
  url.searchParams.set("type", type);
  url.searchParams.set("sort", type === "all" ? "dist" : "price");
  url.searchParams.set("apikey", apikey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Tankerkoenig list.php returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as NearbyResponse & {
    stations: unknown[];
  };

  // Normalise `price` key for single-fuel-type responses
  if (data.ok && Array.isArray(data.stations)) {
    data.stations = data.stations.map((s) => normaliseStation(s, type)) as Station[];
  }

  cacheSet(cacheKey, data);
  return data;
}

export async function fetchPrices(ids: string[]): Promise<PricesResponse> {
  const sortedIds = [...ids].sort();
  const cacheKey = `prices:${sortedIds.join(",")}`;
  const cached = cacheGet<PricesResponse>(cacheKey);
  if (cached) {
    console.log(`[cache hit] ${cacheKey}`);
    return cached;
  }

  const apikey = getApiKey();
  const url = new URL(`${BASE_URL}/prices.php`);
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("apikey", apikey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Tankerkoenig prices.php returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as PricesResponse;
  cacheSet(cacheKey, data);
  return data;
}

export async function fetchDetail(id: string): Promise<DetailResponse> {
  const cacheKey = `detail:${id}`;
  const cached = cacheGet<DetailResponse>(cacheKey);
  if (cached) {
    console.log(`[cache hit] ${cacheKey}`);
    return cached;
  }

  const apikey = getApiKey();
  const url = new URL(`${BASE_URL}/detail.php`);
  url.searchParams.set("id", id);
  url.searchParams.set("apikey", apikey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Tankerkoenig detail.php returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as DetailResponse;
  cacheSet(cacheKey, data);
  return data;
}
