export type LogLevel = 'Information' | 'Warning' | 'Error' | 'Critical';

export interface MonitoringEvent {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  traceId: string | null;
  userId: string | null;
  exceptionType: string | null;
  properties: Record<string, string | null>;
}

export interface MonitoringFilters {
  search: string;
  level: LogLevel | '';
  category: string;
  traceId: string;
  from: string;
  to: string;
}

export interface MonitoringLogs {
  items: MonitoringEvent[];
  totalCount: number;
  page: number;
  pageSize: number;
  retainedCount: number;
  recentEventLimit: number;
  oldestAvailableAt: string | null;
}

export interface MonitoringSummary {
  timestamp: string;
  startedAt: string;
  uptimeSeconds: number;
  windowMinutes: number;
  requests: number;
  serverErrors: number;
  clientErrors: number;
  errorRatePercent: number;
  averageMs: number;
  p95UpperBoundMs: number | null;
  workingSetMb: number;
  health: {
    status: string;
    checkedAt: string | null;
    checks: { name: string; status: string; durationMs: number }[];
  };
  series: {
    timestamp: string;
    requests: number;
    errors: number;
    clientErrors: number;
    averageMs: number;
  }[];
  jobs: {
    name: string;
    status: string;
    lastRun: string;
    lastSuccess: string | null;
    staleAfterSeconds: number;
  }[];
  logging: {
    droppedEvents: number;
    persistenceError: string | null;
    recentEventLimit: number;
    retentionDays: number;
  };
}
