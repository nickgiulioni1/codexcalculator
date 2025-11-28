import { v4 as uuidv4 } from "uuid";

export type Scenario<T> = {
  id: string;
  name: string;
  savedAt: string;
  payload: T;
};

const STORAGE_KEY = "offleash_scenarios_v1";

function readStorage<T>(): Scenario<T>[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeStorage<T>(scenarios: Scenario<T>[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
}

export function saveScenario<T>(name: string, payload: T, id?: string): Scenario<T> {
  const scenarios = readStorage<T>();
  const now = new Date().toISOString();
  const scenario: Scenario<T> = {
    id: id ?? uuidv4(),
    name: name.trim() || "Untitled scenario",
    savedAt: now,
    payload,
  };

  const next = id
    ? scenarios.map((s) => (s.id === id ? scenario : s))
    : [...scenarios, scenario];

  writeStorage(next);
  return scenario;
}

export function listScenarios<T>(): Scenario<T>[] {
  return readStorage<T>().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export function deleteScenario<T>(id: string) {
  const scenarios = readStorage<T>();
  writeStorage(scenarios.filter((s) => s.id !== id));
}

export function loadScenario<T>(id: string): Scenario<T> | undefined {
  const scenarios = readStorage<T>();
  return scenarios.find((s) => s.id === id);
}
