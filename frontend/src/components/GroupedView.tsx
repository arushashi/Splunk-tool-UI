import React, { useState } from "react";
import { LogEvent } from "../types";
import { groupEvents } from "../utils/grouping";
import { highlightText } from "../utils/highlight";

interface Props {
  events: LogEvent[];
  keyword: string;
}

export default function GroupedView({ events, keyword }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const groups = groupEvents(events);

  if (groups.length === 0) {
    return <p className="status-line">No events to group.</p>;
  }

  return (
    <table className="results-table">
      <thead>
        <tr>
          <th>Count</th>
          <th>Level</th>
          <th>Last seen</th>
          <th>Message pattern</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((group) => (
          <React.Fragment key={group.key}>
            <tr
              className="event-row"
              onClick={() => setExpanded(expanded === group.key ? null : group.key)}
            >
              <td>
                <span className="group-count-badge">seen {group.count}x</span>
              </td>
              <td>{group.level ? <span className={`level-badge ${group.level}`}>{group.level}</span> : "-"}</td>
              <td style={{ whiteSpace: "nowrap" }}>{group.sample.time ?? "-"}</td>
              <td>{highlightText(group.sample.raw.slice(0, 220), keyword)}</td>
            </tr>
            {expanded === group.key && (
              <tr>
                <td colSpan={4}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {group.events.slice(0, 10).map((e, i) => (
                      <pre key={i} className="raw-event">
                        {e.time} — {highlightText(e.raw, keyword)}
                      </pre>
                    ))}
                    {group.events.length > 10 && (
                      <span className="status-line">...and {group.events.length - 10} more</span>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}
