import React from "react";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightText(text: string, keyword: string | null | undefined): React.ReactNode {
  if (!keyword || !keyword.trim()) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(keyword)})`, "gi"));
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={i}>{part}</mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}
