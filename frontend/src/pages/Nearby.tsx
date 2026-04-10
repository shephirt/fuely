import { useState, useEffect, useCallback, useRef } from "react";
import { getNearby } from "../api";
import type { Station, FuelType, FavoriteStation } from "../types";
import type { LocationState } from "../App";
import type { SortFuel, SortBy } from "../utils/stationUtils";
import { effectiveSortFuel, sortStations, sortByDetourCost, pickPrice, calcDetourCost } from "../utils/stationUtils";
import StationCard from "../components/StationCard";
import Map, { type MapHandle } from "../components/Map";
import LocationPicker from "../components/LocationPicker";
import RadiusSelector from "../components/RadiusSelector";

interface NearbyProps {
  selectedFuel: FuelType;
  location: LocationState | null;
  radius: number;
  favorites: FavoriteStation[];
  onToggleFavorite: (station: Station | FavoriteStation) => void;
  onLocation: (lat: number, lng: number, label?: string) => void;
  onRadiusChange: (r: number) => void;
  sortFuel: SortFuel;
  consumption: number;
  fillVolume: number;
  detourFactor: number;
}

export default function Nearby({
  selectedFuel,
  location,
  radius,
  favorites,
  onToggleFavorite,
  onLocation,
  onRadiusChange,
  sortFuel,
  consumption,
  fillVolume,
  detourFactor,
}: NearbyProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const mapRef = useRef<MapHandle>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement>>({});

  const fetchStations = useCallback(() => {
    if (!location) return;

    setLoading(true);
    setError(null);

    getNearby(location.lat, location.lng, radius, selectedFuel)
      .then((data) => {
        setStations(data);
        setLastRefreshed(new Date());
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => setLoading(false));
  }, [location, radius, selectedFuel]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  const handleSelectStation = useCallback((station: Station | FavoriteStation) => {
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

  const favoriteIds = new Set(favorites.map((f) => f.id));
  const fuel = effectiveSortFuel(selectedFuel, sortFuel);
  const openStations = stations.filter((s) => s.isOpen);

  // Baseline: station with the lowest price for the effective fuel, independent of sort order
  let baselinePrice: number | false | undefined;
  let baselineDist = 0;
  for (const s of openStations) {
    const p = pickPrice(s, undefined, fuel);
    if (typeof p === "number") {
      if (typeof baselinePrice !== "number" || p < baselinePrice) {
        baselinePrice = p;
        baselineDist = s.dist ?? 0;
      }
    }
  }

  // Pre-compute detour costs for all open stations (needed for both display and cheapest sort)
  const detourCostMap: Record<string, number | "baseline" | undefined> = {};
  for (const s of openStations) {
    detourCostMap[s.id] = calcDetourCost(
      pickPrice(s, undefined, fuel),
      baselinePrice,
      s.dist ?? 0,
      baselineDist,
      fillVolume,
      consumption,
      detourFactor
    );
  }

  // Apply sort
  const sortedStations =
    sortBy === "cheapest"
      ? sortByDetourCost(openStations, detourCostMap)
      : sortStations(openStations, sortBy, fuel);

  return (
    <div className="page-layout">
      {/* Left column: top controls + toolbar + cards */}
      <div className="page-left">
        <div className="page-top-row">
          <LocationPicker onLocation={onLocation} currentLocation={location} />
          <RadiusSelector value={radius} onChange={onRadiusChange} />
        </div>

        <div className="page-toolbar">
          <span className="refresh-info">
            {loading
              ? "Loading…"
              : lastRefreshed
                ? `Updated ${lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : ""}
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
            </div>
            <button
              className="btn-secondary"
              onClick={fetchStations}
              disabled={loading || !location}
              title="Refresh prices"
            >
              {loading ? "…" : "⟳ Refresh"}
            </button>
          </div>
        </div>

        {!location && (
          <div className="empty-box">
            Use GPS or search for an address above to find nearby stations.
          </div>
        )}
        {location && error && (
          <div className="error-box">Error: {error}</div>
        )}
        {location && !loading && !error && stations.length === 0 && (
          <div className="empty-box">No stations found within {radius} km.</div>
        )}

        <div className="stations-list">
          {sortedStations.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              isFavorite={favoriteIds.has(station.id)}
              selectedFuel={selectedFuel}
              isOpen={station.isOpen}
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
        {location ? (
          <Map
            ref={mapRef}
            userLat={location.lat}
            userLng={location.lng}
            stations={openStations}
            selectedFuel={selectedFuel}
            radius={radius}
            onMarkerClick={handleMarkerClick}
          />
        ) : (
          <div className="map-placeholder" />
        )}
      </div>
    </div>
  );
}
