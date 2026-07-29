import { LogEvent } from "../types";

function download(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportJSON(events: LogEvent[]): void {
  download(`splunk-events-${Date.now()}.json`, JSON.stringify(events, null, 2), "application/json");
}

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCSV(events: LogEvent[]): void {
  const headers = ["time", "level", "sourcetype", "source", "host", "raw"];
  const rows = events.map((e) => headers.map((h) => csvEscape((e as any)[h])).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  download(`splunk-events-${Date.now()}.csv`, csv, "text/csv");
}
