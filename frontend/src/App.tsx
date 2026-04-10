import { useState, useEffect, useCallback } from "react";
import { getFavorites, addFavorite, removeFavorite } from "./api";
import type { FuelType, FavoriteStation, Station } from "./types";
import type { SortFuel } from "./utils/stationUtils";
import FuelTypeToggle from "./components/FuelTypeToggle";
import Nearby from "./pages/Nearby";
import Favorites from "./pages/Favorites";

type Tab = "nearby" | "favorites";

const FUEL_TYPE_KEY    = "fuely_fuel_type";
const DEFAULT_TAB_KEY  = "fuely_default_tab";
const LOCATION_KEY     = "fuely_location";
const RADIUS_KEY       = "fuely_radius";
const SORT_FUEL_KEY    = "fuely_sort_fuel";
const CONSUMPTION_KEY  = "fuely_consumption";
const FILL_VOLUME_KEY  = "fuely_fill_volume";
const DETOUR_FACTOR_KEY = "fuely_detour_factor";

export interface LocationState {
  lat: number;
  lng: number;
  label?: string;
}

export default function App() {
  const [tab, setTab] = useState<Tab>(() =>
    (localStorage.getItem(DEFAULT_TAB_KEY) as Tab) ?? "nearby"
  );
  const [selectedFuel, setSelectedFuel] = useState<FuelType>(() =>
    (localStorage.getItem(FUEL_TYPE_KEY) as FuelType) ?? "all"
  );
  const [location, setLocation] = useState<LocationState | null>(() => {
    try {
      const raw = localStorage.getItem(LOCATION_KEY);
      return raw ? (JSON.parse(raw) as LocationState) : null;
    } catch {
      return null;
    }
  });
  const [radius, setRadius] = useState<number>(() =>
    parseInt(localStorage.getItem(RADIUS_KEY) ?? "5", 10)
  );
  const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
  const [favError, setFavError]   = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [defaultTab, setDefaultTab] = useState<Tab>(() =>
    (localStorage.getItem(DEFAULT_TAB_KEY) as Tab) ?? "nearby"
  );

  // ── New settings ──────────────────────────────────────────────────
  const [sortFuel, setSortFuel] = useState<SortFuel>(() =>
    (localStorage.getItem(SORT_FUEL_KEY) as SortFuel) ?? "e10"
  );
  const [consumption, setConsumption] = useState<number>(() =>
    parseFloat(localStorage.getItem(CONSUMPTION_KEY) ?? "8.0")
  );
  const [fillVolume, setFillVolume] = useState<number>(() =>
    parseFloat(localStorage.getItem(FILL_VOLUME_KEY) ?? "40")
  );
  const [detourFactor, setDetourFactor] = useState<number>(() =>
    parseFloat(localStorage.getItem(DETOUR_FACTOR_KEY) ?? "1.3")
  );

  // ── Persist all preferences ───────────────────────────────────────
  useEffect(() => { localStorage.setItem(FUEL_TYPE_KEY, selectedFuel); }, [selectedFuel]);
  useEffect(() => { localStorage.setItem(RADIUS_KEY, String(radius)); }, [radius]);
  useEffect(() => {
    if (location) localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  }, [location]);
  useEffect(() => { localStorage.setItem(SORT_FUEL_KEY, sortFuel); }, [sortFuel]);
  useEffect(() => { localStorage.setItem(CONSUMPTION_KEY, String(consumption)); }, [consumption]);
  useEffect(() => { localStorage.setItem(FILL_VOLUME_KEY, String(fillVolume)); }, [fillVolume]);
  useEffect(() => { localStorage.setItem(DETOUR_FACTOR_KEY, String(detourFactor)); }, [detourFactor]);

  useEffect(() => {
    getFavorites()
      .then(setFavorites)
      .catch((err: unknown) => {
        setFavError(err instanceof Error ? err.message : "Failed to load favorites");
      });
  }, []);

  const handleLocation = useCallback((lat: number, lng: number, label?: string) => {
    setLocation({ lat, lng, label });
  }, []);

  const handleToggleFavorite = useCallback(
    async (station: Station | FavoriteStation) => {
      const isFav = favorites.some((f) => f.id === station.id);
      if (isFav) {
        try {
          await removeFavorite(station.id);
          setFavorites((prev) => prev.filter((f) => f.id !== station.id));
        } catch (err) {
          console.error("Failed to remove favorite:", err);
        }
      } else {
        const fav: FavoriteStation = {
          id: station.id,
          name: station.name,
          brand: station.brand,
          street: station.street,
          houseNumber: station.houseNumber,
          place: station.place,
          postCode: station.postCode,
          lat: station.lat,
          lng: station.lng,
        };
        try {
          await addFavorite(fav);
          setFavorites((prev) => [...prev, fav]);
        } catch (err) {
          console.error("Failed to add favorite:", err);
        }
      }
    },
    [favorites]
  );

  const saveDefaultTab = (t: Tab) => {
    setDefaultTab(t);
    localStorage.setItem(DEFAULT_TAB_KEY, t);
  };

  return (
    <div className="app">

      {/* ── Sticky header ── */}
      <header className="app-header">
        <div className="app-header-top">
          <div className="app-logo">
            <span className="app-logo-icon">⛽</span>
            <span className="app-logo-text">Fuely</span>
          </div>
          <div className="header-controls">
            <FuelTypeToggle value={selectedFuel} onChange={setSelectedFuel} />
            <button
              className="btn-icon"
              onClick={() => setShowSettings((s) => !s)}
              title="Settings"
              aria-label="Settings"
            >
              ⚙
            </button>
          </div>
        </div>

        {/* Settings panel (collapsible) */}
        {showSettings && (
          <div className="settings-panel">
            <div className="settings-row">
              <label className="settings-label">Default view</label>
              <div className="settings-toggle">
                <button
                  className={`fuel-btn${defaultTab === "nearby" ? " active" : ""}`}
                  onClick={() => saveDefaultTab("nearby")}
                >
                  Nearby
                </button>
                <button
                  className={`fuel-btn${defaultTab === "favorites" ? " active" : ""}`}
                  onClick={() => saveDefaultTab("favorites")}
                >
                  Favorites
                </button>
              </div>
            </div>

            <div className="settings-row">
              <label className="settings-label">Price sort fuel</label>
              <div className="settings-toggle">
                {(["e5", "e10", "diesel", "cheapest"] as SortFuel[]).map((f) => (
                  <button
                    key={f}
                    className={`fuel-btn${sortFuel === f ? " active" : ""}`}
                    onClick={() => setSortFuel(f)}
                  >
                    {f === "cheapest" ? "Cheapest" : f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <label className="settings-label">Consumption</label>
              <div className="settings-input-group">
                <input
                  type="number"
                  className="settings-input"
                  min={1} max={30} step={0.5}
                  value={consumption}
                  onChange={(e) => setConsumption(parseFloat(e.target.value) || 0)}
                />
                <span className="settings-unit">L / 100 km</span>
              </div>
            </div>

            <div className="settings-row">
              <label className="settings-label">Fill volume</label>
              <div className="settings-input-group">
                <input
                  type="number"
                  className="settings-input"
                  min={10} max={120} step={5}
                  value={fillVolume}
                  onChange={(e) => setFillVolume(parseFloat(e.target.value) || 0)}
                />
                <span className="settings-unit">L</span>
              </div>
            </div>

            <div className="settings-row">
              <label className="settings-label">Detour factor</label>
              <select
                className="settings-select"
                value={detourFactor}
                onChange={(e) => setDetourFactor(parseFloat(e.target.value))}
              >
                <option value={1.0}>1.0× — straight line</option>
                <option value={1.2}>1.2× — urban</option>
                <option value={1.3}>1.3× — mixed (default)</option>
                <option value={1.5}>1.5× — rural</option>
              </select>
            </div>
          </div>
        )}

        {/* Tab nav */}
        <nav className="tab-nav">
          <button
            className={`tab-btn${tab === "nearby" ? " active" : ""}`}
            onClick={() => setTab("nearby")}
          >
            Nearby
          </button>
          <button
            className={`tab-btn${tab === "favorites" ? " active" : ""}`}
            onClick={() => setTab("favorites")}
          >
            Favorites{" "}
            {favorites.length > 0 && (
              <span className="tab-count">{favorites.length}</span>
            )}
          </button>
        </nav>
      </header>

      {/* ── Scrollable content ── */}
      <main className="app-main">
        {favError && (
          <div className="error-box">Favorites error: {favError}</div>
        )}

        {tab === "nearby" && (
          <Nearby
            selectedFuel={selectedFuel}
            location={location}
            radius={radius}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onLocation={handleLocation}
            onRadiusChange={setRadius}
            sortFuel={sortFuel}
            consumption={consumption}
            fillVolume={fillVolume}
            detourFactor={detourFactor}
          />
        )}
        {tab === "favorites" && (
          <Favorites
            favorites={favorites}
            selectedFuel={selectedFuel}
            onToggleFavorite={handleToggleFavorite}
            sortFuel={sortFuel}
            consumption={consumption}
            fillVolume={fillVolume}
            detourFactor={detourFactor}
          />
        )}
      </main>

      {/* ── Sticky footer ── */}
      <footer className="app-footer">
        Fuel data:{" "}
        <a href="https://www.tankerkoenig.de" target="_blank" rel="noreferrer">
          Tankerkönig
        </a>{" "}
        · CC BY 4.0 · Map:{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>
        {" "}· Completely vibe coded ·{" "}
        <a href="https://github.com/shephirt" target="_blank" rel="noreferrer">
          github.com/shephirt
        </a>
      </footer>
    </div>
  );
}
