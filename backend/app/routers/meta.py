from fastapi import APIRouter, Depends

from ..config import Settings, get_settings
from ..deps import get_splunk_client
from ..schemas import AppConfig, HealthStatus
from ..splunk_client import SplunkAuthError, SplunkClient, SplunkConnectionError

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/config", response_model=AppConfig)
async def get_config(settings: Settings = Depends(get_settings)):
    return AppConfig(
        default_indexes=settings.default_indexes_list,
        level_field=settings.splunk_level_field,
        splunk_host=settings.splunk_host,
    )


@router.get("/health", response_model=HealthStatus)
async def health(client: SplunkClient = Depends(get_splunk_client)):
    try:
        await client.ensure_authenticated()
    except SplunkAuthError as exc:
        return HealthStatus(status="degraded", splunk_reachable=False, detail=str(exc))
    except SplunkConnectionError as exc:
        return HealthStatus(status="down", splunk_reachable=False, detail=str(exc))
    return HealthStatus(status="ok", splunk_reachable=True)
