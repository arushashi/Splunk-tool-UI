import { SearchParamsState } from "../types";

const KEYS = {
  indexes: "idx",
  logLevels: "lvl",
  levelField: "field",
  keyword: "q",
  timePreset: "preset",
  earliest: "from",
  latest: "to",
  rawSpl: "spl",
} as const;

export function stateToUrlParams(state: SearchParamsState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.indexes.length) params.set(KEYS.indexes, state.indexes.join(","));
  if (state.logLevels.length) params.set(KEYS.logLevels, state.logLevels.join(","));
  if (state.levelField) params.set(KEYS.levelField, state.levelField);
  if (state.keyword) params.set(KEYS.keyword, state.keyword);
  if (state.timePreset) params.set(KEYS.timePreset, state.timePreset);
  if (state.timePreset === "custom") {
    params.set(KEYS.earliest, state.earliest);
    params.set(KEYS.latest, state.latest);
  }
  if (state.rawSpl) params.set(KEYS.rawSpl, state.rawSpl);
  return params;
}

export function urlParamsToState(search: string): Partial<SearchParamsState> {
  const params = new URLSearchParams(search);
  const result: Partial<SearchParamsState> = {};

  const indexes = params.get(KEYS.indexes);
  if (indexes) result.indexes = indexes.split(",").filter(Boolean);

  const logLevels = params.get(KEYS.logLevels);
  if (logLevels) result.logLevels = logLevels.split(",").filter(Boolean) as SearchParamsState["logLevels"];

  const levelField = params.get(KEYS.levelField);
  if (levelField) result.levelField = levelField;

  const keyword = params.get(KEYS.keyword);
  if (keyword) result.keyword = keyword;

  const timePreset = params.get(KEYS.timePreset);
  if (timePreset) result.timePreset = timePreset;

  const earliest = params.get(KEYS.earliest);
  if (earliest) result.earliest = earliest;

  const latest = params.get(KEYS.latest);
  if (latest) result.latest = latest;

  const rawSpl = params.get(KEYS.rawSpl);
  if (rawSpl) result.rawSpl = rawSpl;

  return result;
}

export function updateUrl(state: SearchParamsState): void {
  const params = stateToUrlParams(state);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", newUrl);
}
