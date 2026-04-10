import { useEffect, useImperativeHandle, forwardRef, useRef, useCallback } from "react";
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

function formatPrice(price: number | false | undefined): string {
  if (price === false || price === undefined) return "—";
  return `€ ${price.toFixed(3)}`;
}

function makePricePin(label: string, isOpen: boolean): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="map-price-pin${isOpen ? "" : " closed"}">${label}</div>`,
    iconAnchor: [28, 28],
    popupAnchor: [0, -32],
  });
}

// ── Inner component that has access to the Leaflet map instance ───────
export interface MapHandle {
  flyToStation: (lat: number, lng: number, stationId?: string) => void;
}

interface MapControllerProps {
  userLat: number;
  userLng: number;
  handleRef: React.Ref<MapHandle>;
  markerRefs: React.MutableRefObject<Record<string, L.Marker>>;
}

function MapController({ userLat, userLng, handleRef, markerRefs }: MapControllerProps) {
  const map = useMap();

  // Recenter when user location changes
  useEffect(() => {
    map.setView([userLat, userLng]);
  }, [userLat, userLng, map]);

  // Expose flyToStation imperatively
  useImperativeHandle(
    handleRef,
    () => ({
      flyToStation: (lat: number, lng: number, stationId?: string) => {
        map.flyTo([lat, lng], 16, { duration: 0.8 });
        if (stationId) {
          setTimeout(() => {
            markerRefs.current[stationId]?.openPopup();
          }, 850);
        }
      },
    }),
    [map, markerRefs]
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
  onMarkerClick?: (stationId: string) => void;
}

const Map = forwardRef<MapHandle, MapProps>(function Map(
  { userLat, userLng, stations, prices, selectedFuel, radius, onMarkerClick },
  ref
) {
  const internalRef = useRef<MapHandle>(null);
  const markerRefs = useRef<Record<string, L.Marker>>({});

  useImperativeHandle(ref, () => ({
    flyToStation: (lat, lng, stationId) =>
      internalRef.current?.flyToStation(lat, lng, stationId),
  }));

  const setMarkerRef = useCallback(
    (id: string) => (marker: L.Marker | null) => {
      if (marker) {
        markerRefs.current[id] = marker;
      } else {
        delete markerRefs.current[id];
      }
    },
    []
  );

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
        markerRefs={markerRefs}
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

        // Resolve the price label shown on the pin
        const pinPrice =
          selectedFuel === "e5"
            ? e5
            : selectedFuel === "e10"
              ? e10
              : selectedFuel === "diesel"
                ? diesel
                : e10; // "all" → show E10

        const pinLabel =
          typeof pinPrice === "number"
            ? `€ ${pinPrice.toFixed(3)}`
            : "—";

        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={makePricePin(pinLabel, isOpen ?? true)}
            ref={setMarkerRef(station.id)}
            eventHandlers={{
              click: () => onMarkerClick?.(station.id),
            }}
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
