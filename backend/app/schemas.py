from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    indexes: List[str] = Field(..., min_length=1)
    log_levels: List[str] = Field(default_factory=lambda: ["ERROR", "WARN"])
    level_field: Optional[str] = None
    keyword: Optional[str] = None
    earliest: str = "-1h"
    latest: str = "now"
    raw_spl: Optional[str] = None


class SearchJobResponse(BaseModel):
    job_id: str
    spl: str


class JobStatus(BaseModel):
    job_id: str
    is_done: bool
    is_failed: bool
    done_progress: float
    event_count: int
    scan_count: int
    messages: List[Dict[str, Any]] = Field(default_factory=list)


class LogEvent(BaseModel):
    time: Optional[str] = None
    level: Optional[str] = None
    sourcetype: Optional[str] = None
    source: Optional[str] = None
    host: Optional[str] = None
    raw: str = ""
    fields: Dict[str, Any] = Field(default_factory=dict)


class SearchResultsResponse(BaseModel):
    events: List[LogEvent]
    offset: int
    count: int


class SavedSearch(BaseModel):
    id: Optional[str] = None
    name: str
    indexes: List[str]
    log_levels: List[str]
    level_field: Optional[str] = None
    keyword: Optional[str] = None
    time_preset: Optional[str] = None
    earliest: str
    latest: str
    raw_spl: Optional[str] = None
    created_at: Optional[str] = None


class AppConfig(BaseModel):
    default_indexes: List[str]
    level_field: str
    splunk_host: str
    available_log_levels: List[str] = Field(default_factory=lambda: ["ERROR", "WARN", "INFO"])
    default_log_levels: List[str] = Field(default_factory=lambda: ["ERROR", "WARN"])


class HealthStatus(BaseModel):
    status: str
    splunk_reachable: bool
    detail: Optional[str] = None
