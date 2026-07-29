export interface TimePreset {
  key: string;
  label: string;
  earliest: string;
  latest: string;
}

export const TIME_PRESETS: TimePreset[] = [
  { key: "1m", label: "Last 1 min", earliest: "-1m", latest: "now" },
  { key: "3m", label: "Last 3 min", earliest: "-3m", latest: "now" },
  { key: "5m", label: "Last 5 min", earliest: "-5m", latest: "now" },
  { key: "15m", label: "Last 15 min", earliest: "-15m", latest: "now" },
  { key: "1h", label: "Last 1 hr", earliest: "-1h", latest: "now" },
  { key: "24h", label: "Last 24 hr", earliest: "-24h", latest: "now" },
  { key: "7d", label: "Last 7 days", earliest: "-7d", latest: "now" },
  { key: "custom", label: "Custom", earliest: "", latest: "" },
];

export const DEFAULT_TIME_PRESET_KEY = "1h";

export function presetByKey(key: string): TimePreset | undefined {
  return TIME_PRESETS.find((p) => p.key === key);
}

export function toEpochSeconds(datetimeLocalValue: string): string {
  const ms = new Date(datetimeLocalValue).getTime();
  return String(Math.floor(ms / 1000));
}
