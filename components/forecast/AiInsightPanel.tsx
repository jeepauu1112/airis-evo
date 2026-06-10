import { AlertTriangle, AreaChart, CheckCircle2, Gauge, TrendingUp } from "lucide-react";
import type { AreaForecast, StatusTone } from "./types";
import {
  formatForecastNumber,
  formatForecastPercent,
  getToneClass,
  TARGET_ELIMINATION_RATE,
} from "./types";

interface AiInsightPanelProps {
  weeklyRegisterGrowth: number;
  topArea?: AreaForecast;
  latestEliminationRate: number;
  insightTone: StatusTone;
  isDarkMode?: boolean;
}

export function AiInsightPanel({
  weeklyRegisterGrowth,
  topArea,
  latestEliminationRate,
  insightTone,
  isDarkMode = true,
}: AiInsightPanelProps) {
  const rowClass = isDarkMode ? "border-white/10 bg-slate-950/35" : "border-slate-200 bg-slate-50/80";
  const textClass = isDarkMode ? "text-slate-200" : "text-slate-700";

  return (
    <div className="grid gap-3">
      <div className={`flex gap-3 rounded-2xl border p-4 ${rowClass}`}>
        <TrendingUp className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-300" />
        <p className={`text-sm leading-relaxed ${textClass}`}>
          Forecast menunjukkan WO Register {weeklyRegisterGrowth >= 0 ? "meningkat" : "menurun"}{" "}
          {formatForecastPercent(Math.abs(weeklyRegisterGrowth))} minggu depan.
        </p>
      </div>
      <div className={`flex gap-3 rounded-2xl border p-4 ${rowClass}`}>
        <AreaChart className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-300" />
        <p className={`text-sm leading-relaxed ${textClass}`}>
          Area {topArea?.area ?? "-"} diprediksi memiliki WO tertinggi dengan{" "}
          {formatForecastNumber(topArea?.forecast_total ?? 0)} forecast WO.
        </p>
      </div>
      <div className={`flex gap-3 rounded-2xl border p-4 ${getToneClass(insightTone)}`}>
        {latestEliminationRate < TARGET_ELIMINATION_RATE ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
        ) : latestEliminationRate > 100 ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
        ) : (
          <Gauge className="mt-0.5 h-5 w-5 flex-shrink-0" />
        )}
        <p className="text-sm font-semibold leading-relaxed">
          {latestEliminationRate < TARGET_ELIMINATION_RATE
            ? `Warning: Elimination Rate forecast ${formatForecastPercent(latestEliminationRate)} berada di bawah target 90%.`
            : latestEliminationRate > 100
              ? `Success: Elimination Rate forecast ${formatForecastPercent(latestEliminationRate)} berada di atas 100%.`
              : `Elimination Rate diperkirakan tetap di atas target 90% pada ${formatForecastPercent(latestEliminationRate)}.`}
        </p>
      </div>
    </div>
  );
}
