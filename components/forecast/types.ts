export interface ForecastPoint {
  period: string;
  forecast_register: number;
  forecast_execution: number;
  forecast_elimination_rate: number;
  baseline_elimination_rate?: number;
  status?: string;
  backlog_pressure?: string | number;
}

export interface AreaForecast {
  area: string;
  forecast_total: number;
}

export interface WorkTypeForecast {
  work_type: string;
  forecast_total: number;
}

export interface DataHealth {
  total_wo: number;
  valid_registration_date: number;
  valid_scheduled_start: number;
  execution_data_quality_percent: number;
}

export type StatusTone = "success" | "warning" | "neutral" | "danger";

export const TARGET_ELIMINATION_RATE = 90;

export const FORECAST_DONUT_COLORS = ["#06b6d4", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"] as const;

export function formatForecastNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
}

export function formatForecastPercent(value: number): string {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value)}%`;
}

export function getForecastRateTone(value: number): StatusTone {
  if (value < TARGET_ELIMINATION_RATE) return "danger";
  if (value > 100) return "success";
  return "neutral";
}

export function getToneClass(tone: StatusTone): string {
  const classes: Record<StatusTone, string> = {
    success: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
    warning: "border-amber-300/20 bg-amber-400/10 text-amber-200",
    neutral: "border-cyan-300/20 bg-cyan-400/10 text-cyan-200",
    danger: "border-red-300/20 bg-red-400/10 text-red-200",
  };

  return classes[tone];
}

export const forecastTooltipStyle = {
  background: "rgba(15,23,42,0.96)",
  border: "1px solid rgba(6,182,212,0.22)",
  borderRadius: 14,
  color: "#e2e8f0",
};
