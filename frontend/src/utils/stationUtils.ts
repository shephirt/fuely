import type { Station, FavoriteStation, FuelType, StationPrice } from "../types";

export type SortFuel = "e5" | "e10" | "diesel" | "cheapest";
export type SortBy = "distance" | "price" | "cheapest";

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

/** Sort stations by their pre-computed detour cost (ascending).
 *  "baseline" counts as 0. Stations without a cost (undefined) sink to the bottom. */
export function sortByDetourCost<T extends Station | FavoriteStation>(
  stations: T[],
  detourCosts: Record<string, number | "baseline" | undefined>
): T[] {
  return [...stations].sort((a, b) => {
    const ca = detourCosts[a.id];
    const cb = detourCosts[b.id];
    const aVal = ca === "baseline" ? 0 : (typeof ca === "number" ? ca : undefined);
    const bVal = cb === "baseline" ? 0 : (typeof cb === "number" ? cb : undefined);
    if (aVal === undefined && bVal === undefined) return 0;
    if (aVal === undefined) return 1;
    if (bVal === undefined) return -1;
    return aVal - bVal;
  });
}

/** Compute the net saving (in €) of fuelling at this station vs the baseline.
 *
 *  Model:
 *   - The user drives a round-trip detour to reach this station instead of the
 *     baseline: extra km = (stationDist − baselineDist) × detourFactor × 2
 *   - Detour fuel cost = extraKm × (consumption / 100) × baselinePrice
 *   - Price saving     = (baselinePrice − stationPrice) × fillVolume
 *   - Net saving       = price saving − detour fuel cost
 *
 *  Returns:
 *   "baseline"  — this IS the cheapest station (no detour needed)
 *   number      — net saving in €; positive = save money, negative = costs more
 *   undefined   — cannot calculate (missing price or invalid settings)
 */
export function calcDetourCost(
  stationPrice: number | false | undefined,
  baselinePrice: number | false | undefined,
  stationDist: number,
  baselineDist: number,
  fillVolume: number,
  consumption: number,
  detourFactor: number
): number | "baseline" | undefined {
  if (
    typeof stationPrice !== "number" ||
    typeof baselinePrice !== "number" ||
    fillVolume <= 0 ||
    consumption <= 0
  ) {
    return undefined;
  }

  // Extra km driven for the round-trip detour
  const extraKm = Math.max(0, (stationDist - baselineDist) * detourFactor * 2);

  // Cost of the extra fuel burned driving the detour
  const detourFuelCost = extraKm * (consumption / 100) * baselinePrice;

  // How much cheaper (or more expensive) it is to fill up here vs baseline
  const priceSaving = (baselinePrice - stationPrice) * fillVolume;

  // Positive = net saving, negative = net extra cost
  const netSaving = priceSaving - detourFuelCost;

  // This IS the baseline station
  if (stationPrice === baselinePrice && extraKm === 0) return "baseline";

  return netSaving;
}
