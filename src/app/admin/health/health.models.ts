export interface HealthSummaryDto {
  healthy: boolean;
  checks: HealthChecksDto;
  timestamp: string;
}

export interface HealthChecksDto {
  database: boolean;
}

export interface HealthChartPointDto {
  date: string;
  healthy: number;
  unhealthy: number;
}

