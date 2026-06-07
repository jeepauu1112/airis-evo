import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  description: string;
  children: ReactNode;
  isDarkMode?: boolean;
  bodyClassName?: string;
}

export function ChartCard({
  title,
  description,
  children,
  isDarkMode = true,
  bodyClassName = "h-[420px]",
}: ChartCardProps) {
  return (
    <section className={`card flex h-full flex-col rounded-2xl border p-5 shadow-2xl backdrop-blur-xl ${
      isDarkMode
        ? "border-white/10 bg-white/[0.07] shadow-black/20"
        : "border-slate-200/80 bg-white/75 shadow-slate-200/60"
    }`}>
      <div className="mb-5">
        <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-950"}`}>{title}</h2>
        <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{description}</p>
      </div>
      <div className={`chart-body min-w-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
