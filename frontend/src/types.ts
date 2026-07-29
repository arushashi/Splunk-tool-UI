export type LogLevel = "ERROR" | "WARN" | "INFO";

export interface LogEvent {
  time: string | null;
  level: string | null;
  sourcetype: string | null;
  source: string | null;
  host: string | null;
  raw: string;
  fields: Record<string, unknown>;
}

export interface SearchJobResponse {
  job_id: string;
  spl: string;
}

export interface JobStatus {
  job_id: string;
  is_done: boolean;
  is_failed: boolean;
  done_progress: number;
  event_count: number;
  scan_count: number;
  messages: Array<{ type?: string; text?: string }>;
}

export interface SearchResultsResponse {
  events: LogEvent[];
  offset: number;
  count: number;
}

export interface AppConfig {
  default_indexes: string[];
  level_field: string;
  splunk_host: string;
  available_log_levels: LogLevel[];
  default_log_levels: LogLevel[];
}

export interface SavedSearch {
  id?: string;
  name: string;
  indexes: string[];
  log_levels: string[];
  level_field?: string | null;
  keyword?: string | null;
  time_preset?: string | null;
  earliest: string;
  latest: string;
  raw_spl?: string | null;
  created_at?: string | null;
}

export interface SearchParamsState {
  indexes: string[];
  logLevels: LogLevel[];
  levelField: string;
  keyword: string;
  timePreset: string;
  earliest: string;
  latest: string;
  rawSpl: string | null;
}
