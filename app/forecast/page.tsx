"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Gauge,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { AiInsightPanel } from "@/components/forecast/AiInsightPanel";
import { AreaRankingCard } from "@/components/forecast/AreaRankingCard";
import { DataHealthCard } from "@/components/forecast/DataHealthCard";
import { EliminationRateChart } from "@/components/forecast/EliminationRateChart";
import { ForecastKpiCard } from "@/components/forecast/ForecastKpiCard";
import { ForecastLineChart } from "@/components/forecast/ForecastLineChart";
import { WorkTypeDonutChart } from "@/components/forecast/WorkTypeDonutChart";
import type { AreaForecast, DataHealth, ForecastPoint, WorkTypeForecast } from "@/components/forecast/types";
import {
  formatForecastNumber,
  formatForecastPercent,
  getForecastRateTone,
  TARGET_ELIMINATION_RATE,
} from "@/components/forecast/types";

const FORECAST_API_PROXY = "/api/forecast";
const AREA_ORDER = ["BOP", "Unit1", "Unit2", "CH"] as const;
const WORK_TYPE_ORDER = ["RTF", "CM", "PM", "CD", "EM"] as const;

interface ForecastState {
  weeklyForecast: ForecastPoint[];
  monthlyForecast: ForecastPoint[];
  areaForecast: AreaForecast[];
  workTypeForecast: WorkTypeForecast[];
  dataHealth: DataHealth | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace("%", "").replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function asString(value: unknown, fallback = "-"): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);

  return fallback;
}

function getArray(value: unknown, keys: string[]): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];

  for (const key of keys) {
    const item = value[key];

    if (Array.isArray(item)) return item;
    if (isRecord(item)) {
      const nested = getArray(item, keys);
      if (nested.length) return nested;
    }
  }

  return [];
}

function normalizeForecastPoint(value: unknown, index: number): ForecastPoint {
  const row = isRecord(value) ? value : {};

  return {
    period: asString(row.period ?? row.week ?? row.month ?? row.date ?? row.ds, `P${index + 1}`),
    forecast_register: asNumber(row.forecast_register ?? row.register ?? row.forecast_reg ?? row.yhat_register),
    forecast_execution: asNumber(row.forecast_execution ?? row.execution ?? row.forecast_exec ?? row.yhat_execution),
    forecast_elimination_rate: asNumber(row.forecast_elimination_rate ?? row.elimination_rate ?? row.forecast_rate ?? row.rate),
    baseline_elimination_rate: asNumber(row.baseline_elimination_rate ?? row.baseline_er ?? row.baseline_rate),
    status: asString(row.status, "-"),
    backlog_pressure: row.backlog_pressure !== undefined && row.backlog_pressure !== null
      ? asString(row.backlog_pressure)
      : "-",
  };
}

function normalizeAreaForecast(value: unknown): AreaForecast {
  const row = isRecord(value) ? value : {};

  return {
    area: asString(row.area ?? row.area_name ?? row.name ?? row.label),
    forecast_total: asNumber(row.forecast_total ?? row.total ?? row.forecast_wo ?? row.value),
  };
}

function normalizeWorkTypeForecast(value: unknown): WorkTypeForecast {
  const row = isRecord(value) ? value : {};

  return {
    work_type: asString(row.work_type ?? row.worktype ?? row.type ?? row.name ?? row.label),
    forecast_total: asNumber(row.forecast_total ?? row.total ?? row.forecast_wo ?? row.value),
  };
}

function normalizeDataHealth(value: unknown): DataHealth {
  const row = isRecord(value) && isRecord(value.data_health) ? value.data_health : value;
  const record = isRecord(row) ? row : {};

  return {
    total_wo: asNumber(record.total_wo ?? record.total ?? record.total_work_order),
    valid_registration_date: asNumber(record.valid_registration_date ?? record.valid_registration ?? record.registration_valid),
    valid_scheduled_start: asNumber(record.valid_scheduled_start ?? record.valid_schedule_start ?? record.scheduled_start_valid),
    execution_data_quality_percent: asNumber(
      record.execution_data_quality_percent ??
        record.execution_data_quality ??
        record.data_quality_percent ??
        record.quality_percent
    ),
  };
}

function SectionCard({
  title,
  subtitle,
  children,
  isDarkMode,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isDarkMode: boolean;
}) {
  const cardClass = isDarkMode
    ? "border-white/10 bg-white/[0.06] shadow-black/20"
    : "border-slate-200/80 bg-white/76 shadow-slate-200/60";
  const titleClass = isDarkMode ? "text-white" : "text-slate-950";
  const subtitleClass = isDarkMode ? "text-slate-400" : "text-slate-500";

  return (
    <section className={`rounded-2xl border p-5 shadow-2xl backdrop-blur-xl ${cardClass}`}>
      <div className="mb-5">
        <h2 className={`text-lg font-bold ${titleClass}`}>{title}</h2>
        {subtitle ? <p className={`mt-1 text-sm ${subtitleClass}`}>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function LoadingSkeleton({ isDarkMode }: { isDarkMode: boolean }) {
  const skeletonClass = isDarkMode ? "border-white/10 bg-white/[0.06]" : "border-slate-200 bg-white/70";

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={`h-36 animate-pulse rounded-2xl border ${skeletonClass}`} />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={`h-80 animate-pulse rounded-2xl border ${skeletonClass}`} />
      ))}
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="rounded-2xl border border-red-300/20 bg-red-500/10 p-5 text-red-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Gagal memuat data AIRIS ML Engine</p>
            <p className="mt-1 text-sm text-red-100/75">{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200/20 bg-red-100/10 px-4 text-sm font-semibold transition hover:bg-red-100/15"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    </section>
  );
}

function MonthlyForecastTable({ data, isDarkMode }: { data: ForecastPoint[]; isDarkMode: boolean }) {
  const borderClass = isDarkMode ? "border-white/10" : "border-slate-200";
  const headerClass = isDarkMode ? "bg-slate-950/35 text-slate-300" : "bg-slate-100 text-slate-600";
  const rowClass = isDarkMode ? "hover:bg-white/[0.04]" : "hover:bg-slate-50";
  const textClass = isDarkMode ? "text-slate-200" : "text-slate-700";
  const strongClass = isDarkMode ? "text-white" : "text-slate-950";

  return (
    <div className={`overflow-hidden rounded-2xl border ${borderClass}`}>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className={headerClass}>
            <tr>
              <th className="px-4 py-3 font-semibold">Period</th>
              <th className="px-4 py-3 text-right font-semibold">Forecast Register</th>
              <th className="px-4 py-3 text-right font-semibold">Forecast Execution</th>
              <th className="px-4 py-3 text-right font-semibold">Forecast ER</th>
              <th className="px-4 py-3 font-semibold">Backlog Pressure</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.period} className={`border-t ${borderClass} ${rowClass}`}>
                <td className={`px-4 py-3 font-semibold ${strongClass}`}>{item.period}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${textClass}`}>{formatForecastNumber(item.forecast_register)}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${textClass}`}>{formatForecastNumber(item.forecast_execution)}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${textClass}`}>{formatForecastPercent(item.forecast_elimination_rate)}</td>
                <td className={`px-4 py-3 ${textClass}`}>{item.backlog_pressure ?? "-"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                    {item.status ?? "-"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ForecastPageProps {
  embedded?: boolean;
  isDarkMode?: boolean;
}

export default function ForecastPage({ embedded = false, isDarkMode = true }: ForecastPageProps) {
  const [forecastState, setForecastState] = useState<ForecastState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchForecastData = async () => {
    setLoading(true);
    setError("");

    try {
      const [woResponse, areaResponse, workTypeResponse, healthResponse] = await Promise.all([
        fetch(`${FORECAST_API_PROXY}?resource=forecast-wo`, { cache: "no-store" }),
        fetch(`${FORECAST_API_PROXY}?resource=forecast-area`, { cache: "no-store" }),
        fetch(`${FORECAST_API_PROXY}?resource=forecast-worktype`, { cache: "no-store" }),
        fetch(`${FORECAST_API_PROXY}?resource=data-health`, { cache: "no-store" }),
      ]);
      const failedResponse = [woResponse, areaResponse, workTypeResponse, healthResponse].find((response) => !response.ok);

      if (failedResponse) {
        throw new Error(`AIRIS ML Engine returned HTTP ${failedResponse.status}`);
      }

      const [woPayload, areaPayload, workTypePayload, healthPayload] = await Promise.all([
        woResponse.json(),
        areaResponse.json(),
        workTypeResponse.json(),
        healthResponse.json(),
      ]);
      const weeklyForecast = getArray(woPayload, ["weekly_forecast", "weekly", "forecast"]).map(normalizeForecastPoint);
      const monthlyForecast = getArray(woPayload, ["monthly_forecast", "monthly"]).map(normalizeForecastPoint);
      const areaForecast = getArray(areaPayload, ["area_forecast", "forecast_area", "areas", "data"])
        .map(normalizeAreaForecast)
        .filter((item) => item.area !== "-");
      const workTypeForecast = getArray(workTypePayload, ["worktype_forecast", "work_type_forecast", "forecast_worktype", "data"])
        .map(normalizeWorkTypeForecast)
        .filter((item) => item.work_type !== "-");

      setForecastState({
        weeklyForecast,
        monthlyForecast,
        areaForecast,
        workTypeForecast,
        dataHealth: normalizeDataHealth(healthPayload),
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unknown forecast fetch error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchForecastData();
  }, []);

  const latestWeekly = forecastState?.weeklyForecast.at(-1);
  const previousWeekly = forecastState?.weeklyForecast.at(-2);
  const latestMonthly = forecastState?.monthlyForecast.at(-1);
  const rankedAreas = useMemo(() => {
    const areaMap = new Map((forecastState?.areaForecast ?? []).map((item) => [item.area.toLowerCase(), item]));

    return AREA_ORDER.map((area) => {
      const found = areaMap.get(area.toLowerCase());
      return found ?? { area, forecast_total: 0 };
    }).sort((a, b) => b.forecast_total - a.forecast_total);
  }, [forecastState?.areaForecast]);
  const workTypeData = useMemo(() => {
    const workTypeMap = new Map((forecastState?.workTypeForecast ?? []).map((item) => [item.work_type.toLowerCase(), item]));

    return WORK_TYPE_ORDER.map((workType) => {
      const found = workTypeMap.get(workType.toLowerCase());
      return found ?? { work_type: workType, forecast_total: 0 };
    });
  }, [forecastState?.workTypeForecast]);
  const weeklyRegisterGrowth =
    latestWeekly && previousWeekly && previousWeekly.forecast_register
      ? ((latestWeekly.forecast_register - previousWeekly.forecast_register) / previousWeekly.forecast_register) * 100
      : 0;
  const latestRate = latestWeekly?.forecast_elimination_rate ?? 0;
  const latestMonthlyRate = latestMonthly?.forecast_elimination_rate ?? 0;
  const topArea = rankedAreas[0];
  const health = forecastState?.dataHealth;
  const insightTone = getForecastRateTone(latestRate);

  const rootClass = embedded
    ? `min-h-full ${isDarkMode ? "text-slate-100" : "text-slate-950"}`
    : `min-h-screen ${isDarkMode ? "bg-[#07111f] text-slate-100" : "bg-slate-50 text-slate-950"}`;
  const backgroundClass = isDarkMode
    ? "bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.20),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_28%),linear-gradient(135deg,#0f1d32_0%,#07111f_48%,#020617_100%)]"
    : "bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_28%),linear-gradient(135deg,rgba(248,250,252,0.95)_0%,rgba(241,245,249,0.9)_52%,rgba(226,232,240,0.88)_100%)]";
  const headerClass = isDarkMode
    ? "border-white/10 bg-white/[0.06] shadow-black/20"
    : "border-slate-200/80 bg-white/76 shadow-slate-200/60";
  const headingClass = isDarkMode ? "text-white" : "text-slate-950";
  const mutedClass = isDarkMode ? "text-slate-400" : "text-slate-500";

  return (
    <main className={rootClass}>
      {!embedded && <div className={`pointer-events-none fixed inset-0 ${backgroundClass}`} />}
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <header className={`flex flex-col gap-5 rounded-2xl border p-6 shadow-2xl backdrop-blur-xl md:flex-row md:items-center md:justify-between ${headerClass}`}>
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              <BrainCircuit size={14} />
              AIRIS ML Engine
            </div>
            <h1 className={`text-3xl font-bold tracking-tight md:text-4xl ${headingClass}`}>
              AIRIS-EVO Predictive Maintenance Dashboard
            </h1>
            <p className={`mt-3 max-w-2xl text-sm leading-relaxed md:text-base ${mutedClass}`}>
              Machine Learning Forecast for Work Order Planning
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchForecastData()}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        {loading ? <LoadingSkeleton isDarkMode={isDarkMode} /> : null}
        {!loading && error ? <ErrorPanel message={error} onRetry={() => void fetchForecastData()} /> : null}

        {!loading && !error && forecastState ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ForecastKpiCard
                title="Latest Weekly Elimination Rate"
                value={formatForecastPercent(latestRate)}
                badge={latestRate >= TARGET_ELIMINATION_RATE ? "On target" : "Below target"}
                tone={getForecastRateTone(latestRate)}
                icon={<Gauge size={21} />}
                isDarkMode={isDarkMode}
              />
              <ForecastKpiCard
                title="Latest Monthly Elimination Rate"
                value={formatForecastPercent(latestMonthlyRate)}
                badge={latestMonthlyRate >= TARGET_ELIMINATION_RATE ? "Stable" : "Attention"}
                tone={getForecastRateTone(latestMonthlyRate)}
                icon={<Activity size={21} />}
                isDarkMode={isDarkMode}
              />
              <ForecastKpiCard
                title="Forecast Next Week Register"
                value={formatForecastNumber(latestWeekly?.forecast_register ?? 0)}
                badge={weeklyRegisterGrowth >= 0 ? `+${formatForecastPercent(weeklyRegisterGrowth)}` : formatForecastPercent(weeklyRegisterGrowth)}
                tone={weeklyRegisterGrowth > 10 ? "warning" : "neutral"}
                icon={<TrendingUp size={21} />}
                isDarkMode={isDarkMode}
              />
              <ForecastKpiCard
                title="Forecast Next Month Register"
                value={formatForecastNumber(latestMonthly?.forecast_register ?? 0)}
                badge="ML forecast"
                tone="neutral"
                icon={<Clock3 size={21} />}
                isDarkMode={isDarkMode}
              />
            </section>

            <SectionCard title="Weekly Forecast Trend" subtitle="Forecast register vs execution by period" isDarkMode={isDarkMode}>
              <ForecastLineChart data={forecastState.weeklyForecast} />
            </SectionCard>

            <SectionCard title="Baseline Elimination Rate" subtitle="Forecast elimination rate with 90% target line" isDarkMode={isDarkMode}>
              <EliminationRateChart data={forecastState.weeklyForecast} />
            </SectionCard>

            <SectionCard title="Monthly Forecast Trend" subtitle="Monthly forecast register vs execution by period" isDarkMode={isDarkMode}>
              <ForecastLineChart data={forecastState.monthlyForecast} />
            </SectionCard>

            <SectionCard title="Monthly Elimination Rate" subtitle="Monthly forecast elimination rate with 90% target line" isDarkMode={isDarkMode}>
              <EliminationRateChart data={forecastState.monthlyForecast} />
            </SectionCard>

            <SectionCard title="Monthly Forecast Table" subtitle="Monthly planning detail from AIRIS ML Engine" isDarkMode={isDarkMode}>
              <MonthlyForecastTable data={forecastState.monthlyForecast} isDarkMode={isDarkMode} />
            </SectionCard>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <SectionCard title="Area Forecast Ranking" subtitle="Top forecast WO by area" isDarkMode={isDarkMode}>
                <AreaRankingCard areas={rankedAreas} isDarkMode={isDarkMode} />
              </SectionCard>

              <SectionCard title="Work Type Forecast" subtitle="RTF, CM, PM, CD, and EM forecast mix" isDarkMode={isDarkMode}>
                <WorkTypeDonutChart data={workTypeData} isDarkMode={isDarkMode} />
              </SectionCard>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DataHealthCard title="Total WO" value={formatForecastNumber(health?.total_wo ?? 0)} badge="Data health" tone="neutral" icon={<DatabaseZap size={21} />} isDarkMode={isDarkMode} />
              <DataHealthCard title="Valid Registration Date" value={formatForecastNumber(health?.valid_registration_date ?? 0)} badge="Validated" tone="success" icon={<CheckCircle2 size={21} />} isDarkMode={isDarkMode} />
              <DataHealthCard title="Valid Scheduled Start" value={formatForecastNumber(health?.valid_scheduled_start ?? 0)} badge="Validated" tone="success" icon={<ShieldCheck size={21} />} isDarkMode={isDarkMode} />
              <DataHealthCard
                title="Execution Data Quality %"
                value={formatForecastPercent(health?.execution_data_quality_percent ?? 0)}
                badge={(health?.execution_data_quality_percent ?? 0) >= 90 ? "Healthy" : "Needs cleanup"}
                tone={(health?.execution_data_quality_percent ?? 0) >= 90 ? "success" : "warning"}
                icon={<BarChart3 size={21} />}
                isDarkMode={isDarkMode}
              />
            </section>

            <SectionCard title="AI Insight Panel" subtitle="Auto-generated operating signals from forecast API" isDarkMode={isDarkMode}>
              <AiInsightPanel
                weeklyRegisterGrowth={weeklyRegisterGrowth}
                topArea={topArea}
                latestEliminationRate={latestRate}
                insightTone={insightTone}
                isDarkMode={isDarkMode}
              />
            </SectionCard>
          </>
        ) : null}
      </div>
    </main>
  );
}
