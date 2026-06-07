import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: ReactNode;
  subtitle: string;
  icon: LucideIcon;
  accent: "cyan" | "blue" | "emerald" | "amber";
  isDarkMode?: boolean;
}

const accentClasses: Record<SummaryCardProps["accent"], string> = {
  cyan: "from-cyan-400/25 to-cyan-500/5 text-cyan-300 ring-cyan-400/30",
  blue: "from-blue-400/25 to-blue-500/5 text-blue-300 ring-blue-400/30",
  emerald: "from-emerald-400/25 to-emerald-500/5 text-emerald-300 ring-emerald-400/30",
  amber: "from-amber-400/25 to-amber-500/5 text-amber-300 ring-amber-400/30",
};

export function SummaryCard({ title, value, subtitle, icon: Icon, accent, isDarkMode = true }: SummaryCardProps) {
  return (
    <article className={`card rounded-2xl border p-5 shadow-2xl backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-300/40 ${
      isDarkMode
        ? "border-white/10 bg-white/[0.07] shadow-black/20 hover:bg-white/[0.09]"
        : "border-slate-200/80 bg-white/75 shadow-slate-200/60 hover:bg-white/90"
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{title}</p>
          <p className={`mt-3 text-3xl font-bold tracking-tight md:text-4xl ${isDarkMode ? "text-white" : "text-slate-950"}`}>
            {typeof value === "number" ? value.toLocaleString("id-ID") : value}
          </p>
        </div>
        <div className={`rounded-2xl bg-gradient-to-br p-3 ring-1 ${accentClasses[accent]}`}>
          <Icon size={24} />
        </div>
      </div>
      <p className={`mt-5 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{subtitle}</p>
    </article>
  );
}
