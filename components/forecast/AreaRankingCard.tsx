import type { AreaForecast } from "./types";
import { formatForecastNumber } from "./types";

interface AreaRankingCardProps {
  areas: AreaForecast[];
  isDarkMode?: boolean;
}

export function AreaRankingCard({ areas, isDarkMode = true }: AreaRankingCardProps) {
  const maxAreaForecast = Math.max(...areas.map((item) => item.forecast_total), 1);
  const rowClass = isDarkMode ? "border-white/10 bg-slate-950/35" : "border-slate-200 bg-slate-50/80";
  const headingClass = isDarkMode ? "text-white" : "text-slate-950";
  const mutedClass = isDarkMode ? "text-slate-400" : "text-slate-500";
  const trackClass = isDarkMode ? "bg-slate-800" : "bg-slate-200";

  return (
    <div className="grid gap-3">
      {areas.map((item, index) => (
        <div key={item.area} className={`rounded-2xl border p-4 ${rowClass}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-bold text-cyan-200">
                {index + 1}
              </span>
              <div>
                <p className={`font-bold ${headingClass}`}>{item.area}</p>
                <p className={`text-xs ${mutedClass}`}>Area Name</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-xl font-bold ${headingClass}`}>{formatForecastNumber(item.forecast_total)}</p>
              <p className={`text-xs ${mutedClass}`}>Forecast WO</p>
            </div>
          </div>
          <div className={`mt-4 h-2 overflow-hidden rounded-full ${trackClass}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
              style={{
                width: `${Math.max((item.forecast_total / maxAreaForecast) * 100, item.forecast_total ? 4 : 0)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
