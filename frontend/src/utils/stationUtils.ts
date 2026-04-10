import type { Station, FavoriteStation, FuelType, StationPrice } from "../types";

export type SortFuel = "e5" | "e10" | "diesel" | "cheapest";
export type SortBy = "distance" | "price" | "cheapest";

/** Haversine distance in km between two lat/lng points. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
/** Pick the relevant price for a station from its inline fields or a PriceMap entry. */
export function pickPrice(
  station: Station | FavoriteStation,
  priceEntry: StationPrice | undefined,
  fuel: SortFuel
): number | false | undefined {
  const e5: number | false | undefined =
    priceEntry?.e5 ?? ("e5" in station ? station.e5 : undefined);
  const e10: number | false | undefined =
    priceEntry?.e10 ?? ("e10" in station ? station.e10 : undefined);
  const diesel: number | false | undefined =
    priceEntry?.diesel ?? ("diesel" in station ? station.diesel : undefined);

  if (fuel === "cheapest") {
    const vals = [e5, e10, diesel].filter(
      (v): v is number => typeof v === "number"
    );
    return vals.length > 0 ? Math.min(...vals) : false;
  }
  if (fuel === "e5") return e5;
  if (fuel === "e10") return e10;
  return diesel;
}

/** Derive the effective sort fuel from the selected fuel type and the sort-fuel setting. */
export function effectiveSortFuel(
  selectedFuel: FuelType,
  sortFuel: SortFuel
): SortFuel {
  if (selectedFuel !== "all") return selectedFuel as SortFuel;
  return sortFuel;
}

/** Sort a list of stations by distance, price (per effective fuel), or absolute cheapest across all fuels.
 *  Stations without a price sink to the bottom. */
export function sortStations<T extends Station | FavoriteStation>(
  stations: T[],
  sortBy: SortBy,
  fuel: SortFuel,
  prices?: Record<string, StationPrice>
): T[] {
  if (sortBy === "distance") {
    return [...stations].sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
  }
  const resolveFuel: SortFuel = fuel;
  return [...stations].sort((a, b) => {
    const pa = pickPrice(a, prices?.[a.id], resolveFuel);
    const pb = pickPrice(b, prices?.[b.id], resolveFuel);
    const aValid = typeof pa === "number";
    const bValid = typeof pb === "number";
    if (!aValid && !bValid) return 0;
    if (!aValid) return 1;
    if (!bValid) return -1;
    return (pa as number) - (pb as number);
  });
}

/** Structured result from calcDetourCost. */
export type DetourResult =
  | { kind: "nearest" }
  | { kind: "result"; netSaving: number; hasDetour: boolean };

/** Sort stations by their pre-computed net saving (descending — highest saving first).
 *  "nearest" counts as 0. Stations without a result (undefined) sink to the bottom. */
export function sortByDetourCost<T extends Station | FavoriteStation>(
  stations: T[],
  detourCosts: Record<string, DetourResult | undefined>
): T[] {
  return [...stations].sort((a, b) => {
    const ca = detourCosts[a.id];
    const cb = detourCosts[b.id];
    const aVal = !ca ? undefined : ca.kind === "nearest" ? 0 : ca.netSaving;
    const bVal = !cb ? undefined : cb.kind === "nearest" ? 0 : cb.netSaving;
    if (aVal === undefined && bVal === undefined) return 0;
    if (aVal === undefined) return 1;
    if (bVal === undefined) return -1;
    return bVal - aVal; // descending: highest saving first
  });
}

/** Compute the net saving (in €) of going to this station vs the nearest open station.
 *
 *  For each station the total trip cost from the user's location is:
 *    driveCost = dist × detourFactor × (consumption / 100) × stationPrice
 *    fillCost  = stationPrice × fillVolume
 *    totalCost = driveCost + fillCost
 *
 *  Net saving = totalCost(nearest) − totalCost(thisStation)
 *    Positive → going here is cheaper overall than going to the nearest station
 *    Negative → going here costs more overall
 *
 *  Returns:
 *   { kind: "nearest" }                          — this IS the nearest open station
 *   { kind: "result", netSaving, hasDetour }     — netSaving in €; hasDetour = farther than nearest
 *   undefined                                     — cannot calculate (missing price / settings)
 */
export function calcDetourCost(
  stationPrice: number | false | undefined,
  stationDist: number,
  nearestPrice: number | false | undefined,
  nearestDist: number,
  fillVolume: number,
  consumption: number,
  detourFactor: number
): DetourResult | undefined {
  if (
    typeof stationPrice !== "number" ||
    typeof nearestPrice !== "number" ||
    fillVolume <= 0 ||
    consumption <= 0
  ) {
    return undefined;
  }

  // This IS the nearest station
  if (stationDist === nearestDist && stationPrice === nearestPrice) {
    return { kind: "nearest" };
  }

  const totalCost = (price: number, dist: number) =>
    dist * detourFactor * (consumption / 100) * price + price * fillVolume;

  const netSaving = totalCost(nearestPrice, nearestDist) - totalCost(stationPrice, stationDist);
  const hasDetour = stationDist > nearestDist;

  return { kind: "result", netSaving, hasDetour };
}
