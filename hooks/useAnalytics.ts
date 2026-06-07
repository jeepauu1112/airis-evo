"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyticsResponse, UseAnalyticsResult } from "@/types/analytics";

const ANALYTICS_ENDPOINT = "/api/analysis";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function isAnalyticsResponse(value: unknown): value is AnalyticsResponse {
  if (!value || typeof value !== "object") return false;

  const data = value as Partial<AnalyticsResponse>;

  return (
    data.success === true &&
    typeof data.total_wo === "number" &&
    typeof data.backlog_wo === "number" &&
    typeof data.corrective === "number" &&
    typeof data.preventive === "number" &&
    Boolean(data.by_status) &&
    typeof data.by_status === "object" &&
    Boolean(data.by_area) &&
    typeof data.by_area === "object" &&
    (data.close_wo === undefined || typeof data.close_wo === "number") &&
    (data.close_percentage === undefined || typeof data.close_percentage === "number") &&
    (data.by_pic === undefined || typeof data.by_pic === "object") &&
    (data.by_aging === undefined || typeof data.by_aging === "object")
  );
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
        throw new Error(`Analytics endpoint returned ${response.status}`);
      }

      const payload: unknown = await response.json();

      if (!isAnalyticsResponse(payload)) {
        throw new Error("Invalid analytics response");
      }

      setData(payload);
      dataRef.current = payload;
      setLastUpdated(new Date());
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }

      setError("Gagal mengambil data analytics");
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
