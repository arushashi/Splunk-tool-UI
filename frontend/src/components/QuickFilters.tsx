import { useMemo } from "react";
import { LogEvent } from "../types";

export type QuickFilterField = "host" | "sourcetype" | "source";

export interface ActiveQuickFilters {
  host: string[];
  sourcetype: string[];
  source: string[];
}

interface Props {
  events: LogEvent[];
  active: ActiveQuickFilters;
  onToggle: (field: QuickFilterField, value: string) => void;
  maxPerField?: number;
}

const FIELDS: QuickFilterField[] = ["host", "sourcetype", "source"];

export default function QuickFilters({ events, active, onToggle, maxPerField = 8 }: Props) {
  const counts = useMemo(() => {
    const result: Record<QuickFilterField, Map<string, number>> = {
      host: new Map(),
      sourcetype: new Map(),
      source: new Map(),
    };
    for (const event of events) {
      for (const field of FIELDS) {
        const value = event[field];
        if (!value) continue;
        result[field].set(value, (result[field].get(value) || 0) + 1);
      }
    }
    return result;
  }, [events]);

  const hasAny = FIELDS.some((f) => counts[f].size > 0);
  if (!hasAny) return null;

  return (
    <div className="panel">
      <h3>Quick filters</h3>
      {FIELDS.map((field) => {
        const entries = Array.from(counts[field].entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, maxPerField);
        if (entries.length === 0) return null;
        return (
          <div key={field} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4, textTransform: "capitalize" }}>
              {field}
            </div>
            <div className="chip-row">
              {entries.map(([value, count]) => (
                <div
                  key={value}
                  className={`chip ${active[field].includes(value) ? "active" : ""}`}
                  onClick={() => onToggle(field, value)}
                >
                  {value} <span style={{ color: "var(--text-dim)" }}>({count})</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
