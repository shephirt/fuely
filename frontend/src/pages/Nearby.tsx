import { useState, useEffect, useCallback, useRef } from "react";
import { getNearby } from "../api";
import type { Station, FuelType, FavoriteStation } from "../types";
import type { LocationState } from "../App";
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
}

export default function Nearby({
  selectedFuel,
  location,
  radius,
  favorites,
  onToggleFavorite,
  onLocation,
  onRadiusChange,
}: NearbyProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const mapRef = useRef<MapHandle>(null);

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
    mapRef.current?.flyToStation(station.lat, station.lng);
  }, []);

  const favoriteIds = new Set(favorites.map((f) => f.id));

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
          <button
            className="btn-secondary"
            onClick={fetchStations}
            disabled={loading || !location}
            title="Refresh prices"
          >
            {loading ? "…" : "⟳ Refresh"}
          </button>
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
          {stations.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              isFavorite={favoriteIds.has(station.id)}
              selectedFuel={selectedFuel}
              isOpen={station.isOpen}
              dist={station.dist}
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
            stations={stations}
            selectedFuel={selectedFuel}
            radius={radius}
          />
        ) : (
          <div className="map-placeholder" />
        )}
      </div>
    </div>
  );
}
