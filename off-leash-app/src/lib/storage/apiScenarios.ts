const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const base = API_BASE.replace(/\/$/, "");

export type ScenarioPayload<T> = {
  id: string;
  name: string;
  strategy?: string;
  payload: T;
  summary?: unknown;
  version?: string;
  createdAt: string;
  updatedAt: string;
};

export type ScenarioListResponse<T> = {
  items: ScenarioPayload<T>[];
  total: number;
  limit: number;
  offset: number;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function listScenarios<T>(opts?: {
  limit?: number;
  offset?: number;
  q?: string;
  strategy?: string;
}): Promise<ScenarioListResponse<T>> {
  const params = new URLSearchParams();
  if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts?.offset !== undefined) params.set("offset", String(opts.offset));
  if (opts?.q) params.set("q", opts.q);
  if (opts?.strategy) params.set("strategy", opts.strategy);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<ScenarioListResponse<T>>(`${base}/api/analyses${suffix}`);
}

export async function createScenario<T>(
  name: string,
  payload: T,
  strategy?: string,
): Promise<ScenarioPayload<T>> {
  return request<ScenarioPayload<T>>(`${base}/api/analyses`, {
    method: "POST",
    body: JSON.stringify({ name, payload, strategy }),
  });
}

export async function updateScenario<T>(
  id: string,
  name: string,
  payload: T,
  strategy?: string,
): Promise<ScenarioPayload<T>> {
  return request<ScenarioPayload<T>>(`${base}/api/analyses/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, payload, strategy }),
  });
}

export async function loadScenario<T>(id: string): Promise<ScenarioPayload<T>> {
  return request<ScenarioPayload<T>>(`${base}/api/analyses/${id}`);
}

export async function deleteScenario(id: string): Promise<void> {
  await request(`${base}/api/analyses/${id}`, { method: "DELETE" });
}
