import { useState, useEffect, useCallback, useRef } from "react";
import { getPrices } from "../api";
import type { FavoriteStation, FuelType, PriceMap } from "../types";
import type { SortFuel, SortBy } from "../utils/stationUtils";
import { effectiveSortFuel, sortStations, pickPrice, calcDetourCost } from "../utils/stationUtils";
import StationCard from "../components/StationCard";
import Map, { type MapHandle } from "../components/Map";

interface FavoritesProps {
  favorites: FavoriteStation[];
  selectedFuel: FuelType;
  onToggleFavorite: (station: FavoriteStation) => void;
  sortFuel: SortFuel;
  consumption: number;
  fillVolume: number;
  detourFactor: number;
}

export default function Favorites({
  favorites,
  selectedFuel,
  onToggleFavorite,
  sortFuel,
  consumption,
  fillVolume,
  detourFactor,
}: FavoritesProps) {
  const [prices, setPrices] = useState<PriceMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const mapRef = useRef<MapHandle>(null);

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
    mapRef.current?.flyToStation(station.lat, station.lng);
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
  const sortedFavorites = sortStations(favorites, sortBy, fuel, prices);

  // Baseline: first station in sorted list with a valid price
  const baselineStation = sortedFavorites.find(
    (s) => typeof pickPrice(s, prices[s.id], fuel) === "number"
  );
  const baselinePrice = baselineStation
    ? pickPrice(baselineStation, prices[baselineStation.id], fuel)
    : undefined;
  const baselineDist = baselineStation?.dist ?? 0;

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
                title="Sort by price"
              >
                Price
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

        {error && <div className="error-box">Error: {error}</div>}

        <div className="stations-list">
          {sortedFavorites.map((station) => {
            const stationPrice = pickPrice(station, prices[station.id], fuel);
            const detourCost = calcDetourCost(
              stationPrice,
              baselinePrice,
              station.dist ?? 0,
              baselineDist,
              fillVolume,
              consumption,
              detourFactor
            );
            return (
              <StationCard
                key={station.id}
                station={station}
                price={prices[station.id]}
                isFavorite={favoriteIds.has(station.id)}
                selectedFuel={selectedFuel}
                detourCost={detourCost}
                onToggleFavorite={onToggleFavorite}
                onSelect={handleSelectStation}
              />
            );
          })}
        </div>
      </div>

      {/* Right column: map */}
      <div className="page-map">
        {firstWithCoords && (
          <Map
            ref={mapRef}
            userLat={firstWithCoords.lat}
            userLng={firstWithCoords.lng}
            stations={favorites}
            prices={prices}
            selectedFuel={selectedFuel}
          />
        )}
      </div>
    </div>
  );
}
