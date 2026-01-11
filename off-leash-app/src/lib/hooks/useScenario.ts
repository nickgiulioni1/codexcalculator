"use client";

import { useState, useEffect, useCallback } from "react";
import {
  createScenario,
  deleteScenario,
  listScenarios,
  loadScenario,
  updateScenario,
  type ScenarioPayload,
  hasApi,
} from "../storage/apiScenarios";
import {
  deleteScenario as deleteScenarioLocal,
  listScenarios as listScenariosLocal,
  loadScenario as loadScenarioLocal,
  saveScenario as saveScenarioLocal,
  type Scenario as LocalScenario,
} from "../storage/scenarios";
import { Strategy } from "../calculator/types";

export type SyncStatus = "idle" | "saving" | "offline";

export type UseScenarioReturn<T> = {
  scenarioId: string | undefined;
  scenarioName: string;
  savedList: ScenarioPayload<T>[];
  totalSaved: number;
  syncStatus: SyncStatus;
  shareMessage: string | null;
  setScenarioName: (name: string) => void;
  handleSave: (form: T, strategy: Strategy) => Promise<void>;
  handleLoad: (id: string) => Promise<T | null>;
  handleDuplicate: (id: string, form: T) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  refreshSaved: () => Promise<void>;
  clearShareMessage: () => void;
  resetScenario: () => void;
};

/**
 * Custom hook for managing scenario persistence.
 * Handles API/local storage fallback, sync status, and CRUD operations.
 */
export function useScenario<T>(
  initialName: string = "My scenario"
): UseScenarioReturn<T> {
  const [scenarioId, setScenarioId] = useState<string | undefined>(undefined);
  const [scenarioName, setScenarioName] = useState(initialName);
  const [savedList, setSavedList] = useState<ScenarioPayload<T>[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const clearShareMessage = useCallback(() => {
    setShareMessage(null);
  }, []);

  const refreshSaved = useCallback(async () => {
    try {
      if (!hasApi) {
        throw new Error("API unavailable; using local storage");
      }
      const { items, total } = await listScenarios<T>({ limit: 50 });
      setSavedList(items);
      setTotalSaved(total);
      setSyncStatus("idle");
    } catch (err) {
      console.error(err);
      setShareMessage("Unable to load saved scenarios; using device storage");
      setSyncStatus("offline");
      const local = listScenariosLocal<T>();
      const mapped = local.map((s) => ({
        id: s.id,
        name: s.name,
        strategy: (s.payload as { strategy?: Strategy }).strategy ?? Strategy.BUY_HOLD,
        payload: s.payload,
        createdAt: s.savedAt,
        updatedAt: s.savedAt,
      }));
      setSavedList(mapped);
      setTotalSaved(mapped.length);
    }
  }, []);

  const handleSave = useCallback(
    async (form: T, strategy: Strategy) => {
      try {
        setSyncStatus("saving");
        const saved = scenarioId
          ? await updateScenario<T>(scenarioId, scenarioName, form, strategy)
          : await createScenario<T>(scenarioName, form, strategy);
        setScenarioId(saved.id);
        setScenarioName(saved.name);
        await refreshSaved();
        setShareMessage("Scenario saved");
        setSyncStatus("idle");
      } catch (err) {
        console.error(err);
        // Fallback to local storage
        const saved = saveScenarioLocal<T>(scenarioName, form, scenarioId);
        setScenarioId(saved.id);
        setScenarioName(saved.name);
        await refreshSaved();
        setShareMessage("Saved locally (offline)");
        setSyncStatus("offline");
      }
    },
    [scenarioId, scenarioName, refreshSaved]
  );

  const handleLoad = useCallback(
    async (id: string): Promise<T | null> => {
      try {
        const loaded = await loadScenario<T>(id);
        if (loaded) {
          setScenarioId(loaded.id);
          setScenarioName(loaded.name);
          return loaded.payload;
        }
        return null;
      } catch (err) {
        console.error(err);
        const loaded = loadScenarioLocal<T>(id);
        if (loaded) {
          setScenarioId(loaded.id);
          setScenarioName(loaded.name);
          setShareMessage("Loaded from device storage");
          return loaded.payload;
        }
        setShareMessage("Unable to load scenario");
        return null;
      }
    },
    []
  );

  const handleDuplicate = useCallback(
    async (id: string, _currentForm: T) => {
      if (!id) return;
      try {
        const source = await loadScenario<T>(id);
        const copyName = `${source.name} (copy)`;
        const duped = await createScenario<T>(
          copyName,
          source.payload,
          source.strategy
        );
        setScenarioId(duped.id);
        setScenarioName(duped.name);
        await refreshSaved();
        setShareMessage("Scenario duplicated");
      } catch (err) {
        console.error(err);
        try {
          const source = loadScenarioLocal<T>(id) as LocalScenario<T> | undefined;
          if (!source) throw new Error("Not found");
          const duped = saveScenarioLocal<T>(`${source.name} (copy)`, source.payload);
          setScenarioId(duped.id);
          setScenarioName(duped.name);
          await refreshSaved();
          setShareMessage("Duplicated locally");
        } catch (fallbackErr) {
          console.error(fallbackErr);
          setShareMessage("Unable to duplicate scenario");
        }
      }
    },
    [refreshSaved]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteScenario(id);
        if (scenarioId === id) {
          setScenarioId(undefined);
        }
        await refreshSaved();
      } catch (err) {
        console.error(err);
        deleteScenarioLocal<T>(id);
        if (scenarioId === id) {
          setScenarioId(undefined);
        }
        await refreshSaved();
        setShareMessage("Deleted locally");
      }
    },
    [scenarioId, refreshSaved]
  );

  const resetScenario = useCallback(() => {
    setScenarioId(undefined);
    setScenarioName(initialName);
  }, [initialName]);

  // Initial load
  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  return {
    scenarioId,
    scenarioName,
    savedList,
    totalSaved,
    syncStatus,
    shareMessage,
    setScenarioName,
    handleSave,
    handleLoad,
    handleDuplicate,
    handleDelete,
    refreshSaved,
    clearShareMessage,
    resetScenario,
  };
}
