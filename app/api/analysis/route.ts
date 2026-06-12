import { NextResponse } from "next/server";

const ANALYTICS_ENDPOINT = "https://n8n.srv898035.hstgr.cloud/webhook/airis-analysis";

function parseAnalyticsBody(body: string): unknown {
  const trimmedBody = body.trim();

  if (!trimmedBody) return null;

  const normalizedBody = trimmedBody.startsWith("=")
    ? trimmedBody.slice(1).trim()
    : trimmedBody;

  try {
    const parsed: unknown = JSON.parse(normalizedBody);

    if (typeof parsed === "string") {
      return parseAnalyticsBody(parsed);
    }

    return parsed;
  } catch {
    const firstObjectIndex = normalizedBody.indexOf("{");
    const lastObjectIndex = normalizedBody.lastIndexOf("}");

    if (firstObjectIndex >= 0 && lastObjectIndex > firstObjectIndex) {
      return JSON.parse(normalizedBody.slice(firstObjectIndex, lastObjectIndex + 1));
    }

    throw new Error("Invalid analytics JSON response");
  }
}

function stripAiSummary(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const record = payload as Record<string, unknown>;
  const { ai_summary: _aiSummary, ...rest } = record;

  return rest;
}

export async function GET() {
  try {
    const response = await fetch(ANALYTICS_ENDPOINT, {
      method: "GET",
      cache: "no-store",
      headers: {
        "x-airis-ai-summary-source": "cache",
      },
    });

    const body = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Gagal mengambil data analytics", status: response.status },
        { status: response.status }
      );
    }

    return NextResponse.json(stripAiSummary(parseAnalyticsBody(body)));
  } catch (error) {
    console.error("Analytics proxy error:", error);
    return NextResponse.json({ error: "Gagal mengambil data analytics" }, { status: 502 });
  }
}
