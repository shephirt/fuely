import type { Ref } from "react";
import type { Station, FavoriteStation, FuelType, StationPrice } from "../types";

interface StationCardProps {
  station: Station | FavoriteStation;
  price?: StationPrice;
  isOpen?: boolean;
  dist?: number;
  isFavorite: boolean;
  selectedFuel: FuelType;
  detourCost?: number | "baseline";
  isSelected?: boolean;
  cardRef?: Ref<HTMLDivElement>;
  onToggleFavorite: (station: Station | FavoriteStation) => void;
  onSelect?: (station: Station | FavoriteStation) => void;
}

function formatPrice(price: number | false | undefined): string {
  if (price === false || price === undefined) return "—";
  return `€ ${price.toFixed(3)}`;
}

function PriceBadge({
  label,
  price,
  highlighted,
}: {
  label: string;
  price: number | false | undefined;
  highlighted: boolean;
}) {
  return (
    <div className={`price-badge${highlighted ? " highlighted" : ""}`}>
      <span className="price-label">{label}</span>
      <span className="price-value">{formatPrice(price)}</span>
    </div>
  );
}

function DetourBadge({ cost }: { cost: number | "baseline" }) {
  if (cost === "baseline") {
    return <span className="detour-badge baseline">Best price</span>;
  }
  if (cost >= 0) {
    return (
      <span className="detour-badge baseline">
        Save € {cost.toFixed(2)} — Worth it
      </span>
    );
  }
  if (cost >= -1) {
    return (
      <span className="detour-badge warning">
        Extra € {Math.abs(cost).toFixed(2)} — Barely worth it
      </span>
    );
  }
  return (
    <span className="detour-badge expensive">
      Extra € {Math.abs(cost).toFixed(2)} — Not worth it
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
        />
        <PriceBadge
          label="E10"
          price={e10 as number | false | undefined}
          highlighted={selectedFuel === "e10" || selectedFuel === "all"}
        />
        <PriceBadge
          label="Diesel"
          price={diesel as number | false | undefined}
          highlighted={selectedFuel === "diesel" || selectedFuel === "all"}
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
