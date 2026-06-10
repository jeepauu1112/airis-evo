"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { WorkTypeForecast } from "./types";
import { forecastTooltipStyle, FORECAST_DONUT_COLORS, formatForecastNumber } from "./types";

interface WorkTypeDonutChartProps {
  data: WorkTypeForecast[];
  isDarkMode?: boolean;
}

export function WorkTypeDonutChart({ data, isDarkMode = true }: WorkTypeDonutChartProps) {
  const rowClass = isDarkMode ? "bg-slate-950/35" : "bg-slate-50/80";
  const labelClass = isDarkMode ? "text-slate-200" : "text-slate-700";
  const valueClass = isDarkMode ? "text-white" : "text-slate-950";

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_0.9fr] xl:grid-cols-1">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="forecast_total" nameKey="work_type" innerRadius={70} outerRadius={104} paddingAngle={4}>
              {data.map((item, index) => (
                <Cell key={item.work_type} fill={FORECAST_DONUT_COLORS[index % FORECAST_DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={forecastTooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-2">
        {data.map((item, index) => (
          <div key={item.work_type} className={`flex items-center justify-between rounded-xl px-3 py-2 ${rowClass}`}>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: FORECAST_DONUT_COLORS[index % FORECAST_DONUT_COLORS.length] }}
              />
              <span className={`font-semibold ${labelClass}`}>{item.work_type}</span>
            </div>
            <span className={`font-bold ${valueClass}`}>{formatForecastNumber(item.forecast_total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
