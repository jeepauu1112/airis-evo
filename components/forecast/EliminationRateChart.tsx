"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastPoint } from "./types";
import { forecastTooltipStyle, TARGET_ELIMINATION_RATE } from "./types";

interface EliminationRateChartProps {
  data: ForecastPoint[];
}

export function EliminationRateChart({ data }: EliminationRateChartProps) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
          <XAxis dataKey="period" stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} domain={[0, "dataMax + 20"]} />
          <Tooltip contentStyle={forecastTooltipStyle} formatter={(value) => `${value}%`} />
          <ReferenceLine
            y={TARGET_ELIMINATION_RATE}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{ value: "Target 90%", fill: "#fbbf24", fontSize: 12, position: "insideTopRight" }}
          />
          <Bar
            dataKey="forecast_elimination_rate"
            name="Forecast Elimination Rate"
            radius={[8, 8, 0, 0]}
            fill="#06b6d4"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
