import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const ANALYSES_FILE = path.join(DATA_DIR, "analyses.json");

export type AnalysisRecord = {
  id: string;
  name: string;
  strategy?: string;
  payload: unknown;
  summary?: unknown;
  version?: string;
  createdAt: string;
  updatedAt: string;
};

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(ANALYSES_FILE);
  } catch {
    await fs.writeFile(ANALYSES_FILE, "[]", "utf-8");
  }
}

export async function readAnalyses(): Promise<AnalysisRecord[]> {
  await ensureStore();
  const raw = await fs.readFile(ANALYSES_FILE, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed;
}

export async function writeAnalyses(records: AnalysisRecord[]) {
  await ensureStore();
  await fs.writeFile(ANALYSES_FILE, JSON.stringify(records, null, 2), "utf-8");
}
