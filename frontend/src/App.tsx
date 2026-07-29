import { useEffect, useMemo, useRef, useState } from "react";
import IndexSelector from "./components/IndexSelector";
import LogLevelFilter from "./components/LogLevelFilter";
import KeywordSearch from "./components/KeywordSearch";
import TimeRangePicker from "./components/TimeRangePicker";
import SplQueryPreview from "./components/SplQueryPreview";
import ResultsTable from "./components/ResultsTable";
import GroupedView from "./components/GroupedView";
import TrendChart from "./components/TrendChart";
import QuickFilters, { ActiveQuickFilters, QuickFilterField } from "./components/QuickFilters";
import SavedSearches from "./components/SavedSearches";
import {
  cancelSearch,
  createSavedSearch,
  deleteSavedSearch,
  getConfig,
  getSearchResults,
  getSearchStatus,
  listSavedSearches,
  startSearch,
} from "./api";
import { AppConfig, JobStatus, LogEvent, LogLevel, SavedSearch, SearchParamsState } from "./types";
import { exportCSV, exportJSON } from "./utils/export";
import { DEFAULT_TIME_PRESET_KEY, presetByKey, toEpochSeconds } from "./utils/timePresets";
import { updateUrl, urlParamsToState } from "./utils/urlState";

const AUTO_REFRESH_MS = 30_000;
const POLL_MS = 1000;
const MAX_EVENTS = 1000;

const EMPTY_QUICK_FILTERS: ActiveQuickFilters = { host: [], sourcetype: [], source: [] };

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);

  const [indexes, setIndexes] = useState<string[]>([]);
  const [logLevels, setLogLevels] = useState<LogLevel[]>(["ERROR", "WARN"]);
  const [levelField, setLevelField] = useState("");
  const [keyword, setKeyword] = useState("");
  const [timePresetKey, setTimePresetKey] = useState(DEFAULT_TIME_PRESET_KEY);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [useCustomSpl, setUseCustomSpl] = useState(false);
  const [customSpl, setCustomSpl] = useState("");
  const [generatedSpl, setGeneratedSpl] = useState("");

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"table" | "grouped">("table");
  const [quickFilters, setQuickFilters] = useState<ActiveQuickFilters>(EMPTY_QUICK_FILTERS);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  const cancelledRef = useRef(false);
  const currentJobRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  // Load config + saved searches + deep-linked state on first mount.
  useEffect(() => {
    (async () => {
      try {
        const cfg = await getConfig();
        setConfig(cfg);

        const urlState = urlParamsToState(window.location.search);
        setIndexes(urlState.indexes && urlState.indexes.length ? urlState.indexes : cfg.default_indexes);
        setLogLevels((urlState.logLevels as LogLevel[]) || cfg.default_log_levels);
        setLevelField(urlState.levelField || cfg.level_field);
        setKeyword(urlState.keyword || "");
        setTimePresetKey(urlState.timePreset || DEFAULT_TIME_PRESET_KEY);
        if (urlState.earliest) setCustomStart(urlState.earliest);
        if (urlState.latest) setCustomEnd(urlState.latest);
        if (urlState.rawSpl) {
          setUseCustomSpl(true);
          setCustomSpl(urlState.rawSpl);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load configuration.");
      } finally {
        initializedRef.current = true;
      }
    })();

    listSavedSearches()
      .then(setSavedSearches)
      .catch(() => undefined);
  }, []);

  // Keep the URL in sync so the current search is shareable.
  useEffect(() => {
    if (!initializedRef.current) return;
    const state: SearchParamsState = {
      indexes,
      logLevels,
      levelField,
      keyword,
      timePreset: timePresetKey,
      earliest: customStart,
      latest: customEnd,
      rawSpl: useCustomSpl ? customSpl : null,
    };
    updateUrl(state);
  }, [indexes, logLevels, levelField, keyword, timePresetKey, customStart, customEnd, useCustomSpl, customSpl]);

  function resolveTimeRange(): { earliest: string; latest: string } {
    if (timePresetKey === "custom") {
      return {
        earliest: customStart ? toEpochSeconds(customStart) : "-1h",
        latest: customEnd ? toEpochSeconds(customEnd) : "now",
      };
    }
    const preset = presetByKey(timePresetKey);
    return { earliest: preset?.earliest || "-1h", latest: preset?.latest || "now" };
  }

  async function runSearch() {
    if (indexes.length === 0) {
      setError("At least one index is required before searching.");
      return;
    }
    setError(null);
    setLoading(true);
    setEvents([]);
    setJobStatus(null);
    setQuickFilters(EMPTY_QUICK_FILTERS);
    cancelledRef.current = false;

    const { earliest, latest } = resolveTimeRange();

    try {
      const job = await startSearch({
        indexes,
        log_levels: logLevels,
        level_field: levelField || undefined,
        keyword: keyword || undefined,
        earliest,
        latest,
        raw_spl: useCustomSpl ? customSpl : undefined,
      });
      setJobId(job.job_id);
      currentJobRef.current = job.job_id;
      setGeneratedSpl(job.spl);

      await pollUntilDone(job.job_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
      setLoading(false);
    }
  }

  async function pollUntilDone(id: string) {
    while (!cancelledRef.current && currentJobRef.current === id) {
      let status: JobStatus;
      try {
        status = await getSearchStatus(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch search status.");
        setLoading(false);
        return;
      }
      if (cancelledRef.current || currentJobRef.current !== id) return;
      setJobStatus(status);

      if (status.is_failed) {
        const msg = status.messages?.map((m) => m.text).filter(Boolean).join("; ");
        setError(msg || "Search failed in Splunk.");
        setLoading(false);
        return;
      }

      if (status.is_done) {
        try {
          const results = await getSearchResults(id, 0, MAX_EVENTS);
          if (cancelledRef.current || currentJobRef.current !== id) return;
          setEvents(results.events);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to fetch search results.");
        }
        setLoading(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  }

  async function handleCancel() {
    cancelledRef.current = true;
    if (jobId) {
      try {
        await cancelSearch(jobId);
      } catch {
        // best-effort cancel
      }
    }
    setLoading(false);
  }

  // Auto-refresh: re-run the search on an interval while enabled.
  const runSearchRef = useRef(runSearch);
  runSearchRef.current = runSearch;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (!loadingRef.current) runSearchRef.current();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  function toggleQuickFilter(field: QuickFilterField, value: string) {
    setQuickFilters((prev) => {
      const current = prev[field];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [field]: next };
    });
  }

  const displayedEvents = useMemo(() => {
    return events.filter((e) => {
      for (const field of ["host", "sourcetype", "source"] as QuickFilterField[]) {
        const active = quickFilters[field];
        if (active.length > 0 && !active.includes(e[field] || "")) return false;
      }
      return true;
    });
  }, [events, quickFilters]);

  async function handleSaveSearch(name: string) {
    const { earliest, latest } = resolveTimeRange();
    const saved = await createSavedSearch({
      name,
      indexes,
      log_levels: logLevels,
      level_field: levelField || null,
      keyword: keyword || null,
      time_preset: timePresetKey,
      earliest,
      latest,
      raw_spl: useCustomSpl ? customSpl : null,
    });
    setSavedSearches((prev) => [...prev, saved]);
  }

  function handleLoadSearch(search: SavedSearch) {
    setIndexes(search.indexes);
    setLogLevels(search.log_levels as LogLevel[]);
    setLevelField(search.level_field || "");
    setKeyword(search.keyword || "");
    setTimePresetKey(search.time_preset || "custom");
    if (search.time_preset === "custom" || !search.time_preset) {
      setCustomStart(search.earliest);
      setCustomEnd(search.latest);
    }
    if (search.raw_spl) {
      setUseCustomSpl(true);
      setCustomSpl(search.raw_spl);
    } else {
      setUseCustomSpl(false);
    }
  }

  async function handleDeleteSearch(id: string) {
    await deleteSavedSearch(id);
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <>
      <header className="app-header">
        <h1>Splunk Log Viewer &amp; Troubleshooting Tool</h1>
        {config && <span className="splunk-host">{config.splunk_host}</span>}
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="panel">
        <div className="search-bar">
          <IndexSelector value={indexes} onChange={setIndexes} suggestions={config?.default_indexes || []} />
          <LogLevelFilter value={logLevels} onChange={setLogLevels} />
          <KeywordSearch value={keyword} onChange={setKeyword} />
          <TimeRangePicker
            presetKey={timePresetKey}
            customStart={customStart}
            customEnd={customEnd}
            onPresetChange={setTimePresetKey}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
          <div className="field-group">
            <label htmlFor="level-field">Level field name</label>
            <input
              id="level-field"
              type="text"
              value={levelField}
              placeholder={config?.level_field || "log_level"}
              onChange={(e) => setLevelField(e.target.value)}
              style={{ width: 120 }}
            />
          </div>
          <div className="field-group">
            <label>&nbsp;</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="primary" onClick={runSearch} disabled={loading}>
                {loading ? "Searching..." : "Run search"}
              </button>
              <button onClick={handleCancel} disabled={!loading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <SplQueryPreview
        generatedSpl={generatedSpl}
        useCustomSpl={useCustomSpl}
        customSpl={customSpl}
        onToggleCustom={setUseCustomSpl}
        onCustomSplChange={setCustomSpl}
      />

      {jobStatus && (
        <p className="status-line">
          {jobStatus.is_done ? "Done" : `Running (${Math.round(jobStatus.done_progress * 100)}%)`} · scanned{" "}
          {jobStatus.scan_count} · matched {jobStatus.event_count}
        </p>
      )}

      <div className="panel">
        <h3>Error / warning trend</h3>
        <TrendChart events={displayedEvents} />
      </div>

      <QuickFilters events={events} active={quickFilters} onToggle={toggleQuickFilter} />

      <div className="panel">
        <div className="toolbar">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className={viewMode === "table" ? "primary" : ""}
              onClick={() => setViewMode("table")}
            >
              Table view
            </button>
            <button
              className={viewMode === "grouped" ? "primary" : ""}
              onClick={() => setViewMode("grouped")}
            >
              Grouped view
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-dim)" }}>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Auto-refresh (30s)
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => exportCSV(displayedEvents)} disabled={displayedEvents.length === 0}>
              Export CSV
            </button>
            <button onClick={() => exportJSON(displayedEvents)} disabled={displayedEvents.length === 0}>
              Export JSON
            </button>
          </div>
        </div>

        {viewMode === "table" ? (
          <ResultsTable events={displayedEvents} keyword={keyword} />
        ) : (
          <GroupedView events={displayedEvents} keyword={keyword} />
        )}
      </div>

      <SavedSearches
        savedSearches={savedSearches}
        onSave={handleSaveSearch}
        onLoad={handleLoadSearch}
        onDelete={handleDeleteSearch}
      />
    </>
  );
}
