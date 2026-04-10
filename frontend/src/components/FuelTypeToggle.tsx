import type { FuelType } from "../types";

interface FuelTypeToggleProps {
  value: FuelType;
  onChange: (type: FuelType) => void;
}

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "e5", label: "E5" },
  { value: "e10", label: "E10" },
  { value: "diesel", label: "Diesel" },
];

export default function FuelTypeToggle({ value, onChange }: FuelTypeToggleProps) {
  return (
    <div className="fuel-toggle">
      {FUEL_TYPES.map((ft) => (
        <button
          key={ft.value}
          className={`fuel-btn${value === ft.value ? " active" : ""}`}
          onClick={() => onChange(ft.value)}
          aria-pressed={value === ft.value}
        >
          {ft.label}
        </button>
      ))}
    </div>
  );
}
