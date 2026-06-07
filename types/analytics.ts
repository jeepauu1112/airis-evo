export interface AnalyticsResponse {
  success: boolean;
  total_wo: number;
  backlog_wo: number;
  corrective: number;
  preventive: number;
  close_wo?: number;
  close_percentage?: number;
  by_status: Record<string, number>;
  by_area: Record<string, number>;
  by_pic?: Record<string, number>;
  by_aging?: Record<string, number>;
}

export interface AnalyticsChartDatum {
  name: string;
  value: number;
}

export interface UseAnalyticsResult {
  data: AnalyticsResponse | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}
