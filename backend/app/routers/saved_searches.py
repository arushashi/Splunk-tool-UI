from fastapi import APIRouter, HTTPException

from .. import storage
from ..schemas import SavedSearch

router = APIRouter(prefix="/api/saved-searches", tags=["saved-searches"])


@router.get("", response_model=list[SavedSearch])
async def list_saved_searches():
    return await storage.list_saved_searches()


@router.post("", response_model=SavedSearch)
async def create_saved_search(search: SavedSearch):
    if not search.name.strip():
        raise HTTPException(status_code=400, detail="Saved search name is required.")
    return await storage.create_saved_search(search)


@router.delete("/{search_id}")
async def delete_saved_search(search_id: str):
    deleted = await storage.delete_saved_search(search_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Saved search not found.")
    return {"deleted": True}
