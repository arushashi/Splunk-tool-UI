interface Props {
  value: string[];
  onChange: (indexes: string[]) => void;
  suggestions: string[];
}

export default function IndexSelector({ value, onChange, suggestions }: Props) {
  return (
    <div className="field-group">
      <label htmlFor="index-input">Index (comma-separated for multiple)</label>
      <input
        id="index-input"
        type="text"
        list="index-suggestions"
        placeholder="e.g. 1003865, 1003866"
        value={value.join(", ")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)
          )
        }
        style={{ minWidth: 220 }}
      />
      <datalist id="index-suggestions">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
