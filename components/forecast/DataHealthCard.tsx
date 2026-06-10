import type { ReactNode } from "react";
import type { StatusTone } from "./types";
import { getToneClass } from "./types";

interface DataHealthCardProps {
  title: string;
  value: string;
  badge: string;
  tone: StatusTone;
  icon: ReactNode;
  isDarkMode?: boolean;
}

export function DataHealthCard({ title, value, badge, tone, icon, isDarkMode = true }: DataHealthCardProps) {
  const cardClass = isDarkMode
    ? "border-white/10 bg-white/[0.06] shadow-black/20"
    : "border-slate-200/80 bg-white/76 shadow-slate-200/60";
  const titleClass = isDarkMode ? "text-slate-400" : "text-slate-500";
  const valueClass = isDarkMode ? "text-white" : "text-slate-950";

  return (
    <section className={`rounded-2xl border p-5 shadow-2xl backdrop-blur-xl ${cardClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${titleClass}`}>{title}</p>
          <p className={`mt-4 text-3xl font-bold leading-none md:text-4xl ${valueClass}`}>{value}</p>
        </div>
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
          {icon}
        </div>
      </div>
      <span className={`mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getToneClass(tone)}`}>
        {badge}
      </span>
    </section>
  );
}
