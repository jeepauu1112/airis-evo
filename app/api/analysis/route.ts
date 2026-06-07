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

export async function GET() {
  try {
    let response = await fetch(ANALYTICS_ENDPOINT, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      response = await fetch(ANALYTICS_ENDPOINT, {
        method: "POST",
        cache: "no-store",
      });
    }

    const body = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Gagal mengambil data analytics", status: response.status },
        { status: response.status }
      );
    }

    return NextResponse.json(parseAnalyticsBody(body));
  } catch (error) {
    console.error("Analytics proxy error:", error);
    return NextResponse.json({ error: "Gagal mengambil data analytics" }, { status: 502 });
  }
}
