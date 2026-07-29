import asyncio
import logging
from typing import Any, Dict, Optional

import httpx

from .config import Settings

logger = logging.getLogger("splunk_client")


class SplunkAuthError(Exception):
    """Raised when the service account cannot authenticate against Splunk."""


class SplunkConnectionError(Exception):
    """Raised when Splunk cannot be reached at all (network/timeout)."""


class SplunkQueryError(Exception):
    """Raised when Splunk rejects a search job or returns an error payload."""


class SplunkClient:
    """
    Thin async wrapper around the Splunk REST API (port 8089).

    Authenticates once against /services/auth/login and reuses the resulting
    session key for every subsequent call. If a call comes back 401 (session
    expired/invalidated on the Splunk side), the client transparently logs in
    again and retries the call exactly once.
    """

    def __init__(self, settings: Settings):
        self._settings = settings
        self._token: Optional[str] = None
        self._login_lock = asyncio.Lock()
        self._client = httpx.AsyncClient(
            base_url=settings.splunk_base_url,
            verify=settings.splunk_verify_ssl,
            timeout=httpx.Timeout(
                connect=settings.splunk_connect_timeout,
                read=settings.splunk_read_timeout,
                write=settings.splunk_connect_timeout,
                pool=settings.splunk_connect_timeout,
            ),
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _login(self) -> str:
        async with self._login_lock:
            if not self._settings.splunk_username or not self._settings.splunk_password:
                raise SplunkAuthError(
                    "Splunk service account credentials are not configured "
                    "(SPLUNK_USERNAME / SPLUNK_PASSWORD)."
                )
            try:
                resp = await self._client.post(
                    "/services/auth/login",
                    data={
                        "username": self._settings.splunk_username,
                        "password": self._settings.splunk_password,
                        "output_mode": "json",
                    },
                )
            except httpx.RequestError as exc:
                raise SplunkConnectionError(f"Could not reach Splunk at {self._settings.splunk_base_url}: {exc}") from exc

            if resp.status_code == 401:
                raise SplunkAuthError("Splunk rejected the service account credentials.")
            if resp.status_code != 200:
                raise SplunkAuthError(f"Splunk login failed with status {resp.status_code}: {resp.text[:300]}")

            try:
                token = resp.json()["sessionKey"]
            except (KeyError, ValueError) as exc:
                raise SplunkAuthError("Splunk login response did not include a sessionKey.") from exc

            self._token = token
            logger.info("Authenticated to Splunk as %s", self._settings.splunk_username)
            return token

    async def _get_token(self) -> str:
        if self._token is None:
            return await self._login()
        return self._token

    async def ensure_authenticated(self) -> None:
        """Force a login attempt; raises SplunkAuthError/SplunkConnectionError on failure."""
        await self._login()

    async def request(self, method: str, path: str, *, retry_on_auth_failure: bool = True, **kwargs) -> httpx.Response:
        token = await self._get_token()
        headers = kwargs.pop("headers", {}) or {}
        headers["Authorization"] = f"Splunk {token}"

        try:
            resp = await self._client.request(method, path, headers=headers, **kwargs)
        except httpx.RequestError as exc:
            raise SplunkConnectionError(f"Could not reach Splunk at {self._settings.splunk_base_url}: {exc}") from exc

        if resp.status_code == 401 and retry_on_auth_failure:
            logger.info("Splunk session expired, re-authenticating")
            self._token = None
            await self._login()
            return await self.request(method, path, retry_on_auth_failure=False, **kwargs)

        if resp.status_code == 401:
            raise SplunkAuthError("Splunk session expired and re-authentication failed.")

        return resp

    async def create_search_job(self, spl: str, earliest: str, latest: str) -> str:
        resp = await self.request(
            "POST",
            "/services/search/jobs",
            data={
                "search": spl,
                "earliest_time": earliest,
                "latest_time": latest,
                "output_mode": "json",
                "exec_mode": "normal",
            },
        )
        if resp.status_code not in (200, 201):
            raise SplunkQueryError(f"Failed to create search job ({resp.status_code}): {resp.text[:500]}")
        try:
            return resp.json()["sid"]
        except (KeyError, ValueError) as exc:
            raise SplunkQueryError("Splunk did not return a search job id (sid).") from exc

    async def get_job_status(self, sid: str) -> Dict[str, Any]:
        resp = await self.request("GET", f"/services/search/jobs/{sid}", params={"output_mode": "json"})
        if resp.status_code == 404:
            raise SplunkQueryError(f"Search job {sid} was not found (it may have expired or been cancelled).")
        if resp.status_code != 200:
            raise SplunkQueryError(f"Failed to fetch job status ({resp.status_code}): {resp.text[:500]}")
        content = resp.json()["entry"][0]["content"]
        return {
            "is_done": bool(content.get("isDone")),
            "is_failed": bool(content.get("isFailed")),
            "done_progress": float(content.get("doneProgress", 0.0)),
            "event_count": int(content.get("eventCount", 0)),
            "scan_count": int(content.get("scanCount", 0)),
            "messages": content.get("messages", []),
        }

    async def get_job_results(self, sid: str, offset: int, count: int) -> Dict[str, Any]:
        resp = await self.request(
            "GET",
            f"/services/search/jobs/{sid}/results",
            params={"output_mode": "json", "offset": offset, "count": count},
        )
        if resp.status_code != 200:
            raise SplunkQueryError(f"Failed to fetch job results ({resp.status_code}): {resp.text[:500]}")
        return resp.json()

    async def cancel_job(self, sid: str) -> None:
        resp = await self.request(
            "POST",
            f"/services/search/jobs/{sid}/control",
            data={"action": "cancel"},
        )
        if resp.status_code not in (200, 201, 404):
            raise SplunkQueryError(f"Failed to cancel search job ({resp.status_code}): {resp.text[:500]}")
