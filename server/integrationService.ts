import * as XLSX from "xlsx";
import type { IntegrationPreviewInput, IntegrationPreviewResponse } from "@shared/routes";

type SourceRecord = Record<string, unknown>;

const MAX_PREVIEW_RECORDS = 1000;
const PREFERRED_ARRAY_KEYS = [
  "data",
  "records",
  "results",
  "items",
  "rows",
  "students",
  "enrollees",
  "admissions",
  "applicants",
];

export async function previewIntegrationSource(
  input: IntegrationPreviewInput,
): Promise<IntegrationPreviewResponse> {
  const targetUrl = input.sourceType === "googleSheets"
    ? toGoogleSheetsCsvUrl(input.url)
    : input.url;
  const headers = buildHeaders(input);
  const method = input.sourceType === "googleSheets" ? "GET" : input.method;
  const body = method === "POST" && input.body?.trim() ? input.body : undefined;

  const response = await fetch(targetUrl, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(15000),
  });
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Source returned ${response.status}: ${text.slice(0, 160)}`);
  }

  const isHtml = contentType.includes("html") || text.trim().toLowerCase().startsWith("<!doctype html>") || text.trim().toLowerCase().startsWith("<html");
  if (isHtml) {
    if (input.sourceType === "googleSheets") {
      throw new Error("Google Sheet must be public or shared for import.");
    }
    throw new Error("Invalid URL. Source returned an HTML page instead of data.");
  }

  const { records, rawPreview } = parsePayload(text, contentType, input.sourceType);
  const normalizedRecords = records
    .slice(0, MAX_PREVIEW_RECORDS)
    .map((record) => flattenRecord(record))
    .filter((record) => Object.keys(record).length > 0);

  return {
    status: response.status,
    sourceType: input.sourceType,
    contentType,
    fields: collectFields(normalizedRecords),
    records: normalizedRecords,
    rawPreview,
    sourceLabel: input.sourceType === "googleSheets" ? "Google Sheets" : new URL(input.url).hostname,
  };
}

function buildHeaders(input: IntegrationPreviewInput): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json, text/csv;q=0.9, text/plain;q=0.8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  if (input.authMode === "bearer" && input.authToken?.trim()) {
    headers.Authorization = `Bearer ${input.authToken.trim()}`;
  }

  if (input.authMode === "apiKey" && input.authToken?.trim()) {
    headers[input.apiKeyHeader?.trim() || "X-API-Key"] = input.authToken.trim();
  }

  if (input.method === "POST" && input.body?.trim()) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

function parsePayload(
  text: string,
  contentType: string,
  sourceType: IntegrationPreviewInput["sourceType"],
): { records: SourceRecord[]; rawPreview: unknown } {
  const trimmed = text.trim();
  const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  const looksSpreadsheet = sourceType === "googleSheets" || contentType.includes("csv") || contentType.includes("spreadsheet");

  if (looksSpreadsheet && !looksJson) {
    const records = parseWorkbookText(text);
    return { records, rawPreview: records.slice(0, 3) };
  }

  if (contentType.includes("json") || looksJson) {
    const parsed = JSON.parse(text) as unknown;
    const records = extractRecords(parsed);
    return { records, rawPreview: records.slice(0, 3) };
  }

  const records = parseWorkbookText(text);
  return { records, rawPreview: records.slice(0, 3) };
}

function parseWorkbookText(text: string): SourceRecord[] {
  const workbook = XLSX.read(text, { type: "string" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];

  return XLSX.utils.sheet_to_json<SourceRecord>(workbook.Sheets[firstSheet], {
    defval: "",
    raw: false,
  });
}

function extractRecords(value: unknown): SourceRecord[] {
  if (Array.isArray(value)) {
    const directRecords = value.filter(isPlainRecord);
    if (directRecords.length > 0) return directRecords;

    for (const item of value) {
      const nested = extractRecords(item);
      if (nested.length > 0) return nested;
    }
  }

  if (!isPlainRecord(value)) return [];

  for (const key of PREFERRED_ARRAY_KEYS) {
    const nested = extractRecords(value[key]);
    if (nested.length > 0) return nested;
  }

  for (const nestedValue of Object.values(value)) {
    const nested = extractRecords(nestedValue);
    if (nested.length > 0) return nested;
  }

  return [value];
}

function flattenRecord(record: SourceRecord, prefix = "", output: SourceRecord = {}): SourceRecord {
  Object.entries(record).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (isPlainRecord(value)) {
      flattenRecord(value, nextKey, output);
      return;
    }

    if (Array.isArray(value)) {
      output[nextKey] = value.every((item) => typeof item !== "object")
        ? value.join(", ")
        : JSON.stringify(value);
      return;
    }

    output[nextKey] = value;
  });

  return output;
}

function collectFields(records: SourceRecord[]): string[] {
  const fields = new Set<string>();
  records.slice(0, 100).forEach((record) => {
    Object.keys(record).forEach((key) => fields.add(key));
  });

  return Array.from(fields);
}

function toGoogleSheetsCsvUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl);
  if (url.hostname !== "docs.google.com") return sourceUrl;
  if (url.pathname.includes("/export")) return sourceUrl;

  const spreadsheetId = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/)?.[1];
  if (!spreadsheetId) {
    throw new Error("Google Sheets URL must include a spreadsheet ID.");
  }

  const gid = url.searchParams.get("gid") || sourceUrl.match(/[?#&]gid=(\d+)/)?.[1] || "0";
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

function isPlainRecord(value: unknown): value is SourceRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
