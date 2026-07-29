import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .routers import meta, saved_searches, search
from .splunk_client import SplunkAuthError, SplunkClient, SplunkConnectionError, SplunkQueryError

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.splunk_client = SplunkClient(settings)
    yield
    await app.state.splunk_client.aclose()


app = FastAPI(title="Splunk Log Viewer & Troubleshooting Tool", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SplunkAuthError)
async def auth_error_handler(request: Request, exc: SplunkAuthError):
    return JSONResponse(status_code=401, content={"detail": str(exc)})


@app.exception_handler(SplunkConnectionError)
async def connection_error_handler(request: Request, exc: SplunkConnectionError):
    return JSONResponse(status_code=504, content={"detail": str(exc)})


@app.exception_handler(SplunkQueryError)
async def query_error_handler(request: Request, exc: SplunkQueryError):
    return JSONResponse(status_code=502, content={"detail": str(exc)})


app.include_router(search.router)
app.include_router(saved_searches.router)
app.include_router(meta.router)
