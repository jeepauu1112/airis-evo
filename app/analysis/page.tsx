"use client";

import { useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Download,
  Gauge,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  UserRoundCheck,
  Users,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalyticsSkeleton } from "@/components/analysis/AnalyticsSkeleton";
import { ChartCard } from "@/components/analysis/ChartCard";
import { SummaryCard } from "@/components/analysis/SummaryCard";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { AnalyticsChartDatum } from "@/types/analytics";

const AREA_COLORS = ["#06b6d4", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#94a3b8"];
const AGING_COLORS = ["#22c55e", "#eab308", "#ef4444", "#94a3b8"];

function toChartData(record: Record<string, number>): AnalyticsChartDatum[] {
  return Object.entries(record)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function formatTime(date: Date | null): string {
  if (!date) return "--:--:--";

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function getAgingStatus(category: string): "Normal" | "Warning" | "Critical" | "Unknown" {
  if (category === "1-7 Hari") return "Normal";
  if (category === "8-30 Hari") return "Warning";
  if (category === ">30 Hari") return "Critical";
  return "Unknown";
}

function EmptyState({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className={`flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed text-sm ${
      isDarkMode ? "border-white/10 bg-slate-950/20 text-slate-400" : "border-slate-300 bg-white/60 text-slate-500"
    }`}>
      Data belum tersedia
    </div>
  );
}

interface AnalysisPageProps {
  embedded?: boolean;
  isDarkMode?: boolean;
}

export default function AnalysisPage({ embedded = false, isDarkMode = true }: AnalysisPageProps) {
  const { data, loading, error, lastUpdated, refresh } = useAnalytics();
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const statusData = data ? toChartData(data.by_status) : [];
  const areaData = data ? toChartData(data.by_area) : [];
  const picData = data?.by_pic ? toChartData(data.by_pic) : [];
  const agingData = data?.by_aging ? toChartData(data.by_aging) : [];
  const backlogPercentage = data?.total_wo ? Math.round((data.backlog_wo / data.total_wo) * 100) : 0;
  const closePercentage = data?.close_percentage ?? 0;
  const agingCritical = data?.by_aging?.[">30 Hari"] ?? 0;
  const dominantPic = picData[0]?.name ?? "N/A";
  const totalAreaWo = areaData.reduce((total, item) => total + item.value, 0);
  const totalPicWo = picData.reduce((total, item) => total + item.value, 0);
  const totalAgingWo = agingData.reduce((total, item) => total + item.value, 0);
  const containerClass = embedded
    ? `h-full overflow-y-auto overflow-x-hidden ${isDarkMode ? "text-slate-100" : "text-slate-950"}`
    : `min-h-screen overflow-x-hidden ${isDarkMode ? "bg-[#07111f] text-slate-100" : "bg-slate-50 text-slate-950"}`;
  const backgroundLayerClass = embedded ? "absolute" : "fixed";
  const backgroundClass = isDarkMode
    ? "bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_32%),linear-gradient(135deg,#0f1d32_0%,#07111f_48%,#020617_100%)]"
    : "bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.12),transparent_34%),linear-gradient(135deg,rgba(248,250,252,0.94)_0%,rgba(241,245,249,0.9)_52%,rgba(226,232,240,0.88)_100%)]";
  const imageOpacity = isDarkMode ? "opacity-10" : "opacity-12";
  const panelClass = isDarkMode
    ? "border-white/10 bg-white/[0.06] shadow-black/20"
    : "border-slate-200/80 bg-white/72 shadow-slate-200/60";
  const mutedTextClass = isDarkMode ? "text-slate-400" : "text-slate-500";
  const headingTextClass = isDarkMode ? "text-white" : "text-slate-950";
  const tooltipStyle = {
    background: isDarkMode ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.96)",
    border: isDarkMode ? "1px solid rgba(6,182,212,0.25)" : "1px solid rgba(203,213,225,0.9)",
    borderRadius: 14,
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
  };
  const axisColor = isDarkMode ? "#94a3b8" : "#475569";
  const gridColor = isDarkMode ? "rgba(148,163,184,0.18)" : "rgba(100,116,139,0.18)";
  const axisLineColor = isDarkMode ? "rgba(148,163,184,0.28)" : "rgba(100,116,139,0.28)";
  const tableHeaderClass = isDarkMode ? "bg-slate-950/35 text-slate-300" : "bg-slate-100 text-slate-600";
  const tableBorderClass = isDarkMode ? "border-white/10" : "border-slate-200";

  const handleExportPdf = async () => {
    if (!exportRef.current || isExporting) return;

    setIsExporting(true);

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const reportDate = new Date().toISOString().slice(0, 10);
      const fileName = `AIRIS-EVO-Analytics-Report-${reportDate}.pdf`;
      const target = exportRef.current;

      target.classList.add("pdf-export-mode");

      await new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(resolve);
        });
      });

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 6;
      let imgWidth = pageWidth - margin * 2;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pageHeight - margin * 2) {
        imgHeight = pageHeight - margin * 2;
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }

      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;
      const imageData = canvas.toDataURL("image/png");

      pdf.addImage(imageData, "PNG", x, y, imgWidth, imgHeight);
      pdf.save(fileName);
    } finally {
      exportRef.current?.classList.remove("pdf-export-mode");
      setIsExporting(false);
    }
  };

  return (
    <main className={`relative ${containerClass}`}>
      <div className={`${backgroundLayerClass} inset-0 ${backgroundClass}`} />
      <div
        className={`${backgroundLayerClass} inset-0 ${imageOpacity}`}
        style={{
          backgroundImage: "url(https://res.cloudinary.com/cdb-klb1/image/upload/v1780291636/DSC06031_ewwkyo.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div ref={exportRef} className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className={`card flex flex-col gap-4 rounded-2xl border p-5 shadow-2xl backdrop-blur-xl md:flex-row md:items-center md:justify-between ${panelClass}`}>
          <div>
            <div className="flex items-center gap-3 text-cyan-300">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/15 ring-1 ring-cyan-300/30">
                <BarChart3 size={24} />
              </div>
              <span className="text-sm font-semibold uppercase tracking-[0.24em]">AIRIS-EVO Analytics</span>
            </div>
            <h1 className={`mt-4 text-3xl font-bold tracking-tight md:text-4xl ${headingTextClass}`}>
              Maintenance Work Order Dashboard
            </h1>
            <p className={`mt-2 max-w-2xl text-sm leading-6 md:text-base ${mutedTextClass}`}>
              Enterprise overview untuk status WO, backlog, corrective work, dan distribusi area.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row md:items-center">
            <div className={`rounded-2xl border px-4 py-3 text-sm ${
              isDarkMode ? "border-white/10 bg-slate-950/40 text-slate-300" : "border-slate-200 bg-white/80 text-slate-700"
            }`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${mutedTextClass}`}>Last Updated</p>
              <p className="mt-1 font-semibold text-cyan-200">{formatTime(lastUpdated)}</p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              Refresh Data
            </button>
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={isExporting || loading || !data}
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-semibold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isDarkMode
                  ? "border-cyan-300/20 bg-white/[0.06] text-cyan-100 hover:bg-white/[0.1]"
                  : "border-slate-200 bg-white/80 text-slate-700 hover:bg-white"
              }`}
            >
              <Download size={18} className={isExporting ? "animate-pulse" : ""} />
              Export PDF
            </button>
          </div>
        </header>

        {error && (
          <section className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-red-100 shadow-2xl shadow-red-950/20 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-red-300" size={22} />
              <div>
                <h2 className="font-semibold">Gagal mengambil data analytics</h2>
                <p className="mt-1 text-sm text-red-200/80">
                  Periksa koneksi endpoint n8n lalu tekan Refresh Data.
                </p>
              </div>
            </div>
          </section>
        )}

        {loading && !data ? (
          <AnalyticsSkeleton />
        ) : data ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Total WO"
                value={data.total_wo}
                subtitle="Total work order dari endpoint analytics"
                icon={ClipboardList}
                accent="cyan"
                isDarkMode={isDarkMode}
              />
              <SummaryCard
                title="Backlog WO"
                value={data.backlog_wo}
                subtitle="WO yang masih masuk antrean/backlog"
                icon={TimerReset}
                accent="blue"
                isDarkMode={isDarkMode}
              />
              <SummaryCard
                title="Corrective"
                value={data.corrective}
                subtitle="Corrective maintenance work order"
                icon={Wrench}
                accent="emerald"
                isDarkMode={isDarkMode}
              />
              <SummaryCard
                title="Preventive"
                value={data.preventive}
                subtitle="Preventive maintenance work order"
                icon={ShieldCheck}
                accent="amber"
                isDarkMode={isDarkMode}
              />
              <SummaryCard
                title="Close WO"
                value={data.close_wo ?? 0}
                subtitle="Work order yang sudah close"
                icon={UserRoundCheck}
                accent="emerald"
                isDarkMode={isDarkMode}
              />
              <SummaryCard
                title="Close Percentage"
                value={`${closePercentage}%`}
                subtitle="Rasio WO close terhadap total"
                icon={Gauge}
                accent="blue"
                isDarkMode={isDarkMode}
              />
              <SummaryCard
                title="Aging >30 Hari"
                value={agingCritical}
                subtitle="WO dengan aging critical"
                icon={AlertTriangle}
                accent="amber"
                isDarkMode={isDarkMode}
              />
              <SummaryCard
                title="Dominant PIC"
                value={<span className="block truncate text-2xl md:text-3xl">{dominantPic}</span>}
                subtitle="PIC dengan jumlah WO terbesar"
                icon={Users}
                accent="cyan"
                isDarkMode={isDarkMode}
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className={`card rounded-2xl border p-5 shadow-2xl backdrop-blur-xl ${panelClass}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-cyan-300">
                      <Activity size={18} />
                      <h2 className={`font-semibold ${headingTextClass}`}>Backlog Percentage</h2>
                    </div>
                    <p className={`mt-1 text-sm ${mutedTextClass}`}>
                      Rasio backlog terhadap total work order aktif.
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-cyan-200">{backlogPercentage}%</p>
                </div>
                <div className={`mt-5 h-4 overflow-hidden rounded-full ring-1 ${
                  isDarkMode ? "bg-slate-950/70 ring-white/10" : "bg-slate-200 ring-slate-300/70"
                }`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 shadow-[0_0_24px_rgba(6,182,212,0.45)]"
                    style={{ width: `${Math.min(backlogPercentage, 100)}%` }}
                  />
                </div>
              </div>

              <div className={`card rounded-2xl border p-5 shadow-2xl backdrop-blur-xl ${panelClass}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-cyan-300">
                      <UserRoundCheck size={18} />
                      <h2 className={`font-semibold ${headingTextClass}`}>Close Percentage</h2>
                    </div>
                    <p className={`mt-1 text-sm ${mutedTextClass}`}>
                      Rasio close work order terhadap total WO.
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-emerald-300">{closePercentage}%</p>
                </div>
                <div className={`mt-5 h-4 overflow-hidden rounded-full ring-1 ${
                  isDarkMode ? "bg-slate-950/70 ring-white/10" : "bg-slate-200 ring-slate-300/70"
                }`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                    style={{ width: `${Math.min(closePercentage, 100)}%` }}
                  />
                </div>
              </div>
            </section>

            <section className="grid items-stretch gap-6 xl:grid-cols-[1.25fr_0.95fr]">
              <ChartCard
                title="Grafik Status WO"
                description="Distribusi work order berdasarkan status proses."
                isDarkMode={isDarkMode}
                bodyClassName="h-[520px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} margin={{ top: 10, right: 10, left: -15, bottom: 70 }}>
                    <CartesianGrid stroke={gridColor} strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="name"
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                      height={80}
                      tick={{ fill: axisColor, fontSize: 12 }}
                      axisLine={{ stroke: axisLineColor }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: axisColor, fontSize: 12 }}
                      axisLine={{ stroke: axisLineColor }}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(6,182,212,0.08)" }}
                      contentStyle={tooltipStyle}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#06b6d4" name="WO" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Grafik Area WO"
                description="Proporsi work order berdasarkan area/unit kerja."
                isDarkMode={isDarkMode}
                bodyClassName="flex h-[520px] flex-col"
              >
                <div className="mx-auto h-[285px] w-full max-w-[380px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={areaData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="58%"
                        outerRadius="82%"
                        paddingAngle={3}
                        stroke={isDarkMode ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.92)"}
                        strokeWidth={3}
                      >
                        {areaData.map((entry, index) => (
                          <Cell key={entry.name} fill={AREA_COLORS[index % AREA_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className={`mt-auto rounded-2xl border p-3 ${
                  isDarkMode ? "border-white/10 bg-slate-950/25" : "border-slate-200 bg-white/70"
                }`}>
                  <div className={`mb-3 grid grid-cols-[1fr_auto] items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] ${mutedTextClass}`}>
                    <span>Area Legend</span>
                    <span>Total {totalAreaWo.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {areaData.map((item, index) => (
                      <div
                        key={item.name}
                        className={`grid grid-cols-[12px_minmax(0,1fr)_42px_40px] items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                          isDarkMode ? "bg-white/[0.04] text-slate-300" : "bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span
                          className="h-3 w-3 rounded-full shadow-sm"
                          style={{ backgroundColor: AREA_COLORS[index % AREA_COLORS.length] }}
                        />
                        <span className="truncate font-medium">{item.name}</span>
                        <span className={`text-right font-bold tabular-nums ${isDarkMode ? "text-slate-100" : "text-slate-950"}`}>
                          {item.value}
                        </span>
                        <span className={`text-right text-xs tabular-nums ${mutedTextClass}`}>
                          {totalAreaWo ? Math.round((item.value / totalAreaWo) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            </section>

            <section className="grid items-stretch gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <ChartCard
                title="Distribusi WO per PIC"
                description="Jumlah work order berdasarkan PIC proses."
                isDarkMode={isDarkMode}
                bodyClassName="h-[420px]"
              >
                {picData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={picData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                      <CartesianGrid stroke={gridColor} strokeDasharray="4 4" horizontal={false} />
                      <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} axisLine={{ stroke: axisLineColor }} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={95}
                        tick={{ fill: axisColor, fontSize: 12 }}
                        axisLine={{ stroke: axisLineColor }}
                        tickLine={false}
                      />
                      <Tooltip cursor={{ fill: "rgba(6,182,212,0.08)" }} contentStyle={tooltipStyle} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#3b82f6" name="WO" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState isDarkMode={isDarkMode} />
                )}
              </ChartCard>

              <ChartCard
                title="Aging Work Order"
                description="Aging WO berdasarkan Scheduled Finish."
                isDarkMode={isDarkMode}
                bodyClassName="flex h-[420px] flex-col"
              >
                {agingData.length ? (
                  <>
                    <div className="mx-auto h-[280px] w-full max-w-[360px] flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={agingData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="58%"
                            outerRadius="82%"
                            paddingAngle={3}
                            stroke={isDarkMode ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.92)"}
                            strokeWidth={3}
                          >
                            {agingData.map((entry, index) => (
                              <Cell key={entry.name} fill={AGING_COLORS[index % AGING_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-auto grid gap-2 sm:grid-cols-2">
                      {agingData.map((item, index) => (
                        <div
                          key={item.name}
                          className={`grid grid-cols-[12px_minmax(0,1fr)_42px] items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                            isDarkMode ? "bg-white/[0.04] text-slate-300" : "bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: AGING_COLORS[index % AGING_COLORS.length] }} />
                          <span className="truncate font-medium">{item.name}</span>
                          <span className={`text-right font-bold tabular-nums ${headingTextClass}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState isDarkMode={isDarkMode} />
                )}
              </ChartCard>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <section className={`card rounded-2xl border p-5 shadow-2xl backdrop-blur-xl ${panelClass}`}>
                <div className="mb-4">
                  <h2 className={`text-lg font-semibold ${headingTextClass}`}>Tabel Detail PIC</h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>Persentase WO berdasarkan PIC proses.</p>
                </div>
                {picData.length ? (
                  <div className={`overflow-hidden rounded-2xl border ${tableBorderClass}`}>
                    <table className="w-full text-left text-sm">
                      <thead className={tableHeaderClass}>
                        <tr>
                          <th className="px-4 py-3 font-semibold">PIC</th>
                          <th className="px-4 py-3 text-right font-semibold">Jumlah WO</th>
                          <th className="px-4 py-3 text-right font-semibold">Persentase</th>
                        </tr>
                      </thead>
                      <tbody>
                        {picData.map((item) => (
                          <tr key={item.name} className={`border-t ${tableBorderClass}`}>
                            <td className={`px-4 py-3 font-medium ${headingTextClass}`}>{item.name}</td>
                            <td className={`px-4 py-3 text-right tabular-nums ${headingTextClass}`}>{item.value}</td>
                            <td className={`px-4 py-3 text-right tabular-nums ${mutedTextClass}`}>
                              {totalPicWo ? Math.round((item.value / totalPicWo) * 100) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState isDarkMode={isDarkMode} />
                )}
              </section>

              <section className={`card rounded-2xl border p-5 shadow-2xl backdrop-blur-xl ${panelClass}`}>
                <div className="mb-4">
                  <h2 className={`text-lg font-semibold ${headingTextClass}`}>Tabel Aging</h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>Status aging berdasarkan kategori scheduled finish.</p>
                </div>
                {agingData.length ? (
                  <div className={`overflow-hidden rounded-2xl border ${tableBorderClass}`}>
                    <table className="w-full text-left text-sm">
                      <thead className={tableHeaderClass}>
                        <tr>
                          <th className="px-4 py-3 font-semibold">Aging Category</th>
                          <th className="px-4 py-3 text-right font-semibold">Jumlah WO</th>
                          <th className="px-4 py-3 text-right font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agingData.map((item) => {
                          const status = getAgingStatus(item.name);
                          const statusClass = {
                            Normal: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25",
                            Warning: "bg-yellow-500/15 text-yellow-300 ring-yellow-400/25",
                            Critical: "bg-red-500/15 text-red-300 ring-red-400/25",
                            Unknown: "bg-slate-500/15 text-slate-300 ring-slate-400/25",
                          }[status];

                          return (
                            <tr key={item.name} className={`border-t ${tableBorderClass}`}>
                              <td className={`px-4 py-3 font-medium ${headingTextClass}`}>{item.name}</td>
                              <td className={`px-4 py-3 text-right tabular-nums ${headingTextClass}`}>{item.value}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass}`}>
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState isDarkMode={isDarkMode} />
                )}
              </section>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
