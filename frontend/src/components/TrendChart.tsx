import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LogEvent } from "../types";

interface Props {
  events: LogEvent[];
  bucketCount?: number;
}

interface Bucket {
  label: string;
  ERROR: number;
  WARN: number;
  INFO: number;
}

const LEVEL_COLORS: Record<string, string> = {
  ERROR: "#ff5c5c",
  WARN: "#f5b942",
  INFO: "#6bb6ff",
};

export default function TrendChart({ events, bucketCount = 24 }: Props) {
  const buckets = useMemo(() => {
    const timed = events
      .map((e) => ({ ...e, ts: e.time ? new Date(e.time).getTime() : NaN }))
      .filter((e) => !Number.isNaN(e.ts));

    if (timed.length === 0) return [] as Bucket[];

    const min = Math.min(...timed.map((e) => e.ts));
    const max = Math.max(...timed.map((e) => e.ts));
    const span = Math.max(max - min, 1);
    const bucketMs = span / bucketCount;

    const result: Bucket[] = Array.from({ length: bucketCount }, (_, i) => {
      const bucketStart = new Date(min + i * bucketMs);
      return {
        label: bucketStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        ERROR: 0,
        WARN: 0,
        INFO: 0,
      };
    });

    for (const e of timed) {
      const idx = Math.min(bucketCount - 1, Math.floor((e.ts - min) / bucketMs));
      const level = (e.level || "").toUpperCase();
      if (level === "ERROR" || level === "WARN" || level === "INFO") {
        result[idx][level as "ERROR" | "WARN" | "INFO"] += 1;
      }
    }

    return result;
  }, [events, bucketCount]);

  if (buckets.length === 0) {
    return <p className="status-line">No time-series data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={buckets}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2e38" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9aa1ac" }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: "#9aa1ac" }} allowDecimals={false} />
        <Tooltip contentStyle={{ background: "#171a21", border: "1px solid #2a2e38", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="ERROR" stackId="a" fill={LEVEL_COLORS.ERROR} />
        <Bar dataKey="WARN" stackId="a" fill={LEVEL_COLORS.WARN} />
        <Bar dataKey="INFO" stackId="a" fill={LEVEL_COLORS.INFO} />
      </BarChart>
    </ResponsiveContainer>
  );
}
