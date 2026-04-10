import { useState, useEffect, useCallback, useRef } from "react";
import { getPrices } from "../api";
import type { FavoriteStation, FuelType, PriceMap } from "../types";
import type { SortFuel, SortBy, DetourResult } from "../utils/stationUtils";
import { effectiveSortFuel, sortStations, sortByDetourCost, sortByTotalCost, pickPrice, calcDetourCost, calcTotalCost, haversineKm } from "../utils/stationUtils";
import StationCard from "../components/StationCard";
import Map, { type MapHandle } from "../components/Map";
import type { LocationState } from "../App";

interface FavoritesProps {
  favorites: FavoriteStation[];
  selectedFuel: FuelType;
  onToggleFavorite: (station: FavoriteStation) => void;
  sortFuel: SortFuel;
  consumption: number;
  fillVolume: number;
  detourFactor: number;
  homeAddress: LocationState | null;
}

export default function Favorites({
  favorites,
  selectedFuel,
  onToggleFavorite,
  sortFuel,
  consumption,
  fillVolume,
  detourFactor,
  homeAddress,
}: FavoritesProps) {
  const [prices, setPrices] = useState<PriceMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const mapRef = useRef<MapHandle>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement>>({});

  const fetchAllPrices = useCallback(async () => {
    if (favorites.length === 0) {
      setPrices({});
      return;
    }

    const ids = favorites.map((f) => f.id);
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += 10) {
      batches.push(ids.slice(i, i + 10));
    }

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(batches.map((batch) => getPrices(batch)));
      const merged: PriceMap = {};
      for (const result of results) {
        Object.assign(merged, result);
      }
      setPrices(merged);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [favorites]);

  useEffect(() => {
    fetchAllPrices();
  }, [fetchAllPrices]);

  const handleSelectStation = useCallback((station: FavoriteStation) => {
    mapRef.current?.flyToStation(station.lat, station.lng, station.id);
  }, []);

  const handleMarkerClick = useCallback((stationId: string) => {
    setSelectedStationId(stationId);
    const card = cardRefs.current[stationId];
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    setTimeout(() => setSelectedStationId(null), 2000);
  }, []);

  if (favorites.length === 0) {
    return (
      <div className="empty-box">
        <p>No favorites yet.</p>
        <p>Search for nearby stations and tap ☆ to save them here.</p>
      </div>
    );
  }

  const favoriteIds = new Set(favorites.map((f) => f.id));
  const firstWithCoords = favorites.find((f) => f.lat && f.lng);
  const fuel = effectiveSortFuel(selectedFuel, sortFuel);

  // Hide stations that are confirmed closed (keep those without price data yet)
  const openFavorites = favorites.filter(
    (f) => !prices[f.id] || prices[f.id].status === "open"
  );

  /** Resolve the distance for a station: from homeAddress if set, otherwise stored dist. */
  const stationDist = (s: FavoriteStation): number => {
    if (homeAddress) return haversineKm(homeAddress.lat, homeAddress.lng, s.lat, s.lng);
    return s.dist ?? 0;
  };

  // Nearest open favorite with a valid price — the natural reference point
  let nearestPrice: number | false | undefined;
  let nearestDist = 0;
  for (const s of openFavorites) {
    const p = pickPrice(s, prices[s.id], fuel);
    if (typeof p === "number") {
      const d = stationDist(s);
      if (nearestPrice === undefined || d < nearestDist) {
        nearestPrice = p;
        nearestDist = d;
      }
    }
  }

  // Pre-compute detour costs for all open favorites (needed for display and cheapest sort)
  const detourCostMap: Record<string, DetourResult | undefined> = {};
  for (const s of openFavorites) {
    detourCostMap[s.id] = calcDetourCost(
      pickPrice(s, prices[s.id], fuel),
      stationDist(s),
      nearestPrice,
      nearestDist,
      fillVolume,
      consumption,
      detourFactor
    );
  }

  // Pre-compute absolute total costs for total-cost sort
  const totalCostMap: Record<string, number | undefined> = {};
  for (const s of openFavorites) {
    totalCostMap[s.id] = calcTotalCost(
      pickPrice(s, prices[s.id], fuel),
      stationDist(s),
      fillVolume,
      consumption,
      detourFactor
    );
  }

  // Enrich favorites with home-computed dist so sorting works correctly
  const openFavoritesWithDist = openFavorites.map((s) =>
    homeAddress ? { ...s, dist: stationDist(s) } : s
  );

  // Apply sort
  const sortedFavorites =
    sortBy === "cheapest"
      ? sortByDetourCost(openFavoritesWithDist, detourCostMap)
      : sortBy === "total-cost"
        ? sortByTotalCost(openFavoritesWithDist, totalCostMap)
        : sortStations(openFavoritesWithDist, sortBy, fuel, prices);

  return (
    <div className="page-layout">
      {/* Left column: toolbar + cards */}
      <div className="page-left">
        <div className="page-toolbar">
          <span className="refresh-info">
            {loading
              ? "Refreshing…"
              : lastRefreshed
                ? `Updated ${lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Prices not yet loaded"}
          </span>
          <div className="toolbar-right">
            <div className="sort-toggle">
              <button
                className={`sort-btn${sortBy === "distance" ? " active" : ""}`}
                onClick={() => setSortBy("distance")}
                title="Sort by distance"
              >
                Distance
              </button>
              <button
                className={`sort-btn${sortBy === "price" ? " active" : ""}`}
                onClick={() => setSortBy("price")}
                title="Sort by price (selected fuel)"
              >
                Price
              </button>
              <button
                className={`sort-btn${sortBy === "cheapest" ? " active" : ""}`}
                onClick={() => setSortBy("cheapest")}
                title="Sort by net cost including detour (cheapest overall)"
              >
                Cheapest
              </button>
              <button
                className={`sort-btn${sortBy === "total-cost" ? " active" : ""}`}
                onClick={() => setSortBy("total-cost")}
                title="Sort by absolute total cost (drive + fill)"
              >
                Total cost
              </button>
            </div>
            <button
              className="btn-secondary"
              onClick={fetchAllPrices}
              disabled={loading}
              title="Refresh prices now"
            >
              {loading ? "…" : "⟳ Refresh"}
            </button>
          </div>
        </div>

        {homeAddress && (
          <div className="home-address-info">
            Distances from: <strong>{homeAddress.label?.split(",").slice(0, 2).join(", ") ?? "Home"}</strong>
          </div>
        )}

        {error && <div className="error-box">Error: {error}</div>}

        <div className="stations-list">
          {sortedFavorites.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              price={prices[station.id]}
              isFavorite={favoriteIds.has(station.id)}
              selectedFuel={selectedFuel}
              dist={station.dist}
              fillVolume={fillVolume}
              detourCost={detourCostMap[station.id]}
              isSelected={selectedStationId === station.id}
              cardRef={(el) => {
                if (el) cardRefs.current[station.id] = el;
                else delete cardRefs.current[station.id];
              }}
              onToggleFavorite={onToggleFavorite}
              onSelect={handleSelectStation}
            />
          ))}
        </div>
      </div>

      {/* Right column: map */}
      <div className="page-map">
        {firstWithCoords && (
          <Map
            ref={mapRef}
            userLat={homeAddress ? homeAddress.lat : firstWithCoords.lat}
            userLng={homeAddress ? homeAddress.lng : firstWithCoords.lng}
            stations={openFavoritesWithDist}
            prices={prices}
            selectedFuel={selectedFuel}
            onMarkerClick={handleMarkerClick}
          />
        )}
      </div>
    </div>
  );
}
