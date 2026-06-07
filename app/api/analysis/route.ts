import { NextResponse } from "next/server";

const ANALYTICS_ENDPOINT = "https://n8n.srv898035.hstgr.cloud/webhook/airis-analysis";

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

    return NextResponse.json(body ? JSON.parse(body) : null);
  } catch (error) {
    console.error("Analytics proxy error:", error);
    return NextResponse.json({ error: "Gagal mengambil data analytics" }, { status: 502 });
  }
}
