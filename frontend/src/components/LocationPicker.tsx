import { useState, useRef, useCallback, useEffect } from "react";
import { geocodeAddress } from "../api";
import type { GeocodedPlace } from "../types";
import type { LocationState } from "../App";

interface LocationPickerProps {
  onLocation: (lat: number, lng: number, label?: string) => void;
  currentLocation: LocationState | null;
}

export default function LocationPicker({ onLocation, currentLocation }: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reflect persisted location label into the input on first render
  useEffect(() => {
    if (currentLocation?.label && currentLocation.label !== "GPS location") {
      setQuery(currentLocation.label.split(",").slice(0, 2).join(", "));
    }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGps = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser.");
      return;
    }
    setGpsLoading(true);
    setError(null);
    setResults([]);
    setQuery("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        onLocation(pos.coords.latitude, pos.coords.longitude, "GPS location");
      },
      (err) => {
        setGpsLoading(false);
        setError(`GPS error: ${err.message}`);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, [onLocation]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 3) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const places = await geocodeAddress(val.trim());
        setResults(places);
        if (places.length === 0) setError("No locations found.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const handleSelect = (place: GeocodedPlace) => {
    setQuery(place.label.split(",").slice(0, 2).join(", "));
    setResults([]);
    onLocation(place.lat, place.lng, place.label);
  };

  const gpsLabel = currentLocation?.label === "GPS location"
    ? "⊕ GPS (active)"
    : "⊕ GPS";

  return (
    <div className="location-picker">
      <div className="location-picker-row">
        <button
          className={`btn-secondary btn-gps${currentLocation?.label === "GPS location" ? " active-gps" : ""}`}
          onClick={handleGps}
          disabled={gpsLoading}
          title="Use GPS location"
        >
          {gpsLoading ? "…" : gpsLabel}
        </button>
        <div className="location-search-wrap">
          <input
            className="location-input"
            type="text"
            placeholder="Search address…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            aria-label="Search address"
          />
          {searching && <span className="location-spinner">⟳</span>}
        </div>
      </div>
      {error && <div className="location-error">{error}</div>}
      {results.length > 0 && (
        <ul className="location-results">
          {results.map((place, i) => (
            <li key={i}>
              <button
                className="location-result-btn"
                onClick={() => handleSelect(place)}
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
