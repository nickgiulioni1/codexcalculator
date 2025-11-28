import { NextRequest, NextResponse } from "next/server";
import { readAnalyses, writeAnalyses } from "@/lib/storage/fileStore";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const records = await readAnalyses();
  const record = records.find((r) => r.id === id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(record);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const body = await request.json();
  const { id } = await context.params;
  const records = await readAnalyses();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = {
    ...records[idx],
    name: (body.name ?? records[idx].name).toString(),
    strategy: body.strategy ?? records[idx].strategy,
    payload: body.payload ?? records[idx].payload,
    summary: body.summary ?? records[idx].summary,
    version: body.version ?? records[idx].version,
    updatedAt: new Date().toISOString(),
  };
  records[idx] = updated;
  await writeAnalyses(records);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const records = await readAnalyses();
  const filtered = records.filter((r) => r.id !== id);
  await writeAnalyses(filtered);
  return NextResponse.json({ ok: true });
}
