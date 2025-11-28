import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { readAnalyses, writeAnalyses, type AnalysisRecord } from "@/lib/storage/fileStore";

function toNumber(value: string | null, defaultValue: number) {
  const parsed = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const limit = toNumber(url.searchParams.get("limit"), 50);
  const offset = toNumber(url.searchParams.get("offset"), 0);
  const query = url.searchParams.get("q")?.toLowerCase() ?? "";
  const strategy = url.searchParams.get("strategy")?.toUpperCase();

  const records = await readAnalyses();
  const filtered = records.filter((r) => {
    const matchesQuery = query ? r.name.toLowerCase().includes(query) : true;
    const matchesStrategy = strategy ? r.strategy === strategy : true;
    return matchesQuery && matchesStrategy;
  });

  const slice = filtered.slice(offset, offset + limit);
  return NextResponse.json({ items: slice, total: filtered.length, limit, offset });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const now = new Date().toISOString();
  const record: AnalysisRecord = {
    id: crypto.randomUUID(),
    name: (body.name ?? "Untitled").toString(),
    strategy: body.strategy,
    payload: body.payload ?? {},
    summary: body.summary ?? {},
    version: body.version,
    createdAt: now,
    updatedAt: now,
  };

  const records = await readAnalyses();
  records.unshift(record);
  await writeAnalyses(records);
  return NextResponse.json(record, { status: 201 });
}
