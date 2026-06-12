import { NextResponse } from "next/server";
import type { AnalysisCacheResponse } from "@/types/analytics";

const REQUIRED_HEADERS = [
  "Generated_At",
  "Risk_Level",
  "Executive_Summary",
  "Key_Risks",
  "Recommendations",
  "Data_Hash",
] as const;

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);

  return rows.filter((csvRow) => csvRow.some((cell) => cell.trim()));
}

function splitSummaryText(text: string): string[] {
  return text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCell(row: string[], headerIndex: Map<string, number>, header: string): string {
  const index = headerIndex.get(header);

  if (index === undefined) return "";

  return row[index]?.trim() ?? "";
}

function buildCacheResponse(rows: string[][]): AnalysisCacheResponse {
  const [headers, ...dataRows] = rows;

  if (!headers || !dataRows.length) {
    throw new Error("Analysis cache CSV is empty");
  }

  const headerIndex = new Map(headers.map((header, index) => [header.trim(), index]));
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerIndex.has(header));

  if (missingHeaders.length) {
    throw new Error(`Missing analysis cache headers: ${missingHeaders.join(", ")}`);
  }

  const latestRow = dataRows[dataRows.length - 1];

  return {
    generatedAt: getCell(latestRow, headerIndex, "Generated_At"),
    riskLevel: getCell(latestRow, headerIndex, "Risk_Level"),
    executiveSummary: splitSummaryText(getCell(latestRow, headerIndex, "Executive_Summary")),
    keyRisks: splitSummaryText(getCell(latestRow, headerIndex, "Key_Risks")),
    recommendations: splitSummaryText(getCell(latestRow, headerIndex, "Recommendations")),
    dataHash: getCell(latestRow, headerIndex, "Data_Hash"),
  };
}

export async function GET() {
  const csvUrl = process.env.ANALYSIS_CACHE_CSV_URL;

  if (!csvUrl) {
    return NextResponse.json(
      { error: "ANALYSIS_CACHE_CSV_URL belum dikonfigurasi" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(csvUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Gagal mengambil cache analysis", status: response.status },
        { status: response.status }
      );
    }

    const csv = await response.text();
    const rows = parseCsv(csv);

    return NextResponse.json(buildCacheResponse(rows));
  } catch (error) {
    console.error("Analysis cache proxy error:", error);
    return NextResponse.json({ error: "Gagal membaca cache analysis" }, { status: 502 });
  }
}
