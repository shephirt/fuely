import { useState, useEffect, useCallback, useRef } from "react";
import { RotateCw, ListFilter } from "lucide-react";
import { getNearby } from "../api";
import type { Station, FuelType, FavoriteStation } from "../types";
import type { LocationState } from "../App";
import type { SortFuel, SortBy, DetourResult } from "../utils/stationUtils";
import { effectiveSortFuel, sortStations, sortByDetourCost, sortByTotalCost, pickPrice, calcDetourCost, calcTotalCost } from "../utils/stationUtils";
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
  const [showSort, setShowSort] = useState(false);
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
  // Filter out stations with missing/zero coordinates — Leaflet crashes on those
  const validStations = stations.filter((s) => s.lat && s.lng);
  const openStations = validStations.filter((s) => s.isOpen);

  // Nearest open station with a valid price — the natural reference point
  let nearestPrice: number | false | undefined;
  let nearestDist = 0;
  for (const s of openStations) {
    const p = pickPrice(s, undefined, fuel);
    if (typeof p === "number") {
      if (nearestPrice === undefined || (s.dist ?? 0) < nearestDist) {
        nearestPrice = p;
        nearestDist = s.dist ?? 0;
      }
    }
  }

  // Pre-compute trip costs for all open stations (needed for both display and cheapest sort)
  const detourCostMap: Record<string, DetourResult | undefined> = {};
  for (const s of openStations) {
    detourCostMap[s.id] = calcDetourCost(
      pickPrice(s, undefined, fuel),
      s.dist ?? 0,
      nearestPrice,
      nearestDist,
      fillVolume,
      consumption,
      detourFactor
    );
  }

  // Pre-compute absolute total costs for total-cost sort
  const totalCostMap: Record<string, number | undefined> = {};
  for (const s of openStations) {
    totalCostMap[s.id] = calcTotalCost(
      pickPrice(s, undefined, fuel),
      s.dist ?? 0,
      fillVolume,
      consumption,
      detourFactor
    );
  }

  // Apply sort
  const sortedStations =
    sortBy === "cheapest"
      ? sortByDetourCost(openStations, detourCostMap)
      : sortBy === "total-cost"
        ? sortByTotalCost(openStations, totalCostMap)
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
            {/* Backdrop — closes overlay on outside tap (mobile only) */}
            {showSort && (
              <div className="sort-backdrop" onClick={() => setShowSort(false)} />
            )}
            {/* Filter icon — mobile only, toggles sort options */}
            <button
              className={`btn-icon sort-filter-btn${sortBy !== "distance" ? " sort-filter-btn--active" : ""}`}
              onClick={() => setShowSort((v) => !v)}
              title="Sort options"
              aria-label="Sort options"
            >
              <ListFilter size={16} />
            </button>
            {/* Sort options — always visible on desktop, overlay on mobile */}
            <div className={`sort-toggle${showSort ? " sort-toggle--open" : ""}`}>
              <button
                className={`sort-btn${sortBy === "distance" ? " active" : ""}`}
                onClick={() => { setSortBy("distance"); setShowSort(false); }}
                title="Sort by distance"
              >
                Distance
              </button>
              <button
                className={`sort-btn${sortBy === "price" ? " active" : ""}`}
                onClick={() => { setSortBy("price"); setShowSort(false); }}
                title="Sort by price (selected fuel)"
              >
                Price
              </button>
              <button
                className={`sort-btn${sortBy === "cheapest" ? " active" : ""}`}
                onClick={() => { setSortBy("cheapest"); setShowSort(false); }}
                title="Sort by net cost including detour (cheapest overall)"
              >
                Cheapest
              </button>
              <button
                className={`sort-btn${sortBy === "total-cost" ? " active" : ""}`}
                onClick={() => { setSortBy("total-cost"); setShowSort(false); }}
                title="Sort by absolute total cost (drive + fill)"
              >
                Total cost
              </button>
            </div>
            <button
              className={`btn-icon refresh-btn${loading ? " spinning" : ""}`}
              onClick={fetchStations}
              disabled={loading || !location}
              title="Refresh prices"
              aria-label="Refresh prices"
            >
              <RotateCw size={16} />
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
