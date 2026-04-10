const RADII = [1, 2, 5, 10, 25];

interface RadiusSelectorProps {
  value: number;
  onChange: (radius: number) => void;
}

export default function RadiusSelector({ value, onChange }: RadiusSelectorProps) {
  return (
    <div className="radius-selector">
      <label htmlFor="radius-select">Radius:</label>
      <select
        id="radius-select"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {RADII.map((r) => (
          <option key={r} value={r}>
            {r} km
          </option>
        ))}
      </select>
    </div>
  );
}
