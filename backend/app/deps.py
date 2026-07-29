from fastapi import Request

from .splunk_client import SplunkClient


def get_splunk_client(request: Request) -> SplunkClient:
    return request.app.state.splunk_client
