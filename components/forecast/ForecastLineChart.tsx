"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastPoint } from "./types";
import { forecastTooltipStyle } from "./types";

interface ForecastLineChartProps {
  data: ForecastPoint[];
}

export function ForecastLineChart({ data }: ForecastLineChartProps) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
          <XAxis dataKey="period" stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
          <Tooltip contentStyle={forecastTooltipStyle} />
          <Line
            type="monotone"
            dataKey="forecast_register"
            name="Forecast Register"
            stroke="#06b6d4"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="forecast_execution"
            name="Forecast Execution"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
