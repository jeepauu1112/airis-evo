import { NextResponse } from "next/server";
import type { AnalyticsMetrics, WorkOrderDetail } from "@/types/analytics";

const DEFAULT_WO_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1PIfQV4YFWtakNW50Eu1gA9Z5MjwXCj5BGnyHe_K_tJU/export?format=csv&gid=414415675";
const WO_CSV_URL = process.env.ANALYSIS_WO_CSV_URL || DEFAULT_WO_CSV_URL;

type CsvRow = Record<string, string>;
type ProcessPic = "SP Har" | "SP Op" | "Rendal Har" | "Rendal Op" | "HSE" | "";

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

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toCsvRows(rows: string[][]): CsvRow[] {
  const [headers, ...dataRows] = rows;

  if (!headers || !dataRows.length) {
    return [];
  }

  const normalizedHeaders = headers.map(normalizeHeader);

  return dataRows.map((row) => {
    const record: CsvRow = {};

    normalizedHeaders.forEach((header, index) => {
      record[header] = row[index]?.trim() ?? "";
    });

    return record;
  });
}

function getCell(row: CsvRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[normalizeHeader(key)];

    if (value) {
      return value;
    }
  }

  return "";
}

function incrementCounter(counter: Record<string, number>, rawKey: string, fallback = "Unknown") {
  const key = rawKey.trim() || fallback;
  counter[key] = (counter[key] ?? 0) + 1;
}

function parseSheetDate(value: string): Date | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) return null;

  const datePart = trimmedValue.split(/\s+/)[0];
  const slashMatch = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3]);
    const parsedDate = new Date(year, month - 1, day);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  const fallbackDate = new Date(trimmedValue);

  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
}

function getAgingCategory(scheduledFinish: string, now = new Date()): string {
  const finishDate = parseSheetDate(scheduledFinish);

  if (!finishDate) return "No Schedule";

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfFinishDate = new Date(finishDate.getFullYear(), finishDate.getMonth(), finishDate.getDate());
  const ageDays = Math.max(
    Math.floor((startOfToday.getTime() - startOfFinishDate.getTime()) / 86_400_000),
    0
  );

  if (ageDays <= 7) return "1-7 Hari";
  if (ageDays <= 30) return "8-30 Hari";

  return ">30 Hari";
}

function isClosedStatus(status: string): boolean {
  const normalizedStatus = status.trim().toLowerCase();

  return [
    "close",
    "closed",
    "comp",
    "complete",
    "completed",
    "wdone",
    "done",
    "wfinish",
    "finish",
    "finished",
    "plant ok",
  ].includes(normalizedStatus);
}

function getProcessPic(status: string, permitStatus: string): ProcessPic {
  const normalizedStatus = status.trim().toUpperCase();
  const normalizedPermitStatus = permitStatus.trim().toUpperCase();

  if (normalizedStatus === "WDONE") {
    return "Rendal Har";
  }

  if (normalizedStatus === "COMP") {
    return "Rendal Op";
  }

  if (["SCHED OK", "EXECUTOR SIGNED", "SPS SIGNED"].includes(normalizedStatus)) {
    return "SP Har";
  }

  if (normalizedStatus === "LE SIGNED") {
    return "SP Op";
  }

  if (normalizedStatus === "INPRG") {
    if (["INITIAL", "SUBMIT", "MCOMFIRN", "APPROVAL", "WSTART", "WFINISH", "CLOSE"].includes(normalizedPermitStatus)) {
      return "SP Har";
    }

    if (["MREVIEW", "WDREVIEW", "HSEWDREVIEW"].includes(normalizedPermitStatus)) {
      return "HSE";
    }

    if (["HREVIEW", "HSELWDREVIEW"].includes(normalizedPermitStatus)) {
      return "SP Op";
    }
  }

  return "";
}

function toWorkOrderDetail(row: CsvRow): WorkOrderDetail {
  const scheduledFinish = getCell(row, ["Scheduled Finish", "Scheduled Finis", "schedfinish"]);
  const maintOrg = getCell(row, ["Maint. Org.", "Maint. Or", "Maint Org", "Maintenance Org"]);
  const area = getCell(row, ["Area", "Unit", "Location"]);
  const status = getCell(row, ["Status", "WO Status"]);
  const permitStatus = getCell(row, ["Permit Status", "Permit sta"]);

  return {
    wonum: getCell(row, ["WO No", "Wonum", "WO Number"]),
    wo_number: getCell(row, ["No Work Order", "Work Order", "WO"]),
    description: getCell(row, ["Description", "Work Order Description"]),
    work_type: getCell(row, ["Work Type", "Work Typ"]),
    maint_org: maintOrg,
    pic: getProcessPic(status, permitStatus),
    status,
    site: getCell(row, ["Site"]),
    registration_date: getCell(row, ["Registration Date"]),
    scheduled_start: getCell(row, ["Scheduled Start", "Scheduled Star"]),
    scheduled_finish: scheduledFinish,
    area,
    aging: getAgingCategory(scheduledFinish),
    permit_no: getCell(row, ["Permit No", "Permit Number"]),
    permit_status: permitStatus,
    object_id: getCell(row, ["Object ID"]),
    object_description: getCell(row, ["Object Description", "Object De"]),
  };
}

function buildMetrics(rows: CsvRow[]): AnalyticsMetrics {
  const byStatus: Record<string, number> = {};
  const byArea: Record<string, number> = {};
  const byPic: Record<string, number> = {};
  const byAging: Record<string, number> = {};
  const woDetails = rows.map(toWorkOrderDetail);

  let closeWo = 0;
  let corrective = 0;
  let preventive = 0;

  woDetails.forEach((detail) => {
    const status = String(detail.status ?? "");
    const area = String(detail.area ?? "");
    const pic = String(detail.pic ?? "");
    const aging = String(detail.aging ?? "");
    const workType = String(detail.work_type ?? "").trim().toUpperCase();

    incrementCounter(byStatus, status, "No Status");
    incrementCounter(byArea, area, "No Area");
    if (pic) {
      incrementCounter(byPic, pic);
    }
    incrementCounter(byAging, aging, "No Schedule");

    if (isClosedStatus(status)) {
      closeWo += 1;
    }

    if (["CM", "CD", "EM"].includes(workType)) {
      corrective += 1;
    }

    if (workType === "PM") {
      preventive += 1;
    }
  });

  const totalWo = woDetails.length;
  const backlogWo = Math.max(totalWo - closeWo, 0);

  return {
    total_wo: totalWo,
    backlog_wo: backlogWo,
    close_wo: closeWo,
    corrective,
    preventive,
    backlog_percentage: totalWo ? Math.round((backlogWo / totalWo) * 100) : 0,
    close_percentage: totalWo ? Math.round((closeWo / totalWo) * 100) : 0,
    by_status: byStatus,
    by_area: byArea,
    by_pic: byPic,
    by_aging: byAging,
    wo_details: woDetails,
  };
}

export async function GET() {
  try {
    const response = await fetch(WO_CSV_URL, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Gagal mengambil data WO dari Google Sheet",
          detail: `Google Sheet CSV returned ${response.status}`,
        },
        { status: response.status }
      );
    }

    const csv = await response.text();
    const rows = toCsvRows(parseCsv(csv));

    if (!rows.length) {
      return NextResponse.json(
        {
          error: "Google Sheet WO kosong atau tidak bisa diparse",
          detail: "Pastikan tab WO Open dipublish sebagai CSV.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      analytics: buildMetrics(rows),
    });
  } catch (error) {
    console.error("Analysis Google Sheet error:", error);
    return NextResponse.json(
      { error: "Gagal membaca data analytics dari Google Sheet" },
      { status: 502 }
    );
  }
}
