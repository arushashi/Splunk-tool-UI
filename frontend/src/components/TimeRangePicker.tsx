import { TIME_PRESETS } from "../utils/timePresets";

interface Props {
  presetKey: string;
  customStart: string;
  customEnd: string;
  onPresetChange: (key: string) => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
}

export default function TimeRangePicker({
  presetKey,
  customStart,
  customEnd,
  onPresetChange,
  onCustomStartChange,
  onCustomEndChange,
}: Props) {
  return (
    <div className="field-group">
      <label htmlFor="time-preset">Time range</label>
      <select id="time-preset" value={presetKey} onChange={(e) => onPresetChange(e.target.value)}>
        {TIME_PRESETS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
      {presetKey === "custom" && (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <input
            type="datetime-local"
            value={customStart}
            onChange={(e) => onCustomStartChange(e.target.value)}
          />
          <span style={{ alignSelf: "center", color: "var(--text-dim)" }}>to</span>
          <input
            type="datetime-local"
            value={customEnd}
            onChange={(e) => onCustomEndChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
