interface Props {
  value: string;
  onChange: (keyword: string) => void;
}

export default function KeywordSearch({ value, onChange }: Props) {
  return (
    <div className="field-group">
      <label htmlFor="keyword-input">Keyword / phrase</label>
      <input
        id="keyword-input"
        type="text"
        placeholder="exception name, transaction id, service..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ minWidth: 240 }}
      />
    </div>
  );
}
