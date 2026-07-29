from fastapi import APIRouter, Depends, HTTPException

from ..config import Settings, get_settings
from ..deps import get_splunk_client
from ..schemas import JobStatus, LogEvent, SearchJobResponse, SearchRequest, SearchResultsResponse
from ..spl_builder import build_spl
from ..splunk_client import SplunkClient

router = APIRouter(prefix="/api/search", tags=["search"])

_RESERVED_FIELDS = {"_time", "_raw", "host", "source", "sourcetype"}


def _event_from_result(raw_result: dict, level_field: str) -> LogEvent:
    extra = {k: v for k, v in raw_result.items() if k not in _RESERVED_FIELDS and k != level_field and not k.startswith("_")}
    return LogEvent(
        time=raw_result.get("_time"),
        level=raw_result.get(level_field),
        sourcetype=raw_result.get("sourcetype"),
        source=raw_result.get("source"),
        host=raw_result.get("host"),
        raw=raw_result.get("_raw", ""),
        fields=extra,
    )


@router.post("", response_model=SearchJobResponse)
async def start_search(
    req: SearchRequest,
    settings: Settings = Depends(get_settings),
    client: SplunkClient = Depends(get_splunk_client),
):
    if not req.indexes:
        raise HTTPException(status_code=400, detail="At least one index is required.")

    level_field = req.level_field or settings.splunk_level_field

    if req.raw_spl and req.raw_spl.strip():
        spl = req.raw_spl.strip()
    else:
        spl = build_spl(req.indexes, req.log_levels, level_field, req.keyword)

    sid = await client.create_search_job(spl, req.earliest, req.latest)
    return SearchJobResponse(job_id=sid, spl=spl)


@router.get("/{job_id}/status", response_model=JobStatus)
async def search_status(job_id: str, client: SplunkClient = Depends(get_splunk_client)):
    status = await client.get_job_status(job_id)
    return JobStatus(job_id=job_id, **status)


@router.get("/{job_id}/results", response_model=SearchResultsResponse)
async def search_results(
    job_id: str,
    offset: int = 0,
    count: int = 200,
    level_field: str | None = None,
    settings: Settings = Depends(get_settings),
    client: SplunkClient = Depends(get_splunk_client),
):
    field = level_field or settings.splunk_level_field
    payload = await client.get_job_results(job_id, offset, count)
    events = [_event_from_result(r, field) for r in payload.get("results", [])]
    return SearchResultsResponse(events=events, offset=offset, count=len(events))


@router.delete("/{job_id}")
async def cancel_search(job_id: str, client: SplunkClient = Depends(get_splunk_client)):
    await client.cancel_job(job_id)
    return {"cancelled": True}
