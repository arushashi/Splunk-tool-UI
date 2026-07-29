import { useState } from "react";
import { SavedSearch } from "../types";

interface Props {
  savedSearches: SavedSearch[];
  onSave: (name: string) => void;
  onLoad: (search: SavedSearch) => void;
  onDelete: (id: string) => void;
}

export default function SavedSearches({ savedSearches, onSave, onLoad, onDelete }: Props) {
  const [name, setName] = useState("");

  function handleSave() {
    if (!name.trim()) return;
    onSave(name.trim());
    setName("");
  }

  return (
    <div className="panel">
      <h3>Saved searches</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Name this search..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: 1 }}
        />
        <button onClick={handleSave}>Save current</button>
      </div>
      {savedSearches.length === 0 ? (
        <p className="status-line">No saved searches yet.</p>
      ) : (
        <div className="saved-search-list">
          {savedSearches.map((s) => (
            <div className="saved-search-item" key={s.id}>
              <span onClick={() => onLoad(s)} style={{ cursor: "pointer" }}>
                {s.name}{" "}
                <span className="status-line">
                  ({s.indexes.join(",")} · {s.log_levels.join("/")})
                </span>
              </span>
              <button className="danger" onClick={() => s.id && onDelete(s.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
