import { NextRequest, NextResponse } from "next/server";

const ML_API_BASE_URL = "http://31.97.107.231:8001";
const ALLOWED_RESOURCES = new Set([
  "forecast-wo",
  "forecast-area",
  "forecast-worktype",
  "data-health",
]);

export async function GET(request: NextRequest) {
  const resource = request.nextUrl.searchParams.get("resource") ?? "";

  if (!ALLOWED_RESOURCES.has(resource)) {
    return NextResponse.json(
      { error: "Invalid forecast resource" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${ML_API_BASE_URL}/${resource}`, {
      method: "GET",
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "AIRIS ML Engine request failed",
          status: response.status,
          payload,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Forecast proxy error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data AIRIS ML Engine" },
      { status: 502 }
    );
  }
}
