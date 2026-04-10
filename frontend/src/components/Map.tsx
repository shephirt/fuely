import { useEffect, useImperativeHandle, forwardRef, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Station, FavoriteStation, FuelType, StationPrice } from "../types";

// Fix default marker icon paths broken by bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const openIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const closedIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function formatPrice(price: number | false | undefined): string {
  if (price === false || price === undefined) return "—";
  return `€ ${price.toFixed(3)}`;
}

// ── Inner component that has access to the Leaflet map instance ───────
export interface MapHandle {
  flyToStation: (lat: number, lng: number) => void;
}

interface MapControllerProps {
  userLat: number;
  userLng: number;
  handleRef: React.Ref<MapHandle>;
}

function MapController({ userLat, userLng, handleRef }: MapControllerProps) {
  const map = useMap();

  // Recenter when user location changes
  useEffect(() => {
    map.setView([userLat, userLng]);
  }, [userLat, userLng, map]);

  // Expose flyToStation imperatively
  useImperativeHandle(
    handleRef,
    () => ({
      flyToStation: (lat: number, lng: number) => {
        map.flyTo([lat, lng], 16, { duration: 0.8 });
      },
    }),
    [map]
  );

  return null;
}

// ── Public Map component ──────────────────────────────────────────────
export interface MapProps {
  userLat: number;
  userLng: number;
  stations: (Station | FavoriteStation)[];
  prices?: Record<string, StationPrice>;
  selectedFuel: FuelType;
  radius?: number;
}

const Map = forwardRef<MapHandle, MapProps>(function Map(
  { userLat, userLng, stations, prices, selectedFuel, radius },
  ref
) {
  // We need an internal ref to pass to MapController
  const internalRef = useRef<MapHandle>(null);

  useImperativeHandle(ref, () => ({
    flyToStation: (lat, lng) => internalRef.current?.flyToStation(lat, lng),
  }));

  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={13}
      className="leaflet-map"
      style={{ height: "380px", width: "100%" }}
    >
      <MapController
        userLat={userLat}
        userLng={userLng}
        handleRef={internalRef}
      />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User location marker */}
      <Marker position={[userLat, userLng]}>
        <Popup>Your location</Popup>
      </Marker>

      {/* Search radius circle */}
      {radius !== undefined && (
        <Circle
          center={[userLat, userLng]}
          radius={radius * 1000}
          pathOptions={{ color: "#4a90e2", fillOpacity: 0.05, weight: 1.5 }}
        />
      )}

      {/* Station markers */}
      {stations.map((station) => {
        const price = prices?.[station.id];
        const isOpen =
          price
            ? price.status === "open"
            : "isOpen" in station
              ? station.isOpen
              : true;

        const e5 =
          price?.e5 ?? ("e5" in station ? station.e5 : undefined);
        const e10 =
          price?.e10 ?? ("e10" in station ? station.e10 : undefined);
        const diesel =
          price?.diesel ?? ("diesel" in station ? station.diesel : undefined);

        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={isOpen ? openIcon : closedIcon}
          >
            <Popup>
              <strong>
                {station.brand} {station.name}
              </strong>
              <br />
              {station.street} {station.houseNumber}
              <br />
              {station.postCode} {station.place}
              <br />
              <br />
              {(selectedFuel === "e5" || selectedFuel === "all") && (
                <span>
                  E5: {formatPrice(e5 as number | false | undefined)}
                  <br />
                </span>
              )}
              {(selectedFuel === "e10" || selectedFuel === "all") && (
                <span>
                  E10: {formatPrice(e10 as number | false | undefined)}
                  <br />
                </span>
              )}
              {(selectedFuel === "diesel" || selectedFuel === "all") && (
                <span>
                  Diesel:{" "}
                  {formatPrice(diesel as number | false | undefined)}
                  <br />
                </span>
              )}
              <br />
              <span style={{ color: isOpen ? "green" : "red" }}>
                {isOpen ? "Open" : "Closed"}
              </span>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
});

export default Map;
