"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  buildRentSchedule,
  type RentPhase,
  type RentTimelineInputs,
  calculateBuyHold,
  calculateBRRRR,
  calculateFlip,
  calculateFlipDetailed,
  type OperatingInputs,
  type LoanInputs,
  Strategy,
  RehabClass,
  rehabCatalog,
  calculateRehabTotal,
  type RehabSelection,
  getUnitPrice,
} from "@/lib/calculator";
import {
  createScenario,
  deleteScenario,
  listScenarios,
  loadScenario,
  updateScenario,
  type ScenarioPayload,
  hasApi,
} from "@/lib/storage/apiScenarios";
import {
  deleteScenario as deleteScenarioLocal,
  listScenarios as listScenariosLocal,
  loadScenario as loadScenarioLocal,
  saveScenario as saveScenarioLocal,
  type Scenario as LocalScenario,
} from "@/lib/storage/scenarios";
import styles from "./analyze.module.css";

type FormState = RentTimelineInputs & {
  purchasePrice: number;
  arv: number;
  annualAppreciationPercent: number;
  monthsToSimulate: number;
  loan: LoanInputs;
  operating: OperatingInputs;
  strategy: Strategy;
  rehabClass: RehabClass;
  rehabSelections: RehabSelection[];
  includeRehabInCashRequired: boolean;
  bridgeRate: number;
  bridgeLtvPercent: number;
  bridgePointsPercent: number;
  bridgeClosingCostsPercent: number;
  includeRehabInBridge: boolean;
  refinanceLtvPercent: number;
  flipHoldMonths: number;
  sellingCostsPercent: number;
  agentFeePercent: number;
  marginalTaxRatePercent: number;
};

const defaultState: FormState = {
  purchasePrice: 325_000,
  arv: undefined as unknown as number,
  asIsValue: undefined,
  targetMonthlyRent: 2750,
  annualAppreciationPercent: 3,
  monthsToSimulate: 60,
  modelCurrentVsFuture: true,
  isOccupied: false,
  currentMonthlyRent: 0,
  monthsUntilTenantLeaves: 0,
  rehabPlanned: false,
  rehabTiming: "IMMEDIATE",
  rehabLengthMonths: 2,
  loan: {
    purchasePrice: 325_000,
    downPaymentPercent: 25,
    interestRateAnnualPercent: 6.5,
    termYears: 30,
    closingCostsPercent: 2.5,
    lenderPointsPercent: 1,
  },
  operating: {
    taxesAnnual: 4800,
    insuranceAnnual: 900,
    repairsPercent: 5,
    capexPercent: 5,
    managementPercent: 10,
    vacancyPercent: 3,
    otherMonthlyExpenses: 0,
    utilitiesMonthly: 0,
  },
  strategy: Strategy.BUY_HOLD,
  rehabClass: RehabClass.RENTAL,
  rehabSelections: rehabCatalog.map((item) => ({
    itemId: item.id,
    quantity: item.defaultQuantity ?? 0,
    enabled: false,
  })),
  includeRehabInCashRequired: true,
  bridgeRate: 9,
  bridgeLtvPercent: 100,
  bridgePointsPercent: 1,
  bridgeClosingCostsPercent: 2,
  includeRehabInBridge: false,
  refinanceLtvPercent: 75,
  flipHoldMonths: 2,
  sellingCostsPercent: 2,
  agentFeePercent: 5,
  marginalTaxRatePercent: 25,
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberInputValue = (value: number | undefined) =>
  Number.isFinite(value) ? value : "";

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultState);
  const [scenarioName, setScenarioName] = useState("My scenario");
  const [scenarioId, setScenarioId] = useState<string | undefined>(undefined);
  const [savedList, setSavedList] = useState<ScenarioPayload<FormState>[]>([]);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [rehabTimingAutoAdjusted, setRehabTimingAutoAdjusted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "offline">("idle");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [totalSaved, setTotalSaved] = useState<number>(0);
  const [isNarrow, setIsNarrow] = useState<boolean>(false);

  const rentResult = useMemo(() => {
    const rentInputs: RentTimelineInputs = {
      modelCurrentVsFuture: form.modelCurrentVsFuture,
      isOccupied: form.isOccupied,
      currentMonthlyRent: form.currentMonthlyRent,
      monthsUntilTenantLeaves: form.monthsUntilTenantLeaves,
      targetMonthlyRent: form.targetMonthlyRent,
      rehabPlanned: form.strategy === Strategy.FLIP ? true : form.rehabPlanned,
      rehabTiming: form.rehabTiming,
      rehabLengthMonths: form.rehabLengthMonths,
      asIsValue: form.asIsValue,
    };

    return buildRentSchedule(rentInputs, { months: form.monthsToSimulate });
  }, [form]);

  const phases = rentResult.phases;
  const rehabLength = phases.rehabEndMonth
    ? phases.rehabEndMonth - phases.rehabStartMonth + 1
    : 0;

  const rehabResult = useMemo(() => {
    return calculateRehabTotal(form.rehabSelections, form.rehabClass);
  }, [form.rehabClass, form.rehabSelections]);

  const updateRehabQuantity = (itemId: string, quantity: number) => {
    setForm((prev) => ({
      ...prev,
      rehabSelections: prev.rehabSelections.map((sel) =>
        sel.itemId === itemId ? { ...sel, quantity, enabled: quantity > 0 ? true : sel.enabled } : sel,
      ),
    }));
  };

  const updateRehabUnitPrice = (itemId: string, unitPrice: number) => {
    setForm((prev) => ({
      ...prev,
      rehabSelections: prev.rehabSelections.map((sel) =>
        sel.itemId === itemId ? { ...sel, customUnitPrice: unitPrice, enabled: sel.enabled ?? unitPrice > 0 } : sel,
      ),
    }));
  };

  const setRehabEnabled = (itemId: string, enabled: boolean) => {
    setForm((prev) => ({
      ...prev,
      rehabSelections: prev.rehabSelections.map((sel) =>
        sel.itemId === itemId ? { ...sel, enabled } : sel,
      ),
    }));
  };

  const applyRehabPreset = (mode: "defaults" | "clear") => {
    setForm((prev) => ({
      ...prev,
      rehabSelections: prev.rehabSelections.map((sel) => {
        const item = rehabCatalog.find((c) => c.id === sel.itemId);
        const defaultQty = item?.defaultQuantity ?? 0;
        if (mode === "defaults") {
          return { ...sel, quantity: defaultQty, enabled: defaultQty > 0 };
        }
        return { ...sel, quantity: 0, enabled: false };
      }),
    }));
  };

  const asIsFallback = form.asIsValue ?? form.purchasePrice;
  const arvFallback = form.arv ?? form.purchasePrice;

  const buyHoldResult = useMemo(() => {
    return calculateBuyHold({
      rent: {
        modelCurrentVsFuture: form.modelCurrentVsFuture,
        isOccupied: form.isOccupied,
        currentMonthlyRent: form.currentMonthlyRent,
        monthsUntilTenantLeaves: form.monthsUntilTenantLeaves,
        targetMonthlyRent: form.targetMonthlyRent,
      rehabPlanned: form.strategy === Strategy.FLIP ? true : form.rehabPlanned,
        rehabTiming: form.rehabTiming,
        rehabLengthMonths: form.rehabLengthMonths,
        asIsValue: asIsFallback,
      },
      loan: { ...form.loan, purchasePrice: form.purchasePrice },
      operating: form.operating,
      arv: arvFallback,
      purchasePrice: form.purchasePrice,
      annualAppreciationPercent: form.annualAppreciationPercent,
      months: form.monthsToSimulate,
      rehabTotal: form.includeRehabInCashRequired ? rehabResult.total : 0,
    });
  }, [form, rehabResult.total, asIsFallback, arvFallback]);

  const brrrResult = useMemo(() => {
    return calculateBRRRR({
      rent: {
        modelCurrentVsFuture: form.modelCurrentVsFuture,
        isOccupied: form.isOccupied,
        currentMonthlyRent: form.currentMonthlyRent,
        monthsUntilTenantLeaves: form.monthsUntilTenantLeaves,
        targetMonthlyRent: form.targetMonthlyRent,
        rehabPlanned: form.strategy === Strategy.FLIP ? true : form.rehabPlanned,
        rehabTiming: form.rehabTiming,
        rehabLengthMonths: form.rehabLengthMonths,
        asIsValue: asIsFallback,
      },
      operating: form.operating,
      longTermLoan: { ...form.loan, purchasePrice: form.purchasePrice },
      bridge: {
        interestRateAnnualPercent: form.bridgeRate,
        pointsPercent: form.bridgePointsPercent,
        closingCostsPercent: form.bridgeClosingCostsPercent,
        ltvPercent: form.bridgeLtvPercent,
        includeRehabInBridge: form.includeRehabInBridge,
      },
      refinanceLtvPercent: form.refinanceLtvPercent,
      purchasePrice: form.purchasePrice,
      arv: arvFallback,
      rehabTotal: rehabResult.total,
      annualAppreciationPercent: form.annualAppreciationPercent,
      months: form.monthsToSimulate,
    });
  }, [form, rehabResult.total, asIsFallback, arvFallback]);

  const flipResult = useMemo(() => {
    return calculateFlip({
      rent: {
        modelCurrentVsFuture: form.modelCurrentVsFuture,
        isOccupied: form.isOccupied,
        currentMonthlyRent: form.currentMonthlyRent,
        monthsUntilTenantLeaves: form.monthsUntilTenantLeaves,
        targetMonthlyRent: form.targetMonthlyRent,
        rehabPlanned: true,
        rehabTiming: form.rehabTiming,
        rehabLengthMonths: form.rehabLengthMonths,
        asIsValue: asIsFallback,
      },
      purchasePrice: form.purchasePrice,
      arv: arvFallback,
      rehabTotal: rehabResult.total,
      rehabMonths: form.rehabLengthMonths,
      holdMonths: form.flipHoldMonths,
      bridge: {
        interestRateAnnualPercent: form.bridgeRate,
        pointsPercent: form.bridgePointsPercent,
        closingCostsPercent: form.bridgeClosingCostsPercent,
        ltvPercent: form.bridgeLtvPercent,
        includeRehabInBridge: form.includeRehabInBridge,
      },
      sellingCostsPercent: form.sellingCostsPercent,
      agentFeePercent: form.agentFeePercent,
      taxesMonthly: form.operating.taxesAnnual / 12,
      insuranceMonthly: form.operating.insuranceAnnual / 12,
      marginalTaxRatePercent: form.marginalTaxRatePercent,
    });
  }, [form, rehabResult.total, asIsFallback, arvFallback]);

  const flipDetailed = useMemo(() => {
    return calculateFlipDetailed({
      rent: {
        modelCurrentVsFuture: form.modelCurrentVsFuture,
        isOccupied: form.isOccupied,
        currentMonthlyRent: form.currentMonthlyRent,
        monthsUntilTenantLeaves: form.monthsUntilTenantLeaves,
        targetMonthlyRent: form.targetMonthlyRent,
        rehabPlanned: form.rehabPlanned,
        rehabTiming: form.rehabTiming,
        rehabLengthMonths: form.rehabLengthMonths,
        asIsValue: asIsFallback,
      },
      purchasePrice: form.purchasePrice,
      arv: arvFallback,
      rehabTotal: rehabResult.total,
      rehabMonths: form.rehabLengthMonths,
      holdMonths: form.flipHoldMonths,
      bridge: {
        interestRateAnnualPercent: form.bridgeRate,
        pointsPercent: form.bridgePointsPercent,
        closingCostsPercent: form.bridgeClosingCostsPercent,
        ltvPercent: form.bridgeLtvPercent,
        includeRehabInBridge: form.includeRehabInBridge,
      },
      sellingCostsPercent: form.sellingCostsPercent,
      agentFeePercent: form.agentFeePercent,
      taxesMonthly: form.operating.taxesAnnual / 12,
      insuranceMonthly: form.operating.insuranceAnnual / 12,
      marginalTaxRatePercent: form.marginalTaxRatePercent,
    });
  }, [form, rehabResult.total]);

  const lastMonth = buyHoldResult.monthly[buyHoldResult.monthly.length - 1];

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const refreshSaved = async () => {
    try {
      if (!hasApi) {
        throw new Error("API unavailable; using local storage");
      }
      const { items, total } = await listScenarios<FormState>({ limit: 50 });
      setSavedList(items);
      setTotalSaved(total);
      setSyncStatus("idle");
    } catch (err) {
      console.error(err);
      setShareMessage("Unable to load saved scenarios; using device storage");
      setSyncStatus("offline");
      const local = listScenariosLocal<FormState>();
      const mapped = local.map((s) => ({
        id: s.id,
        name: s.name,
        strategy: (s.payload as FormState).strategy,
        payload: s.payload,
        createdAt: s.savedAt,
        updatedAt: s.savedAt,
      }));
      setSavedList(mapped);
      setTotalSaved(mapped.length);
    }
  };

  const handleSave = async () => {
    try {
      setSyncStatus("saving");
      const saved = scenarioId
        ? await updateScenario<FormState>(scenarioId, scenarioName, form, form.strategy)
        : await createScenario<FormState>(scenarioName, form, form.strategy);
      setScenarioId(saved.id);
      setScenarioName(saved.name);
      refreshSaved();
      setShareMessage("Scenario saved");
      setSyncStatus("idle");
    } catch (err) {
      console.error(err);
      // Fallback to local storage
      const saved = saveScenarioLocal<FormState>(scenarioName, form, scenarioId);
      setScenarioId(saved.id);
      setScenarioName(saved.name);
      refreshSaved();
      setShareMessage("Saved locally (offline)");
      setSyncStatus("offline");
    }
  };

  const handleDuplicate = async (id: string) => {
    if (!id) return;
    try {
      const source = await loadScenario<FormState>(id);
      const copyName = `${source.name} (copy)`;
      const duped = await createScenario<FormState>(copyName, source.payload, source.strategy);
      setScenarioId(duped.id);
      setScenarioName(duped.name);
      setForm(source.payload);
      refreshSaved();
      setShareMessage("Scenario duplicated");
    } catch (err) {
      console.error(err);
      try {
        const source = loadScenarioLocal<FormState>(id) as LocalScenario<FormState> | undefined;
        if (!source) throw new Error("Not found");
        const duped = saveScenarioLocal<FormState>(`${source.name} (copy)`, source.payload);
        setScenarioId(duped.id);
        setScenarioName(duped.name);
        setForm(source.payload);
        refreshSaved();
        setShareMessage("Duplicated locally");
      } catch (fallbackErr) {
        console.error(fallbackErr);
        setShareMessage("Unable to duplicate scenario");
      }
    }
  };

  const handleLoad = async (id: string) => {
    try {
      const loaded = await loadScenario<FormState>(id);
      if (loaded) {
        setForm(loaded.payload);
        setScenarioId(loaded.id);
        setScenarioName(loaded.name);
      }
    } catch (err) {
      console.error(err);
      const loaded = loadScenarioLocal<FormState>(id);
      if (loaded) {
        setForm(loaded.payload);
        setScenarioId(loaded.id);
        setScenarioName(loaded.name);
        setShareMessage("Loaded from device storage");
      } else {
        setShareMessage("Unable to load scenario");
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScenario(id);
      if (scenarioId === id) {
        setScenarioId(undefined);
      }
      refreshSaved();
    } catch (err) {
      console.error(err);
      deleteScenarioLocal<FormState>(id);
      if (scenarioId === id) {
        setScenarioId(undefined);
      }
      refreshSaved();
      setShareMessage("Deleted locally");
    }
  };

  const shareLink = () => {
    if (typeof window === "undefined") return "";
    const payload = encodeURIComponent(btoa(JSON.stringify(form)));
    return `${window.location.origin}/analyze?s=${payload}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink());
      setShareMessage("Share link copied");
      setTimeout(() => setShareMessage(null), 2000);
    } catch {
      setShareMessage("Unable to copy");
    }
  };

  useEffect(() => {
    if (
      form.isOccupied &&
      form.modelCurrentVsFuture &&
      form.rehabPlanned &&
      form.rehabTiming === "IMMEDIATE"
    ) {
      setForm((prev) => ({ ...prev, rehabTiming: "AFTER_TENANT" }));
      setRehabTimingAutoAdjusted(true);
      return;
    }
    if (!form.isOccupied || !form.modelCurrentVsFuture || !form.rehabPlanned) {
      setRehabTimingAutoAdjusted(false);
    }
    if (!form.isOccupied && form.modelCurrentVsFuture && form.rehabPlanned) {
      setForm((prev) => ({ ...prev, rehabTiming: "IMMEDIATE" }));
    }
  }, [form.isOccupied, form.modelCurrentVsFuture, form.rehabPlanned, form.rehabTiming]);

  useEffect(() => {
    refreshSaved();
  }, []);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    const updateSize = () => setIsNarrow(window.innerWidth < 720);
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    const shared = searchParams.get("s");
    if (shared) {
      try {
        const parsed = JSON.parse(atob(shared));
        setForm({ ...defaultState, ...parsed, operating: { ...defaultState.operating, ...parsed.operating }, loan: { ...defaultState.loan, ...parsed.loan } });
        setScenarioName("Shared scenario");
        setShareMessage("Loaded from share link");
        // remove param to keep state clean
        const url = new URL(window.location.href);
        url.searchParams.delete("s");
        router.replace(url.toString());
      } catch {
        setShareMessage("Invalid share link");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
      <div className={styles.page}>
        <div className="section-title">
          <h2>Analyzer</h2>
        </div>

      <div className={styles.layout}>
        <div className={styles.leftColumn}>
          <div className={`${styles.formCard} card`}>
          <div className={styles.section}>
            <div className="section-title">
              <h4>Scenario</h4>
              <div className="pill-ghost">{scenarioId ? "Saved" : "Unsaved"}</div>
            </div>
            {shareMessage ? <div className="chip badge-accent">{shareMessage}</div> : null}
            <div className={styles.statusRow}>
              <div className="chip">
                Sync: {syncStatus === "saving" ? "Saving..." : syncStatus === "offline" ? "Offline (local only)" : "Online"}
              </div>
              <div className="chip">Connection: {isOnline ? "Online" : "Offline"}</div>
              <div className="chip">Saved: {totalSaved}</div>
            </div>
            <div className={styles.fieldGrid}>
              <label className="input-group">
                <div className="input-label">Scenario name</div>
                  <input
                    className="input"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                  />
                </label>
              <div className={styles.buttonRow}>
                <button className="btn btn-primary" type="button" onClick={handleSave}>
                  Save scenario
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => handleDuplicate(scenarioId ?? "")} disabled={!scenarioId}>
                  Save as copy
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setForm(defaultState)}>
                  Reset
                </button>
                <button className="btn btn-ghost" type="button" onClick={handleCopyLink}>
                  Copy share link
                  </button>
                </div>
              </div>
              {savedList.length ? (
                <div className={styles.subgrid}>
                  <div className="pill-ghost" style={{ width: "fit-content" }}>
                    My saved scenarios
                  </div>
                  <div className={styles.miniTableWrap}>
                    <table className={styles.miniTable}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Saved</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {savedList.map((s) => (
                          <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>{new Date(s.updatedAt ?? s.createdAt).toLocaleString()}</td>
                          <td className={styles.buttonRow}>
                            <button className="btn btn-ghost" type="button" onClick={() => handleLoad(s.id)}>
                              Load
                            </button>
                            <button className="btn btn-ghost" type="button" onClick={() => handleDuplicate(s.id)}>
                              Duplicate
                            </button>
                            <button className="btn btn-ghost" type="button" onClick={() => handleDelete(s.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
            <div className={styles.buttonRow} style={{ marginBottom: 12 }}>
              {[Strategy.BUY_HOLD, Strategy.BRRRR, Strategy.FLIP].map((s) => (
                <ToggleButton
                  key={s}
                  label={s === Strategy.BUY_HOLD ? "Buy & Hold" : s === Strategy.BRRRR ? "BRRRR" : "Flip"}
                  active={form.strategy === s}
                  onClick={() => update("strategy", s)}
                />
              ))}
            </div>
            <header className={styles.formHeader}>
              <div>
                <div className={styles.kicker}>Rental Details</div>
                <h3>Current vs future conditions</h3>
                <p className="muted">
                  Capture a tenant-occupied phase, a rehab window, and a stabilized future rent without
                  losing backward compatibility.
                </p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={form.modelCurrentVsFuture}
                  onChange={(e) => update("modelCurrentVsFuture", e.target.checked)}
                />
                <span>Model current vs future conditions</span>
              </label>
            </header>

            <div className={styles.section}>
              <div className="section-title">
                <h4>Property snapshot</h4>
                <div className="pill-ghost">Strategy neutral</div>
              </div>
            <div className={styles.fieldGrid}>
              <Field
                label="Purchase price"
                value={numberInputValue(form.purchasePrice)}
                onChange={(v) => update("purchasePrice", v)}
                prefix="$"
                tooltip="Contract price paid at closing."
              />
              <Field
                label="ARV"
                value={numberInputValue(form.arv)}
                onChange={(v) => update("arv", v)}
                prefix="$"
                tooltip="After-repair value for stabilized condition."
              />
              <Field
                label="Annual appreciation %"
                value={numberInputValue(form.annualAppreciationPercent)}
                onChange={(v) => update("annualAppreciationPercent", v)}
                suffix="%"
                tooltip="Assumed property value growth per year."
              />
              <Field
                label="As-is value (optional)"
                helper="Defaults to purchase price if left blank"
                value={numberInputValue(form.asIsValue)}
                onChange={(v) => update("asIsValue", v)}
                prefix="$"
                tooltip="Current market value before rehab/turnover."
              />
              <Field
                label="Target monthly rent after rehab / turnover"
                value={numberInputValue(form.targetMonthlyRent)}
                onChange={(v) => update("targetMonthlyRent", v)}
                prefix="$"
                tooltip="Stabilized rent once rehab/turnover is complete."
              />
              <Field
                label="Months to simulate"
                helper="Drives timeline preview, rent, and value tables."
                value={numberInputValue(form.monthsToSimulate)}
                onChange={(v) => update("monthsToSimulate", Math.max(1, Math.round(v)))}
                tooltip="How far out to run the monthly/annual schedules."
              />
              {form.strategy !== Strategy.BUY_HOLD ? (
                <Field
                  label="Bridge rate % (short-term)"
                  value={numberInputValue(form.bridgeRate)}
                  onChange={(v) => update("bridgeRate", v)}
                  suffix="%"
                />
              ) : null}
              {form.strategy === Strategy.FLIP ? (
                <>
                  <Field
                    label="Flip hold months (post-rehab)"
                    value={numberInputValue(form.flipHoldMonths)}
                    onChange={(v) => update("flipHoldMonths", v)}
                  />
                  <Field
                    label="Seller costs % (flip)"
                    value={numberInputValue(form.sellingCostsPercent)}
                    onChange={(v) => update("sellingCostsPercent", v)}
                    suffix="%"
                  />
                  <Field
                    label="Agent fee % (flip)"
                    value={numberInputValue(form.agentFeePercent)}
                    onChange={(v) => update("agentFeePercent", v)}
                    suffix="%"
                  />
                  <Field
                    label="Marginal tax rate % (flip)"
                    value={numberInputValue(form.marginalTaxRatePercent)}
                    onChange={(v) => update("marginalTaxRatePercent", v)}
                    suffix="%"
                  />
                </>
              ) : null}
            </div>
          </div>

            {form.modelCurrentVsFuture ? (
              <>
                <div className={styles.section}>
                  <div className="section-title">
                    <h4>Occupancy</h4>
                    <div className="pill-ghost">Phase 1 • Current condition</div>
                  </div>
                  <div className={styles.buttonRow}>
                    <ToggleButton
                      label="Currently occupied"
                      active={form.isOccupied}
                      onClick={() => update("isOccupied", true)}
                    />
                    <ToggleButton
                      label="Vacant"
                      active={!form.isOccupied}
                      onClick={() => update("isOccupied", false)}
                    />
                  </div>
                  <div className={styles.fieldGrid}>
                    {form.isOccupied && (
                      <>
                        <Field
                          label="Current monthly rent"
                          value={numberInputValue(form.currentMonthlyRent)}
                          onChange={(v) => update("currentMonthlyRent", v)}
                          prefix="$"
                        />
                        <Field
                          label="Months until current tenant leaves"
                          value={numberInputValue(form.monthsUntilTenantLeaves)}
                          onChange={(v) => update("monthsUntilTenantLeaves", v)}
                          tooltip="Enter 0 if vacant or tenant leaves immediately."
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.section}>
                  <div className="section-title">
                    <h4>Rehab timing relative to tenancy</h4>
                    <div className="pill-ghost">Phase 2 • Rehab</div>
                  </div>
                  {form.strategy === Strategy.FLIP ? (
                    <div className="pill-ghost">Flips assume rehab.</div>
                  ) : (
                    <div className={styles.buttonRow}>
                      <ToggleButton
                        label="Rehab planned"
                        active={form.rehabPlanned}
                        onClick={() => update("rehabPlanned", true)}
                      />
                      <ToggleButton
                        label="No rehab"
                        active={!form.rehabPlanned}
                        onClick={() => update("rehabPlanned", false)}
                      />
                    </div>
                  )}

                  {(form.strategy === Strategy.FLIP || form.rehabPlanned) ? (
                    <>
                      <div className={styles.buttonRow}>
                        <ToggleButton
                          label="Immediately after purchase"
                          active={form.rehabTiming === "IMMEDIATE"}
                          disabled={form.isOccupied && form.modelCurrentVsFuture}
                          onClick={() => update("rehabTiming", "IMMEDIATE")}
                        />
                        <ToggleButton
                          label="After current tenant leaves"
                          active={form.rehabTiming === "AFTER_TENANT"}
                          onClick={() => update("rehabTiming", "AFTER_TENANT")}
                        />
                      </div>
                      {form.isOccupied && form.modelCurrentVsFuture ? (
                        <p className="muted">Occupied properties must rehab after the tenant leaves.</p>
                      ) : null}
                      {rehabTimingAutoAdjusted ? (
                        <div className="chip badge-accent">Rehab timing auto-set to after tenant move-out</div>
                      ) : null}
                      <div className={styles.fieldGrid}>
                        <Field
                          label="Rehab length (months)"
                          value={numberInputValue(form.rehabLengthMonths)}
                          onChange={(v) => update("rehabLengthMonths", v)}
                          tooltip="Duration of the rehab window."
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </>
            ) : (
              <div className={styles.section}>
                <div className="section-title">
                  <h4>Legacy mode</h4>
                  <div className="pill-ghost">Matches current experience</div>
                </div>
                <p className="muted">
                  Timeline controls are hidden. Property is treated as stabilized from the first rentable
                  month. Rehab follows existing timing rules (immediate).
                </p>
              </div>
            )}

          {(form.strategy === Strategy.BRRRR || form.strategy === Strategy.FLIP) && (
            <div className={styles.section}>
              <div className="section-title">
                <h4>Short-term financing</h4>
                <div className="pill-ghost">Bridge / rehab phase</div>
              </div>
              <div className={styles.fieldGrid}>
                <Field
                  label="Bridge interest rate % (annual)"
                  value={numberInputValue(form.bridgeRate)}
                  onChange={(v) => update("bridgeRate", v)}
                  suffix="%"
                  tooltip="Annual rate on the short-term bridge loan."
                />
                <Field
                  label="Bridge LTV %"
                  value={numberInputValue(form.bridgeLtvPercent)}
                  onChange={(v) => update("bridgeLtvPercent", v)}
                  suffix="%"
                  tooltip="Bridge loan as % of purchase (and rehab if included)."
                />
                <div className={styles.buttonRow}>
                  <ToggleButton
                    label="Include rehab in bridge"
                    active={form.includeRehabInBridge}
                    onClick={() => update("includeRehabInBridge", true)}
                  />
                  <ToggleButton
                    label="Exclude rehab from bridge"
                    active={!form.includeRehabInBridge}
                    onClick={() => update("includeRehabInBridge", false)}
                  />
                </div>
                <Field
                  label="Bridge points %"
                  value={numberInputValue(form.bridgePointsPercent)}
                  onChange={(v) => update("bridgePointsPercent", v)}
                  suffix="%"
                  tooltip="Points charged on the bridge principal."
                />
                <Field
                  label="Bridge closing costs % of purchase"
                  value={numberInputValue(form.bridgeClosingCostsPercent)}
                  onChange={(v) => update("bridgeClosingCostsPercent", v)}
                  suffix="%"
                  tooltip="Estimated closing costs on bridge purchase."
                />
                {form.strategy === Strategy.FLIP ? (
                  <Field
                    label="Flip hold months (post-rehab)"
                    value={numberInputValue(form.flipHoldMonths)}
                    onChange={(v) => update("flipHoldMonths", v)}
                  />
                ) : null}
              </div>
            </div>
          )}

          {form.strategy !== Strategy.FLIP && (
            <div className={styles.section}>
              <div className="section-title">
                <h4>Long-term financing</h4>
                <div className="pill-ghost">Buy & Hold / BRRRR</div>
              </div>
              <div className={styles.fieldGrid}>
                <Field
                  label="Down payment %"
                  value={numberInputValue(form.loan.downPaymentPercent)}
                  onChange={(v) => update("loan", { ...form.loan, downPaymentPercent: v })}
                  suffix="%"
                />
                <Field
                  label="Interest rate % (annual)"
                  value={numberInputValue(form.loan.interestRateAnnualPercent)}
                  onChange={(v) =>
                    update("loan", { ...form.loan, interestRateAnnualPercent: v })
                  }
                  suffix="%"
                />
                <Field
                  label="Term (years)"
                  value={numberInputValue(form.loan.termYears)}
                  onChange={(v) => update("loan", { ...form.loan, termYears: v })}
                />
                <Field
                  label="Closing costs % of purchase"
                  value={numberInputValue(form.loan.closingCostsPercent ?? 0)}
                  onChange={(v) => update("loan", { ...form.loan, closingCostsPercent: v })}
                  suffix="%"
                  tooltip="Estimate of lender/title costs at purchase."
                />
                <Field
                  label="Lender points %"
                  value={numberInputValue(form.loan.lenderPointsPercent ?? 0)}
                  onChange={(v) => update("loan", { ...form.loan, lenderPointsPercent: v })}
                  suffix="%"
                  tooltip="Points charged on the long-term loan amount."
                />
                {form.strategy === Strategy.BRRRR ? (
                  <Field
                    label="Refinance LTV % (BRRRR)"
                    value={numberInputValue(form.refinanceLtvPercent)}
                    onChange={(v) => update("refinanceLtvPercent", v)}
                    suffix="%"
                  />
                ) : null}
              </div>
            </div>
          )}

            <div className={styles.section}>
              <div className="section-title">
                <h4>Operating expenses</h4>
                <div className="pill-ghost">Percentages apply to rent by phase</div>
              </div>
              <div className={styles.fieldGrid}>
                <Field
                  label="Taxes (annual)"
                  value={numberInputValue(form.operating.taxesAnnual)}
                  onChange={(v) => update("operating", { ...form.operating, taxesAnnual: v })}
                  prefix="$"
                />
                <Field
                  label="Insurance (annual)"
                  value={numberInputValue(form.operating.insuranceAnnual)}
                  onChange={(v) => update("operating", { ...form.operating, insuranceAnnual: v })}
                  prefix="$"
                />
                <Field
                  label="Vacancy %"
                  value={numberInputValue(form.operating.vacancyPercent)}
                  onChange={(v) => update("operating", { ...form.operating, vacancyPercent: v })}
                  suffix="%"
                />
                <Field
                  label="Management %"
                  value={numberInputValue(form.operating.managementPercent)}
                  onChange={(v) => update("operating", { ...form.operating, managementPercent: v })}
                  suffix="%"
                />
                <Field
                  label="Repairs %"
                  value={numberInputValue(form.operating.repairsPercent)}
                  onChange={(v) => update("operating", { ...form.operating, repairsPercent: v })}
                  suffix="%"
                />
                <Field
                  label="Capex %"
                  value={numberInputValue(form.operating.capexPercent)}
                  onChange={(v) => update("operating", { ...form.operating, capexPercent: v })}
                  suffix="%"
                />
                <Field
                  label="Other monthly expenses"
                  value={numberInputValue(form.operating.otherMonthlyExpenses ?? 0)}
                  onChange={(v) => update("operating", { ...form.operating, otherMonthlyExpenses: v })}
                  prefix="$"
                />
                <Field
                  label="Utilities (monthly)"
                  value={numberInputValue(form.operating.utilitiesMonthly ?? 0)}
                  onChange={(v) => update("operating", { ...form.operating, utilitiesMonthly: v })}
                  prefix="$"
                />
              </div>
            </div>

          {(form.strategy === Strategy.FLIP || form.rehabPlanned) && (
            <div className={styles.section}>
              <div className="section-title">
                <h4>Rehab estimator</h4>
                <div className="pill-ghost">Rental vs Flip/Premium vs Retail (1.5x)</div>
              </div>
              <div className={styles.buttonRow}>
                <ToggleButton
                  label="Include rehab in cash required"
                  active={form.includeRehabInCashRequired}
                  onClick={() => update("includeRehabInCashRequired", !form.includeRehabInCashRequired)}
                />
                {[RehabClass.RENTAL, RehabClass.FLIP, RehabClass.RETAIL].map((rc) => (
                  <ToggleButton
                    key={rc}
                    label={
                      rc === RehabClass.RENTAL
                        ? "Rental Grade"
                        : rc === RehabClass.FLIP
                          ? "Flip/Premium"
                          : "Retail"
                    }
                    active={form.rehabClass === rc}
                    onClick={() => update("rehabClass", rc)}
                  />
                ))}
                <ToggleButton label="Use presets" active={false} onClick={() => applyRehabPreset("defaults")} />
                <ToggleButton label="Clear all" active={false} onClick={() => applyRehabPreset("clear")} />
              </div>
              <div className="data-row" style={{ marginTop: 8 }}>
                <div>
                  <div className="input-label">Rehab total</div>
                  <div className="input-helper">Auto-updates by grade and quantity</div>
                </div>
                <strong>{currency.format(Math.round(rehabResult.total))}</strong>
              </div>

              <div className={styles.rehabSection}>
                {["Flooring", "Kitchen", "Bathrooms", "General", "Infrastructure", "Contingency"].map(
                  (category) => {
                    const items = rehabCatalog.filter((item) => item.category === category);
                    if (!items.length) return null;
                    const enabledItems = items.filter((item) => {
                      const selection = form.rehabSelections.find((s) => s.itemId === item.id);
                      return selection?.enabled;
                    });
                    const categoryTotal = rehabResult.lineItems
                      .filter((line) => line.item.category === category)
                      .reduce((sum, line) => sum + line.lineTotal, 0);
                    return (
                      <details key={category} className={styles.categoryBlock} defaultOpen={!isNarrow}>
                        <summary className={styles.categoryHeader}>
                          <div className={styles.categoryTitle}>{category}</div>
                          <div className={styles.buttonRow}>
                            <div className="pill-ghost">{form.rehabClass}</div>
                            <div className="chip badge-accent">
                              {enabledItems.length} enabled • {currency.format(Math.round(categoryTotal))}
                            </div>
                          </div>
                        </summary>
                        <div className={styles.miniTableWrap}>
                          <table className={styles.miniTable}>
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Unit</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item) => {
                                const selection =
                                  form.rehabSelections.find((s) => s.itemId === item.id) ??
                                  { itemId: item.id, quantity: item.defaultQuantity ?? 0, enabled: false };
                                const line = rehabResult.lineItems.find((l) => l.item.id === item.id);
                                const baseUnit =
                                  line?.unitPrice ??
                                  (form.rehabClass === RehabClass.RETAIL
                                    ? getUnitPrice(item, RehabClass.RETAIL)
                                    : getUnitPrice(item, form.rehabClass));
                                const effectiveUnit = selection.customUnitPrice ?? baseUnit;
                                const lineTotal = selection.enabled
                                  ? (line?.lineTotal ?? effectiveUnit * (selection.quantity ?? 0))
                                  : 0;
                                return (
                                  <tr key={item.id}>
                                    <td>
                                      <label className="input-label" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <input
                                          type="checkbox"
                                          checked={selection.enabled ?? false}
                                          onChange={(e) => setRehabEnabled(item.id, e.target.checked)}
                                        />
                                        {item.label}
                                      </label>
                                    </td>
                                    <td>
                                      <input
                                        className={`input ${styles.input} ${styles.qtyInput}`}
                                        type="number"
                                        min={0}
                                        value={numberInputValue(selection.quantity)}
                                        disabled={!selection.enabled}
                                        onChange={(e) =>
                                          updateRehabQuantity(
                                            item.id,
                                            Math.max(0, parseFloat(e.target.value) || 0),
                                          )
                                        }
                                      />
                                    </td>
                                    <td>
                                      <input
                                        className={`input ${styles.input} ${styles.qtyInput}`}
                                        type="number"
                                        min={0}
                                        value={numberInputValue(selection.customUnitPrice ?? baseUnit)}
                                        disabled={!selection.enabled}
                                        onChange={(e) =>
                                          updateRehabUnitPrice(
                                            item.id,
                                            Math.max(0, parseFloat(e.target.value) || 0),
                                          )
                                        }
                                      />
                                    </td>
                                    <td>{currency.format(Math.round(lineTotal))}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    );
                  },
                )}
              </div>
            </div>
          )}
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={`${styles.summaryCard} card`}>
            <header className={styles.summaryHeader}>
              <div>
                <div className={styles.kicker}>Deal summary</div>
                <h3>{form.strategy} metrics</h3>
              </div>
              <div className="pill-ghost">{form.monthsToSimulate} mo horizon</div>
            </header>
          {form.strategy === Strategy.BUY_HOLD && (
            <div className={styles.kpiGrid}>
              <Kpi
                label="Cash required"
                value={currency.format(Math.round(buyHoldResult.metrics.cashRequired))}
                hint={form.includeRehabInCashRequired ? "Includes rehab total" : "Excludes rehab total"}
              />
                <Kpi
                  label="Cumulative cash flow"
                  value={currency.format(Math.round(lastMonth?.cumulativeCashFlow ?? 0))}
                  hint="Through selected month horizon."
                />
                <Kpi
                  label="Ending equity"
                  value={currency.format(Math.round(lastMonth?.equity ?? 0))}
                  hint="Property value minus loan balance."
                />
              <Kpi
                label="Total return"
                value={currency.format(Math.round(buyHoldResult.metrics.totalReturn))}
                hint="Equity + cumulative cash flow."
              />
              {form.rehabPlanned ? (
                <Kpi
                  label="Rehab total"
                  value={currency.format(Math.round(rehabResult.total))}
                  hint={`Grade: ${form.rehabClass}`}
                />
              ) : null}
            </div>
          )}

          {form.strategy === Strategy.BRRRR && (
            <div className={styles.kpiGrid}>
                <Kpi label="Refi month" value={`Month ${brrrResult.refinanceMonth}`} hint="ARV realized after rehab" />
                <Kpi label="Cash required" value={currency.format(Math.round(brrrResult.metrics.cashRequired))} hint="Rehab + bridge costs + carry" />
              <Kpi label="Bridge interest" value={currency.format(Math.round(brrrResult.bridgeInterest))} hint="Accrued until refi" />
              <Kpi label="Carry to refi" value={currency.format(Math.round(brrrResult.carryingCosts))} hint="Bridge interest + taxes/insurance/other" />
              <Kpi label="Cash out at refi" value={currency.format(Math.round(brrrResult.cashOut))} hint="Max(Refi - payoff, 0)" />
              <Kpi label="COC post-refi" value={`${((brrrResult.metrics.coc ?? 0) * 100).toFixed(1)}%`} hint="Cash flow after refi / cash required" />
              <Kpi label="DSCR (Y1 post-refi)" value={(brrrResult.annual[0]?.dscr ?? 0).toFixed(2)} hint="NOI / debt service" />
              {form.rehabPlanned ? (
                <Kpi label="Rehab total" value={currency.format(Math.round(rehabResult.total))} hint={`Grade: ${form.rehabClass}`} />
              ) : null}
            </div>
          )}

          {form.strategy === Strategy.FLIP && (
            <div className={styles.kpiGrid}>
              <Kpi label="Sale month" value={`Month ${flipResult.saleMonth}`} hint="Rehab + hold" />
              <Kpi label="Sale price" value={currency.format(Math.round(flipResult.salePrice))} hint="Using ARV" />
              <Kpi label="Total costs" value={currency.format(Math.round(flipResult.totalCosts))} hint="Purchase + rehab + carrying + selling" />
              <Kpi label="Net profit" value={currency.format(Math.round(flipResult.netProfit))} hint="After fees and costs" />
              <Kpi label="Profit after tax" value={currency.format(Math.round(flipResult.profitAfterTax))} hint={`${form.marginalTaxRatePercent}% marginal rate`} />
              <Kpi label="ROI" value={`${(flipResult.roi * 100).toFixed(1)}%`} hint="Net / total costs" />
              <Kpi label="ROI after tax" value={`${(flipResult.roiAfterTax * 100).toFixed(1)}%`} hint="Profit after tax / total costs" />
            </div>
          )}

            {form.strategy === Strategy.BUY_HOLD && (
              <div className={styles.subgrid}>
                <div className="pill-ghost" style={{ width: "fit-content" }}>
                  Cash required breakdown
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Down payment</div>
                    <div className="input-helper">{form.loan.downPaymentPercent}% of purchase</div>
                  </div>
                  <strong>{currency.format(Math.round(buyHoldResult.metrics.cashRequiredBreakdown.downPayment))}</strong>
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Closing costs</div>
                    <div className="input-helper">{form.loan.closingCostsPercent ?? 0}% of purchase</div>
                  </div>
                  <strong>{currency.format(Math.round(buyHoldResult.metrics.cashRequiredBreakdown.closingCosts))}</strong>
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Lender points</div>
                    <div className="input-helper">{form.loan.lenderPointsPercent ?? 0}% of loan</div>
                  </div>
                  <strong>{currency.format(Math.round(buyHoldResult.metrics.cashRequiredBreakdown.lenderPoints))}</strong>
                </div>
                {form.includeRehabInCashRequired ? (
                  <div className="data-row">
                    <div>
                      <div className="input-label">Rehab total</div>
                      <div className="input-helper">Included in cash required</div>
                    </div>
                    <strong>{currency.format(Math.round(rehabResult.total))}</strong>
                  </div>
                ) : null}
              </div>
            )}
          </div>

        {(form.strategy === Strategy.FLIP || form.rehabPlanned) && (
        <div className={`${styles.summaryCard} card`}>
          <header className={styles.summaryHeader}>
            <div>
              <div className={styles.kicker}>Rehab breakdown</div>
              <h3>Line items ({form.rehabClass})</h3>
            </div>
            <div className="pill-ghost">Total: {currency.format(Math.round(rehabResult.total))}</div>
          </header>
            <div className={styles.miniTableWrap}>
              <table className={styles.miniTable}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rehabResult.lineItems.map((line) => (
                    <tr key={line.item.id}>
                      <td>{line.item.label}</td>
                      <td>{line.quantity}</td>
                      <td>{currency.format(Math.round(line.unitPrice))}</td>
                      <td>{currency.format(Math.round(line.lineTotal))}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
        </div>
        )}

          <div className={`${styles.summaryCard} card`}>
            <header className={styles.summaryHeader}>
              <div>
                <div className={styles.kicker}>Timeline preview</div>
                <h3>Phase boundaries</h3>
              </div>
              <div className="pill-ghost">Spec driven</div>
            </header>

            <div className={styles.timelineBar}>
              <div
                className={`${styles.timelineSegment} ${styles.current}`}
                style={{ flex: Math.max(phases.tenantMonths || 0, 0.5) }}
              >
                <span>Current</span>
                <strong>
                  {phases.tenantMonths > 0
                    ? `Month 1-${phases.tenantMonths}`
                    : "Skipped"}
                </strong>
              </div>
              {form.rehabPlanned && rehabLength ? (
                <div
                  className={`${styles.timelineSegment} ${styles.rehab}`}
                  style={{ flex: Math.max(rehabLength, 0.5) }}
                >
                  <span>Rehab</span>
                  <strong>{phases.rehabStartMonth}-{phases.rehabEndMonth}</strong>
                </div>
              ) : (
                <div className={`${styles.timelineSegment} ${styles.rehab} ${styles.timelineMuted}`}>
                  <span>Rehab</span>
                  <strong>None</strong>
                </div>
              )}
              <div className={`${styles.timelineSegment} ${styles.stabilized}`}>
                <span>Stabilized</span>
                <strong>Month {phases.stabilizedMonth}+</strong>
              </div>
            </div>

            <div className={styles.dataList}>
              <DataRow
                label="Current phase rent"
                value={
                  form.isOccupied && form.modelCurrentVsFuture
                    ? currency.format(form.currentMonthlyRent || 0)
                    : "Vacant / $0"
                }
                helper={
                  form.modelCurrentVsFuture
                    ? `Months 1-${Math.max(phases.tenantMonths, 0)}`
                    : "Legacy: stabilized immediately"
                }
              />
              <DataRow
                label="Stabilized rent"
                value={currency.format(form.targetMonthlyRent || 0)}
                helper={`Begins month ${rentResult.phases.stabilizedMonth}`}
              />
              <DataRow
                label="Rehab period"
                value={
                  form.rehabPlanned && rentResult.phases.rehabEndMonth
                    ? `Months ${rentResult.phases.rehabStartMonth}-${rentResult.phases.rehabEndMonth} (${rentResult.phases.rehabEndMonth - rentResult.phases.rehabStartMonth + 1} mo)`
                    : "None (rent steps from current to target after tenant leaves)"
                }
                helper="Rent set to 0 during rehab."
              />
              {form.strategy === Strategy.BRRRR ? (
                <DataRow
                  label="Refinance month (BRRRR)"
                  value={
                    rentResult.phases.refinanceMonth
                      ? `Month ${rentResult.phases.refinanceMonth} (ARV realized)`
                      : "N/A until rehab is set"
                  }
                  helper={
                    form.rehabPlanned
                      ? "Refi keyed to ARV after rehab end."
                      : "No rehab: refi anchored to tenant turnover/as-is value."
                  }
                />
              ) : null}
              <DataRow
                label="As-is value baseline"
                value={currency.format(form.asIsValue || form.purchasePrice)}
                helper="Used for pre-rehab appreciation."
              />
            </div>

            <div className={styles.badges}>
              <div className="chip badge-accent">0 rent during rehab</div>
              <div className="chip badge-accent">Expenses follow rent phase</div>
              <div className="chip">Bridge interest accrues during rehab</div>
            </div>
          </div>

          <div className={`${styles.resultsCard} card`}>
            <header className={styles.summaryHeader}>
              <div>
                <div className={styles.kicker}>Results preview</div>
                <h3>KPIs & Investment Analysis</h3>
              </div>
              <div className="pill-ghost">
                {form.strategy === Strategy.FLIP
                  ? `Sale month ${flipResult.saleMonth}`
                  : `${form.monthsToSimulate} mo horizon`}
              </div>
            </header>

            {form.strategy !== Strategy.FLIP ? (
              <>
                <div className={styles.sparkRow}>
                  <SparkLine
                    label="Property value"
                    data={(form.strategy === Strategy.BRRRR ? brrrResult.monthly : buyHoldResult.monthly).map((m) => m.propertyValue)}
                    color="#ff385c"
                    formatter={(v) => currency.format(Math.round(v))}
                  />
                  <SparkLine
                    label="Monthly cash flow"
                    data={(form.strategy === Strategy.BRRRR ? brrrResult.monthly : buyHoldResult.monthly).map((m) => m.cashFlow)}
                    color="#0f9d58"
                    formatter={(v) => currency.format(Math.round(v))}
                  />
                </div>
                <CashFlowChart
                  cash={(form.strategy === Strategy.BRRRR ? brrrResult.monthly : buyHoldResult.monthly).map((m) => m.cashFlow)}
                  cumulative={(form.strategy === Strategy.BRRRR ? brrrResult.monthly : buyHoldResult.monthly).map((m) => m.cumulativeCashFlow ?? 0)}
                  formatter={(v) => currency.format(Math.round(v))}
                />
                <ValueEquityChart
                  value={(form.strategy === Strategy.BRRRR ? brrrResult.monthly : buyHoldResult.monthly).map((m) => m.propertyValue)}
                  equity={(form.strategy === Strategy.BRRRR ? brrrResult.monthly : buyHoldResult.monthly).map((m) => m.equity)}
                  formatter={(v) => currency.format(Math.round(v))}
                />
              </>
            ) : (
              <Waterfall
                label="Flip cost waterfall"
                salePrice={flipResult.salePrice}
                items={[
                  { label: "Purchase", value: form.purchasePrice },
                  { label: "Rehab", value: rehabResult.total },
                  { label: "Bridge points", value: flipDetailed.points },
                  { label: "Bridge closing", value: flipDetailed.closing },
                  { label: "Bridge interest", value: flipDetailed.interest },
                  { label: "Carrying", value: flipDetailed.carrying },
                  { label: "Agent fee", value: flipDetailed.agentFee },
                  { label: "Selling costs", value: flipDetailed.sellingCosts },
                ]}
                formatter={(v) => currency.format(Math.round(v))}
              />
            )}

            <div className={styles.kpiGrid}>
              {form.strategy === Strategy.BUY_HOLD && (
                <>
                  <Kpi
                    label="Cash required"
                    value={currency.format(Math.round(buyHoldResult.metrics.cashRequired))}
                    hint={form.includeRehabInCashRequired ? "Includes rehab" : "Excludes rehab"}
                  />
                  <Kpi
                    label="Year 1 cash flow"
                    value={currency.format(Math.round(buyHoldResult.annual[0]?.cashFlow ?? 0))}
                    hint="Includes mortgage + opEx."
                  />
                  <Kpi
                    label="Ending equity"
                    value={currency.format(Math.round(lastMonth?.equity ?? 0))}
                    hint={`${form.monthsToSimulate} mo horizon`}
                  />
                  <Kpi
                    label="Total return"
                    value={currency.format(Math.round(buyHoldResult.metrics.totalReturn))}
                    hint="Equity + cumulative cash flow."
                  />
                  <Kpi
                    label="DSCR (Year 1)"
                    value={(buyHoldResult.annual[0]?.dscr ?? 0).toFixed(2)}
                    hint="NOI / debt service."
                  />
                  <Kpi
                    label="Zero-rent months"
                    value={`${rentResult.zeroMonths} mo`}
                    hint="Vacancy + rehab months in the window."
                  />
                </>
              )}

              {form.strategy === Strategy.BRRRR && (
                <>
                  <Kpi
                    label="Cash required to refi"
                    value={currency.format(Math.round(brrrResult.metrics.cashRequired))}
                    hint="Equity gap + carry + fees"
                  />
                  <Kpi
                    label="Refi month"
                    value={`Month ${brrrResult.refinanceMonth}`}
                    hint="ARV realized after rehab end"
                  />
                  <Kpi
                    label="Cash out at refi"
                    value={currency.format(Math.round(brrrResult.cashOut))}
                    hint="Max(Refi - payoff, 0)"
                  />
                  <Kpi
                    label="Carry to refi"
                    value={currency.format(Math.round(brrrResult.carryingCosts))}
                    hint="Bridge interest + fixed expenses"
                  />
                  <Kpi
                    label="COC post-refi"
                    value={`${((brrrResult.metrics.coc ?? 0) * 100).toFixed(1)}%`}
                    hint="Cash flow after refi / cash required"
                  />
                  <Kpi
                    label="DSCR (Year 1 post-refi)"
                    value={(brrrResult.annual[0]?.dscr ?? 0).toFixed(2)}
                    hint="NOI / debt service."
                  />
                  <Kpi
                    label="Value at refi"
                    value={currency.format(Math.round(brrrResult.valueAtRefi))}
                    hint={`Refi LTV: ${form.refinanceLtvPercent}%`}
                  />
                </>
              )}

              {form.strategy === Strategy.FLIP && (
                <>
                  <Kpi label="Sale month" value={`Month ${flipResult.saleMonth}`} hint="Rehab + hold" />
                  <Kpi label="Total costs" value={currency.format(Math.round(flipResult.totalCosts))} hint="Project + fees" />
                  <Kpi label="Net profit" value={currency.format(Math.round(flipResult.netProfit))} hint="After all costs" />
                  <Kpi label="Profit after tax" value={currency.format(Math.round(flipResult.profitAfterTax))} hint={`${form.marginalTaxRatePercent}% marginal rate`} />
                  <Kpi label="ROI" value={`${(flipResult.roi * 100).toFixed(1)}%`} hint="Net / total costs" />
                  <Kpi label="ROI after tax" value={`${(flipResult.roiAfterTax * 100).toFixed(1)}%`} hint="Profit after tax / total costs" />
                </>
              )}
            </div>

            {form.strategy === Strategy.BUY_HOLD && (
              <div className={styles.subgrid}>
                <div className="pill-ghost" style={{ width: "fit-content" }}>
                  Cash required breakdown
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Down payment</div>
                    <div className="input-helper">{form.loan.downPaymentPercent}% of purchase</div>
                  </div>
                  <strong>{currency.format(Math.round(buyHoldResult.metrics.cashRequiredBreakdown.downPayment))}</strong>
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Closing costs</div>
                    <div className="input-helper">{form.loan.closingCostsPercent ?? 0}% of purchase</div>
                  </div>
                  <strong>{currency.format(Math.round(buyHoldResult.metrics.cashRequiredBreakdown.closingCosts))}</strong>
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Lender points</div>
                    <div className="input-helper">{form.loan.lenderPointsPercent ?? 0}% of loan</div>
                  </div>
                  <strong>{currency.format(Math.round(buyHoldResult.metrics.cashRequiredBreakdown.lenderPoints))}</strong>
                </div>
              </div>
            )}

            {form.strategy === Strategy.BRRRR && (
              <div className={styles.subgrid}>
                <div className="pill-ghost" style={{ width: "fit-content" }}>
                  Cash required breakdown
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Equity gap</div>
                    <div className="input-helper">Purchase + rehab - bridge</div>
                  </div>
                  <strong>{currency.format(Math.round(brrrResult.metrics.cashRequiredBreakdown.downPayment))}</strong>
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Bridge closing</div>
                    <div className="input-helper">{form.bridgeClosingCostsPercent}% of purchase</div>
                  </div>
                  <strong>{currency.format(Math.round(brrrResult.metrics.cashRequiredBreakdown.closingCosts))}</strong>
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Bridge points</div>
                    <div className="input-helper">{form.bridgePointsPercent}% of bridge amount</div>
                  </div>
                  <strong>{currency.format(Math.round(brrrResult.metrics.cashRequiredBreakdown.lenderPoints))}</strong>
                </div>
                {brrrResult.metrics.cashRequiredBreakdown.rehab ? (
                  <div className="data-row">
                    <div>
                      <div className="input-label">Rehab (cash)</div>
                      <div className="input-helper">{form.includeRehabInBridge ? "Financed" : "Cash"}</div>
                    </div>
                    <strong>{currency.format(Math.round(brrrResult.metrics.cashRequiredBreakdown.rehab ?? 0))}</strong>
                  </div>
                ) : null}
                <div className="data-row">
                  <div>
                    <div className="input-label">Carry + interest</div>
                    <div className="input-helper">Taxes/insurance/utilities + bridge interest</div>
                  </div>
                  <strong>{currency.format(Math.round(brrrResult.metrics.cashRequiredBreakdown.carrying ?? 0))}</strong>
                </div>
              </div>
            )}

            {form.strategy === Strategy.FLIP && (
              <div className={styles.subgrid}>
                <div className="pill-ghost" style={{ width: "fit-content" }}>
                  Cost structure
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Project cost</div>
                    <div className="input-helper">Purchase + rehab</div>
                  </div>
                  <strong>{currency.format(Math.round(flipDetailed.projectCost))}</strong>
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Bridge principal</div>
                    <div className="input-helper">{form.bridgeLtvPercent}% LTV on eligible costs</div>
                  </div>
                  <strong>{currency.format(Math.round(flipDetailed.bridgePrincipal))}</strong>
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Equity required</div>
                    <div className="input-helper">Gap not covered by bridge</div>
                  </div>
                  <strong>{currency.format(Math.round(flipDetailed.equityRequired))}</strong>
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Bridge points</div>
                    <div className="input-helper">{form.bridgePointsPercent}% of bridge principal</div>
                  </div>
                  <strong>{currency.format(Math.round(flipDetailed.points))}</strong>
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Bridge closing</div>
                    <div className="input-helper">{form.bridgeClosingCostsPercent}% of purchase</div>
                  </div>
                  <strong>{currency.format(Math.round(flipDetailed.closing))}</strong>
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Bridge interest</div>
                    <div className="input-helper">Accrued over financed months</div>
                  </div>
                  <strong>{currency.format(Math.round(flipDetailed.interest))}</strong>
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Carrying</div>
                    <div className="input-helper">Taxes + insurance over financed months</div>
                  </div>
                  <strong>{currency.format(Math.round(flipDetailed.carrying))}</strong>
                </div>
                <div className="data-row">
                  <div>
                    <div className="input-label">Selling costs</div>
                    <div className="input-helper">Agent + seller costs</div>
                  </div>
                  <strong>{currency.format(Math.round(flipDetailed.sellingCosts + flipDetailed.agentFee))}</strong>
                </div>
              </div>
            )}

            {form.strategy === Strategy.BUY_HOLD && (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Phase</th>
                      <th>Rent</th>
                      <th>Cash flow</th>
                      <th>Property value</th>
                      <th>Equity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyHoldResult.monthly.map((row, idx) => {
                      const phase = rentResult.schedule[idx]?.phase ?? "STABILIZED";
                      return (
                        <tr key={row.month}>
                          <td>{row.month}</td>
                          <td>{friendlyPhase(phase)}</td>
                          <td>{currency.format(Math.round(row.rent))}</td>
                          <td>{currency.format(Math.round(row.cashFlow))}</td>
                          <td>{currency.format(Math.round(row.propertyValue))}</td>
                          <td>{currency.format(Math.round(row.equity))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>

                <div className="pill-ghost" style={{ marginTop: 10, width: "fit-content" }}>
                  Investment Analysis (annualized)
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>NOI</th>
                        <th>Cash Flow</th>
                        <th>Debt Service</th>
                        <th>Principal Paid</th>
                        <th>DSCR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyHoldResult.annual.map((row) => (
                        <tr key={row.year}>
                          <td>{row.year}</td>
                          <td>{currency.format(Math.round(row.noi))}</td>
                          <td>{currency.format(Math.round(row.cashFlow))}</td>
                          <td>{currency.format(Math.round(row.debtService))}</td>
                          <td>{currency.format(Math.round(row.principalPaid))}</td>
                          <td>{row.dscr.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {form.strategy === Strategy.BRRRR && (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Rent</th>
                      <th>Cash flow</th>
                      <th>Property value</th>
                      <th>Equity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brrrResult.monthly.map((row) => (
                      <tr key={row.month}>
                        <td>{row.month}</td>
                        <td>{currency.format(Math.round(row.rent))}</td>
                        <td>{currency.format(Math.round(row.cashFlow))}</td>
                        <td>{currency.format(Math.round(row.propertyValue))}</td>
                        <td>{currency.format(Math.round(row.equity))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {form.strategy === Strategy.BRRRR && (
              <div className={styles.subgrid}>
                <div className="pill-ghost" style={{ width: "fit-content" }}>
                  Refinance summary
                </div>
                <div className={styles.pillRow}>
                  <div className="chip badge-accent">
                    ARV at refi: {currency.format(Math.round(brrrResult.valueAtRefi))}
                  </div>
                  {!form.rehabPlanned ? (
                    <div className="chip badge-accent">
                      No rehab: refi anchored to month {phases.refinanceMonth} (tenant turnover/as-is)
                    </div>
                  ) : null}
                  <div className="chip">
                    Refi amount ({form.refinanceLtvPercent}% LTV): {currency.format(Math.round(brrrResult.refinanceAmount))}
                  </div>
                  <div className="chip">
                    Bridge payoff: {currency.format(Math.round(brrrResult.payoffBridge))}
                  </div>
                  <div className="chip">
                    Cash out: {currency.format(Math.round(brrrResult.cashOut))}
                  </div>
                  <div className="chip">
                    Carry to refi: {currency.format(Math.round(brrrResult.carryingCosts))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div className="card" style={{ padding: 20 }}>
          Loading analyzer...
        </div>
      }
    >
      <AnalyzeContent />
    </Suspense>
  );
}

type FieldProps = {
  label: string;
  helper?: string;
  value: number | string | undefined;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
};

function Field({ label, helper, value, onChange, prefix, suffix, tooltip }: FieldProps) {
  const leftAdornment = prefix ?? suffix;
  return (
    <label className="input-group" title={tooltip ?? helper}>
      <div className="input-label">{label}</div>
      <div className={styles.inputShell}>
        {leftAdornment ? <span className={styles.prefix}>{leftAdornment}</span> : null}
        <input
          className={`input ${styles.input}`}
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={0}
        />
      </div>
      {helper ? <div className="input-helper">{helper}</div> : null}
    </label>
  );
}

type ToggleButtonProps = {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ToggleButton({ label, active, disabled, onClick }: ToggleButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.toggleButton} ${active ? styles.toggleButtonActive : ""} ${disabled ? styles.toggleButtonDisabled : ""}`}
      onClick={() => {
        if (disabled) return;
        onClick();
      }}
      aria-disabled={disabled}
    >
      {label}
    </button>
  );
}

type DataRowProps = {
  label: string;
  value: string;
  helper?: string;
};

function DataRow({ label, value, helper }: DataRowProps) {
  return (
    <div className="data-row">
      <div>
        <div className="input-label">{label}</div>
        {helper ? <div className="input-helper">{helper}</div> : null}
      </div>
      <strong>{value}</strong>
    </div>
  );
}

type KpiProps = {
  label: string;
  value: string;
  hint?: string;
};

function Kpi({ label, value, hint }: KpiProps) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
      {hint ? <div className={styles.kpiHint}>{hint}</div> : null}
    </div>
  );
}

type SparkLineProps = {
  label: string;
  data: number[];
  color?: string;
  formatter?: (value: number) => string;
};

function SparkLine({ label, data, color = "#ff385c", formatter }: SparkLineProps) {
  const trimmed = data.slice(-24); // focus on latest window for readability
  const safeData = trimmed.length ? trimmed : [0];
  const min = Math.min(...safeData);
  const max = Math.max(...safeData);
  const range = max - min || 1;
  const points = safeData
    .map((v, idx) => {
      const x = safeData.length === 1 ? 0 : (idx / (safeData.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  const last = safeData[safeData.length - 1];

  return (
    <div className={styles.sparkCard}>
      <div className={styles.sparkHeader}>
        <span className={styles.kpiLabel}>{label}</span>
        <strong>{formatter ? formatter(last) : last.toFixed(0)}</strong>
      </div>
      <svg className={styles.sparkSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          points={points}
        />
      </svg>
    </div>
  );
}

type BarCompareProps = {
  label: string;
  leftLabel: string;
  leftValue: number;
  rightLabel: string;
  rightValue: number;
  formatter?: (value: number) => string;
};

function BarCompare({
  label,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  formatter,
}: BarCompareProps) {
  const max = Math.max(leftValue, rightValue, 1);
  const leftPct = Math.max((leftValue / max) * 100, 2);
  const rightPct = Math.max((rightValue / max) * 100, 2);
  return (
    <div className={styles.barCard}>
      <div className={styles.sparkHeader}>
        <span className={styles.kpiLabel}>{label}</span>
      </div>
      <div className={styles.barRow}>
        <div className={styles.barLabel}>{leftLabel}</div>
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${leftPct}%` }} />
        </div>
        <div className={styles.barValue}>{formatter ? formatter(leftValue) : leftValue.toFixed(0)}</div>
      </div>
      <div className={styles.barRow}>
        <div className={styles.barLabel}>{rightLabel}</div>
        <div className={styles.barTrack}>
          <div className={`${styles.barFill} ${styles.barFillAlt}`} style={{ width: `${rightPct}%` }} />
        </div>
        <div className={styles.barValue}>{formatter ? formatter(rightValue) : rightValue.toFixed(0)}</div>
      </div>
    </div>
  );
}

type CashFlowChartProps = {
  cash: number[];
  cumulative: number[];
  formatter?: (value: number) => string;
};

function CashFlowChart({ cash, cumulative, formatter }: CashFlowChartProps) {
  const windowSize = 18;
  const start = Math.max(cash.length - windowSize, 0);
  const cashSlice = cash.slice(start);
  const cumulativeSlice = cumulative.slice(start);
  const merged = [...cashSlice, ...cumulativeSlice];
  const min = Math.min(...merged, 0);
  const max = Math.max(...merged, 0);
  const range = max - min || 1;
  const baseY = 100 - ((0 - min) / range) * 100;
  const barWidth = 100 / Math.max(cashSlice.length, 1);

  const cumulativePoints = cumulativeSlice
    .map((v, idx) => {
      const x = cashSlice.length === 1 ? 0 : (idx / (cashSlice.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const latestCash = cashSlice[cashSlice.length - 1] ?? 0;
  const latestCumulative = cumulativeSlice[cumulativeSlice.length - 1] ?? 0;

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div>
          <div className={styles.kpiLabel}>Cash flow trend (last {cashSlice.length} mo)</div>
          <strong>{formatter ? formatter(latestCash) : latestCash.toFixed(0)}</strong>
        </div>
        <div className={styles.chartLegend}>
          <span><span className={styles.dot} style={{ background: "#0f9d58" }} />Monthly cash flow</span>
          <span><span className={styles.dot} style={{ background: "#ff385c" }} />Cumulative</span>
          <span className="chip">{formatter ? formatter(latestCumulative) : latestCumulative.toFixed(0)} total</span>
        </div>
      </div>
      <svg className={styles.chartSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
        {cashSlice.map((v, idx) => {
          const x = idx * barWidth;
          const y = 100 - ((v - min) / range) * 100;
          const height = Math.abs(baseY - y);
          const yPos = v >= 0 ? y : baseY;
          return (
            <rect
              key={idx}
              x={`${x + barWidth * 0.1}`}
              y={`${yPos}`}
              width={`${Math.max(barWidth * 0.8, 0.5)}`}
              height={`${height}`}
              fill="#0f9d58"
              opacity="0.25"
            />
          );
        })}
        <polyline
          fill="none"
          stroke="#ff385c"
          strokeWidth={2}
          strokeLinecap="round"
          points={cumulativePoints}
        />
        <line
          x1="0"
          x2="100"
          y1={baseY}
          y2={baseY}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={0.8}
          strokeDasharray="4 4"
        />
      </svg>
    </div>
  );
}

type ValueEquityChartProps = {
  value: number[];
  equity: number[];
  formatter?: (value: number) => string;
};

function ValueEquityChart({ value, equity, formatter }: ValueEquityChartProps) {
  const merged = [...value, ...equity];
  const min = Math.min(...merged);
  const max = Math.max(...merged);
  const range = max - min || 1;

  const buildPoints = (arr: number[]) =>
    arr
      .map((v, idx) => {
        const x = arr.length === 1 ? 0 : (idx / (arr.length - 1)) * 100;
        const y = 100 - ((v - min) / range) * 100;
        return `${x},${y}`;
      })
      .join(" ");

  const valuePoints = buildPoints(value);
  const equityPoints = buildPoints(equity);
  const latestValue = value[value.length - 1] ?? 0;
  const latestEquity = equity[equity.length - 1] ?? 0;

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div>
          <div className={styles.kpiLabel}>Value & equity</div>
          <strong>{formatter ? formatter(latestValue) : latestValue.toFixed(0)}</strong>
        </div>
        <div className={styles.chartLegend}>
          <span><span className={styles.dot} style={{ background: "#ff385c" }} />Value</span>
          <span><span className={styles.dot} style={{ background: "#0f9d58" }} />Equity</span>
          <span className="chip">Equity: {formatter ? formatter(latestEquity) : latestEquity.toFixed(0)}</span>
        </div>
      </div>
      <svg className={styles.chartSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="#ff385c"
          strokeWidth={2}
          strokeLinecap="round"
          points={valuePoints}
        />
        <polyline
          fill="none"
          stroke="#0f9d58"
          strokeWidth={2}
          strokeLinecap="round"
          points={equityPoints}
        />
      </svg>
    </div>
  );
}

type WaterfallItem = {
  label: string;
  value: number;
};

type WaterfallProps = {
  label: string;
  items: WaterfallItem[];
  salePrice: number;
  formatter?: (value: number) => string;
};

function Waterfall({ label, items, salePrice, formatter }: WaterfallProps) {
  const totalCosts = items.reduce((sum, i) => sum + i.value, 0);
  const max = Math.max(totalCosts, salePrice, 1);
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.kpiLabel}>{label}</div>
        <div className="chip badge-accent">
          Net profit {formatter ? formatter(salePrice - totalCosts) : (salePrice - totalCosts).toFixed(0)}
        </div>
      </div>
      <div className={styles.stackBar}>
        {items.map((item, idx) => {
          const width = Math.max((item.value / max) * 100, 2);
          return (
            <div
              key={item.label}
              className={styles.stackSegment}
              style={{ width: `${width}%`, background: `linear-gradient(135deg, #ffe8ed, #ffd6e0)` }}
              title={`${item.label}: ${formatter ? formatter(item.value) : item.value}`}
            >
              <span className={styles.stackLabel}>{item.label}</span>
            </div>
          );
        })}
      </div>
      <div className={styles.barRow}>
        <div className={styles.barLabel}>Total costs</div>
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${Math.max((totalCosts / max) * 100, 4)}%` }} />
        </div>
        <div className={styles.barValue}>{formatter ? formatter(totalCosts) : totalCosts.toFixed(0)}</div>
      </div>
      <div className={styles.barRow}>
        <div className={styles.barLabel}>Sale price</div>
        <div className={styles.barTrack}>
          <div className={`${styles.barFill} ${styles.barFillAlt}`} style={{ width: `${Math.max((salePrice / max) * 100, 4)}%` }} />
        </div>
        <div className={styles.barValue}>{formatter ? formatter(salePrice) : salePrice.toFixed(0)}</div>
      </div>
    </div>
  );
}

function friendlyPhase(phase: RentPhase) {
  if (phase === "CURRENT") return "Current condition";
  if (phase === "REHAB") return "Rehab (rent paused)";
  return "Stabilized";
}
