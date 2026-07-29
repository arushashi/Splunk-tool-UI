import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from .schemas import SavedSearch

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_DATA_FILE = _DATA_DIR / "saved_searches.json"
_lock = asyncio.Lock()


def _read_all() -> List[dict]:
    if not _DATA_FILE.exists():
        return []
    with _DATA_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def _write_all(items: List[dict]) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    with _DATA_FILE.open("w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)


async def list_saved_searches() -> List[SavedSearch]:
    async with _lock:
        return [SavedSearch(**item) for item in _read_all()]


async def create_saved_search(search: SavedSearch) -> SavedSearch:
    async with _lock:
        items = _read_all()
        search.id = str(uuid.uuid4())
        search.created_at = datetime.now(timezone.utc).isoformat()
        items.append(search.model_dump())
        _write_all(items)
        return search


async def delete_saved_search(search_id: str) -> bool:
    async with _lock:
        items = _read_all()
        remaining = [item for item in items if item.get("id") != search_id]
        if len(remaining) == len(items):
            return False
        _write_all(remaining)
        return True
