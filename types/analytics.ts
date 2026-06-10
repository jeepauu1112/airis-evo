export interface AiSummary {
  executive_summary: string[];
  key_risks: string[];
  recommendations: string[];
  priority_focus: string[];
  risk_level: string;
}

export interface AnalyticsMetrics {
  total_wo: number;
  backlog_wo: number;
  close_wo: number;
  corrective: number;
  preventive: number;
  backlog_percentage: number;
  close_percentage: number;
  by_status: Record<string, number>;
  by_area: Record<string, number>;
  by_pic: Record<string, number>;
  by_aging: Record<string, number>;
  wo_details?: WorkOrderDetail[];
}

export interface WorkOrderDetail {
  wonum?: string | number;
  wo_number?: string | number;
  description?: string;
  status?: string;
  area?: string;
  pic?: string;
  aging?: string;
  scheduled_finish?: string;
  [key: string]: unknown;
}

export interface AnalyticsEndpointResponse {
  success: boolean;
  analytics: AnalyticsMetrics;
  ai_summary?: AiSummary | null;
}

export interface AnalyticsResponse extends AnalyticsMetrics {
  success: boolean;
  ai_summary?: AiSummary | null;
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
