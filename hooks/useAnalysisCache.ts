"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiSummary, AnalysisCacheResponse } from "@/types/analytics";

const ANALYSIS_CACHE_ENDPOINT = "/api/analysis-cache";

interface UseAnalysisCacheResult {
  summary: AiSummary | null;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  refresh: () => Promise<void>;
}

function toAiSummary(payload: AnalysisCacheResponse): AiSummary {
  return {
    executive_summary: payload.executiveSummary,
    key_risks: payload.keyRisks,
    recommendations: payload.recommendations,
    priority_focus: [],
    risk_level: payload.riskLevel,
    generated_at: payload.generatedAt,
    data_hash: payload.dataHash,
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isAnalysisCacheResponse(value: unknown): value is AnalysisCacheResponse {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;

  return (
    typeof record.generatedAt === "string" &&
    typeof record.riskLevel === "string" &&
    isStringArray(record.executiveSummary) &&
    isStringArray(record.keyRisks) &&
    isStringArray(record.recommendations) &&
    typeof record.dataHash === "string"
  );
}

export function useAnalysisCache(): UseAnalysisCacheResult {
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const summaryRef = useRef<AiSummary | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading((currentLoading) => currentLoading || !summaryRef.current);
    setError(null);

    try {
      const response = await fetch(ANALYSIS_CACHE_ENDPOINT, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Analysis cache endpoint returned ${response.status}`);
      }

      const payload: unknown = await response.json();

      if (!isAnalysisCacheResponse(payload)) {
        throw new Error("Invalid analysis cache response");
      }

      const normalizedSummary = toAiSummary(payload);
      setSummary(normalizedSummary);
      summaryRef.current = normalizedSummary;
      setLastFetched(new Date());
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }

      setError("Gagal mengambil cache Executive Summary AI");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    return () => {
      abortRef.current?.abort();
    };
  }, [refresh]);

  return {
    summary,
    loading,
    error,
    lastFetched,
    refresh,
  };
}
