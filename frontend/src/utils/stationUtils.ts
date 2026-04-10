import type { Station, FavoriteStation, FuelType, StationPrice } from "../types";

export type SortFuel = "e5" | "e10" | "diesel" | "cheapest";
export type SortBy = "distance" | "price";

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

/** Sort a list of stations by distance or price. Stations without a price sink to the bottom. */
export function sortStations<T extends Station | FavoriteStation>(
  stations: T[],
  sortBy: SortBy,
  fuel: SortFuel,
  prices?: Record<string, StationPrice>
): T[] {
  if (sortBy === "distance") {
    return [...stations].sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
  }
  return [...stations].sort((a, b) => {
    const pa = pickPrice(a, prices?.[a.id], fuel);
    const pb = pickPrice(b, prices?.[b.id], fuel);
    const aValid = typeof pa === "number";
    const bValid = typeof pb === "number";
    if (!aValid && !bValid) return 0;
    if (!aValid) return 1;
    if (!bValid) return -1;
    return (pa as number) - (pb as number);
  });
}

/** Compute detour cost for a station relative to a baseline (cheapest) station.
 *  Returns "baseline" for the cheapest station, a € /100km number for others,
 *  or undefined when the calculation cannot be performed (missing prices / settings). */
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

  const roadDist = stationDist * detourFactor;
  const baselineRoadDist = baselineDist * detourFactor;
  const extraKm = Math.max(0, roadDist - baselineRoadDist);

  const priceDiff = (stationPrice - baselinePrice) * fillVolume;
  const detourFuelCost = extraKm * (consumption / 100) * baselinePrice;
  const netExtra = priceDiff + detourFuelCost;

  // express as € per 100 km of range purchased
  const per100km = (netExtra / fillVolume) * 100;

  // If this IS the baseline (price diff = 0, no detour), mark it
  if (stationPrice === baselinePrice && extraKm === 0) return "baseline";

  return per100km;
}
