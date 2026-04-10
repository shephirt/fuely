import { useState, useEffect, useCallback } from "react";
import { getFavorites, addFavorite, removeFavorite } from "./api";
import type { FuelType, FavoriteStation, Station } from "./types";
import FuelTypeToggle from "./components/FuelTypeToggle";
import Nearby from "./pages/Nearby";
import Favorites from "./pages/Favorites";

type Tab = "nearby" | "favorites";

const FUEL_TYPE_KEY    = "fuely_fuel_type";
const DEFAULT_TAB_KEY  = "fuely_default_tab";
const LOCATION_KEY     = "fuely_location";
const RADIUS_KEY       = "fuely_radius";

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
  // Location and radius live here so they survive tab switches
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

  // Persist preferences
  useEffect(() => { localStorage.setItem(FUEL_TYPE_KEY, selectedFuel); }, [selectedFuel]);
  useEffect(() => { localStorage.setItem(RADIUS_KEY, String(radius)); }, [radius]);
  useEffect(() => {
    if (location) localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  }, [location]);

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
          />
        )}
        {tab === "favorites" && (
          <Favorites
            favorites={favorites}
            selectedFuel={selectedFuel}
            onToggleFavorite={handleToggleFavorite}
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
