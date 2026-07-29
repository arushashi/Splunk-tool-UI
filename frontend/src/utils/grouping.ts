import { LogEvent } from "../types";

// Collapse volatile tokens (numbers, uuids, hex ids, quoted strings) so that
// near-identical error messages ("timeout after 4013ms" vs "...4522ms")
// group together instead of each counting as a unique message.
export function normalizeMessage(raw: string): string {
  return raw
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\b0x[0-9a-f]+\b/gi, "<hex>")
    .replace(/"[^"]*"/g, '"<str>"')
    .replace(/\b\d+\b/g, "<n>")
    .replace(/\s+/g, " ")
    .trim();
}

export interface EventGroup {
  key: string;
  sample: LogEvent;
  count: number;
  level: string | null;
  events: LogEvent[];
}

export function groupEvents(events: LogEvent[]): EventGroup[] {
  const groups = new Map<string, EventGroup>();
  for (const event of events) {
    const key = `${event.level ?? ""}::${normalizeMessage(event.raw)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.events.push(event);
    } else {
      groups.set(key, { key, sample: event, count: 1, level: event.level, events: [event] });
    }
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}
