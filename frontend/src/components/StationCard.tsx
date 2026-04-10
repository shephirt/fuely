import type { Ref } from "react";
import type { Station, FavoriteStation, FuelType, StationPrice } from "../types";
import type { DetourResult } from "../utils/stationUtils";

interface StationCardProps {
  station: Station | FavoriteStation;
  price?: StationPrice;
  isOpen?: boolean;
  dist?: number;
  isFavorite: boolean;
  selectedFuel: FuelType;
  fillVolume?: number;
  detourCost?: DetourResult;
  isSelected?: boolean;
  cardRef?: Ref<HTMLDivElement>;
  onToggleFavorite: (station: Station | FavoriteStation) => void;
  onSelect?: (station: Station | FavoriteStation) => void;
}

function formatPrice(price: number | false | undefined): string {
  if (price === false || price === undefined) return "—";
  return `€ ${price.toFixed(3)}`;
}

function formatTotal(price: number | false | undefined, fillVolume: number | undefined): string | null {
  if (typeof price !== "number" || !fillVolume) return null;
  return `€ ${(price * fillVolume).toFixed(2)} total`;
}

function PriceBadge({
  label,
  price,
  highlighted,
  fillVolume,
}: {
  label: string;
  price: number | false | undefined;
  highlighted: boolean;
  fillVolume?: number;
}) {
  const total = formatTotal(price, fillVolume);
  return (
    <div className={`price-badge${highlighted ? " highlighted" : ""}`}>
      <span className="price-label">{label}</span>
      <span className="price-value">{formatPrice(price)}</span>
      {total && <span className="price-total">{total}</span>}
    </div>
  );
}

function DetourBadge({ cost }: { cost: DetourResult }) {
  if (cost.kind === "baseline") {
    return (
      <span className="detour-badge baseline">
        Best price · no detour needed
      </span>
    );
  }

  const { netSaving, hasDetour } = cost;

  // Station is closer or same distance — no detour, pure price comparison
  if (!hasDetour) {
    if (netSaving >= 0) {
      // Closer AND cheaper — straightforward saving
      return (
        <span className="detour-badge baseline">
          Saves € {netSaving.toFixed(2)} vs cheapest
        </span>
      );
    }
    // Closer but more expensive
    return (
      <span className="detour-badge expensive">
        € {Math.abs(netSaving).toFixed(2)} more expensive to fill
      </span>
    );
  }

  // Station is farther — detour is involved
  if (netSaving >= 0) {
    return (
      <span className="detour-badge baseline">
        Detour saves € {netSaving.toFixed(2)} · Worth it
      </span>
    );
  }
  if (netSaving >= -1) {
    return (
      <span className="detour-badge warning">
        Detour costs € {Math.abs(netSaving).toFixed(2)} extra · Barely worth it
      </span>
    );
  }
  return (
    <span className="detour-badge expensive">
      Detour costs € {Math.abs(netSaving).toFixed(2)} extra · Not worth it
    </span>
  );
}

export default function StationCard({
  station,
  price,
  isOpen,
  dist,
  isFavorite,
  selectedFuel,
  fillVolume,
  detourCost,
  isSelected,
  cardRef,
  onToggleFavorite,
  onSelect,
}: StationCardProps) {
  const open = price ? price.status === "open" : isOpen;

  const e5 = price?.e5 ?? ("e5" in station ? station.e5 : undefined);
  const e10 = price?.e10 ?? ("e10" in station ? station.e10 : undefined);
  const diesel =
    price?.diesel ?? ("diesel" in station ? station.diesel : undefined);

  return (
    <div
      ref={cardRef}
      className={[
        "station-card",
        open ? "" : "closed",
        onSelect ? "clickable" : "",
        isSelected ? "selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSelect?.(station)}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(station);
            }
          : undefined
      }
    >
      <div className="station-card-header">
        <div className="station-name-row">
          <span className="station-brand">{station.brand || "—"}</span>
          <span className="station-name">{station.name}</span>
        </div>
        <button
          className={`fav-btn${isFavorite ? " active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(station);
          }}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </div>

      <div className="station-meta">
        <span className="station-address">
          {station.street} {station.houseNumber}, {station.postCode}{" "}
          {station.place}
        </span>
        {dist !== undefined && (
          <span className="station-dist">{dist.toFixed(1)} km</span>
        )}
      </div>

      <div className="station-prices">
        <PriceBadge
          label="E5"
          price={e5 as number | false | undefined}
          highlighted={selectedFuel === "e5" || selectedFuel === "all"}
          fillVolume={fillVolume}
        />
        <PriceBadge
          label="E10"
          price={e10 as number | false | undefined}
          highlighted={selectedFuel === "e10" || selectedFuel === "all"}
          fillVolume={fillVolume}
        />
        <PriceBadge
          label="Diesel"
          price={diesel as number | false | undefined}
          highlighted={selectedFuel === "diesel" || selectedFuel === "all"}
          fillVolume={fillVolume}
        />
      </div>

      <div className="station-footer">
        <span className={`status-badge ${open ? "open" : "closed"}`}>
          {open ? "Open" : "Closed"}
        </span>
        {detourCost !== undefined && <DetourBadge cost={detourCost} />}
        {onSelect && detourCost === undefined && (
          <span className="show-on-map-hint">Click to show on map</span>
        )}
      </div>
    </div>
  );
}
