"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyticsMetrics, AnalyticsResponse, UseAnalyticsResult } from "@/types/analytics";

const ANALYTICS_ENDPOINT = "/api/analysis";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;

  return true;
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "number")
  );
}

function normalizeMetrics(value: unknown): AnalyticsMetrics | null {
  if (!isRecord(value)) return null;

  const totalWo = value.total_wo;
  const backlogWo = value.backlog_wo;
  const closeWo = value.close_wo;
  const corrective = value.corrective;
  const preventive = value.preventive;

  if (
    typeof totalWo !== "number" ||
    typeof backlogWo !== "number"
  ) {
    return null;
  }

  const safeCloseWo = typeof closeWo === "number" ? closeWo : Math.max(totalWo - backlogWo, 0);
  const backlogPercentage =
    typeof value.backlog_percentage === "number"
      ? value.backlog_percentage
      : totalWo
        ? Math.round((backlogWo / totalWo) * 100)
        : 0;
  const closePercentage =
    typeof value.close_percentage === "number"
      ? value.close_percentage
      : totalWo
        ? Math.round((safeCloseWo / totalWo) * 100)
        : 0;

  return {
    total_wo: totalWo,
    backlog_wo: backlogWo,
    close_wo: safeCloseWo,
    corrective: typeof corrective === "number" ? corrective : 0,
    preventive: typeof preventive === "number" ? preventive : 0,
    backlog_percentage: backlogPercentage,
    close_percentage: closePercentage,
    by_status: isNumberRecord(value.by_status) ? value.by_status : {},
    by_area: isNumberRecord(value.by_area) ? value.by_area : {},
    by_pic: isNumberRecord(value.by_pic) ? value.by_pic : {},
    by_aging: isNumberRecord(value.by_aging) ? value.by_aging : {},
    wo_details: Array.isArray(value.wo_details) ? value.wo_details : undefined,
  };
}

function normalizeAnalyticsResponse(value: unknown): AnalyticsResponse | null {
  if (!isRecord(value)) return null;
  if (value.success === false) return null;

  const analytics = value.analytics ?? value;
  const metrics = normalizeMetrics(analytics);
  if (!metrics) return null;

  return {
    success: true,
    ...metrics,
    ai_summary: null,
  };
}

async function getAnalyticsErrorMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();

    if (!isRecord(payload)) {
      return `Gagal mengambil data analytics (${response.status})`;
    }

    const detail = typeof payload.detail === "string" ? payload.detail : "";
    const error = typeof payload.error === "string" ? payload.error : "Gagal mengambil data analytics";

    return detail ? `${error}: ${detail}` : `${error} (${response.status})`;
  } catch {
    return `Gagal mengambil data analytics (${response.status})`;
  }
}

export function useAnalytics(): UseAnalyticsResult {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dataRef = useRef<AnalyticsResponse | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading((currentLoading) => currentLoading || !dataRef.current);
    setError(null);

    try {
      const response = await fetch(ANALYTICS_ENDPOINT, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(await getAnalyticsErrorMessage(response));
      }

      const payload: unknown = await response.json();

      const normalizedPayload = normalizeAnalyticsResponse(payload);

      if (!normalizedPayload) {
        throw new Error("Invalid analytics response");
      }

      setData(normalizedPayload);
      dataRef.current = normalizedPayload;
      setLastUpdated(new Date());
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }

      setError(fetchError instanceof Error ? fetchError.message : "Gagal mengambil data analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      abortRef.current?.abort();
    };
  }, [refresh]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}
