import {
  AppConfig,
  JobStatus,
  SavedSearch,
  SearchJobResponse,
  SearchResultsResponse,
} from "./types";

async function handle<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const body = await resp.json();
      detail = body.detail || detail;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(detail);
  }
  return resp.json() as Promise<T>;
}

export interface StartSearchPayload {
  indexes: string[];
  log_levels: string[];
  level_field?: string | null;
  keyword?: string | null;
  earliest: string;
  latest: string;
  raw_spl?: string | null;
}

export async function getConfig(): Promise<AppConfig> {
  return handle(await fetch("/api/config"));
}

export async function startSearch(payload: StartSearchPayload): Promise<SearchJobResponse> {
  return handle(
    await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function getSearchStatus(jobId: string, signal?: AbortSignal): Promise<JobStatus> {
  return handle(await fetch(`/api/search/${encodeURIComponent(jobId)}/status`, { signal }));
}

export async function getSearchResults(
  jobId: string,
  offset: number,
  count: number,
  signal?: AbortSignal
): Promise<SearchResultsResponse> {
  return handle(
    await fetch(
      `/api/search/${encodeURIComponent(jobId)}/results?offset=${offset}&count=${count}`,
      { signal }
    )
  );
}

export async function cancelSearch(jobId: string): Promise<void> {
  await fetch(`/api/search/${encodeURIComponent(jobId)}`, { method: "DELETE" });
}

export async function listSavedSearches(): Promise<SavedSearch[]> {
  return handle(await fetch("/api/saved-searches"));
}

export async function createSavedSearch(search: SavedSearch): Promise<SavedSearch> {
  return handle(
    await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(search),
    })
  );
}

export async function deleteSavedSearch(id: string): Promise<void> {
  await fetch(`/api/saved-searches/${encodeURIComponent(id)}`, { method: "DELETE" });
}
