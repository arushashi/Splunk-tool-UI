interface Props {
  generatedSpl: string;
  useCustomSpl: boolean;
  customSpl: string;
  onToggleCustom: (enabled: boolean) => void;
  onCustomSplChange: (spl: string) => void;
}

export default function SplQueryPreview({
  generatedSpl,
  useCustomSpl,
  customSpl,
  onToggleCustom,
  onCustomSplChange,
}: Props) {
  return (
    <div className="panel spl-preview">
      <h3>SPL query</h3>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-dim)" }}>
        <input
          type="checkbox"
          checked={useCustomSpl}
          onChange={(e) => onToggleCustom(e.target.checked)}
        />
        Edit query directly (advanced)
      </label>
      <textarea
        rows={3}
        readOnly={!useCustomSpl}
        value={useCustomSpl ? customSpl : generatedSpl}
        onChange={(e) => onCustomSplChange(e.target.value)}
        style={{ opacity: useCustomSpl ? 1 : 0.75 }}
      />
    </div>
  );
}
