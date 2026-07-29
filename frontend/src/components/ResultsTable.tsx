import React, { useMemo, useState } from "react";
import { LogEvent } from "../types";
import { highlightText } from "../utils/highlight";

type SortColumn = "time" | "level" | "sourcetype" | "host";

interface Props {
  events: LogEvent[];
  keyword: string;
  pageSize?: number;
}

export default function ResultsTable({ events, keyword, pageSize = 50 }: Props) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);

  const sorted = useMemo(() => {
    const copy = [...events];
    copy.sort((a, b) => {
      const av = (a[sortColumn] ?? "") as string;
      const bv = (b[sortColumn] ?? "") as string;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [events, sortColumn, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageItems = sorted.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

  function handleSort(col: SortColumn) {
    if (col === sortColumn) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDir("desc");
    }
    setPage(0);
  }

  function sortArrow(col: SortColumn) {
    if (col !== sortColumn) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  if (events.length === 0) {
    return <p className="status-line">No events to show. Run a search to get started.</p>;
  }

  return (
    <div>
      <table className="results-table">
        <thead>
          <tr>
            <th onClick={() => handleSort("time")}>Timestamp{sortArrow("time")}</th>
            <th onClick={() => handleSort("level")}>Level{sortArrow("level")}</th>
            <th onClick={() => handleSort("sourcetype")}>Sourcetype{sortArrow("sourcetype")}</th>
            <th onClick={() => handleSort("host")}>Host{sortArrow("host")}</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((event, i) => {
            const globalIndex = clampedPage * pageSize + i;
            const isExpanded = expanded === globalIndex;
            return (
              <React.Fragment key={globalIndex}>
                <tr
                  className="event-row"
                  onClick={() => setExpanded(isExpanded ? null : globalIndex)}
                >
                  <td style={{ whiteSpace: "nowrap" }}>{event.time ?? "-"}</td>
                  <td>
                    {event.level ? <span className={`level-badge ${event.level}`}>{event.level}</span> : "-"}
                  </td>
                  <td>{event.sourcetype ?? "-"}</td>
                  <td>{event.host ?? "-"}</td>
                  <td>{highlightText(event.raw.slice(0, 200), keyword)}</td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={5}>
                      <pre className="raw-event">{highlightText(event.raw, keyword)}</pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      <div className="pagination">
        <span>
          Page {clampedPage + 1} of {pageCount} ({events.length} events)
        </span>
        <button disabled={clampedPage === 0} onClick={() => setPage(clampedPage - 1)}>
          Prev
        </button>
        <button disabled={clampedPage >= pageCount - 1} onClick={() => setPage(clampedPage + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
