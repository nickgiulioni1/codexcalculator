### 6.X Current vs Future Conditions and Tenant Timeline

#### 6.X.1 Motivation

Users often analyze properties that are:

- Currently tenanted at below-market rent, and
- Expected to undergo a future change in condition, such as:
  - Tenant move-out followed by a rent increase, and/or
  - A rehab that occurs in the future (not immediately at purchase).

The model must:

- Represent a “current condition” phase and a “stabilized future” phase.
- Allow planned rehab to begin only after the current tenant leaves.
- Keep the default experience simple; advanced timeline controls are opt-in.

#### 6.X.2 UI

On the Rental Details tab (or equivalent), add:

- Checkbox: `Model current vs future conditions (advanced)`

When this checkbox is **unchecked**:

- Use the existing behavior:
  - Property is treated as stabilized from the first rentable month.
  - Rehab (if any) follows the existing timing rules.

When **checked**, show these additional controls:

1. Occupancy

- `Is the property currently occupied?` [Yes/No]

If `Yes`:

- `Current monthly rent` (currency input)
- `Months until current tenant leaves` (integer, M_tenant ≥ 0)

If `No`:

- Skip current rent fields; property is treated as vacant.

2. Future/stabilized rent

- Relabel the existing `Monthly Rent` field to:
  - `Target monthly rent after rehab / turnover`

This value defines the stabilized rent level for the future condition.

3. Rehab timing relative to tenancy

Displayed only if the strategy involves rehab or if a rehab has been configured:

- Checkbox: `Rehab planned for this property` [Yes/No]

If `No`:

- No rehab is modeled; rent simply steps from `Current monthly rent` to `Target monthly rent` after the tenant leaves.

If `Yes`, show:

- Dropdown: `When will rehab happen?`
  - `Immediately after purchase`
  - `After current tenant leaves`

The existing `Rehab Length (months)` input is reused.

Guardrails:

- If `Is the property currently occupied? = Yes`, the `Immediately after purchase` option is disabled; rehab must follow tenant move-out to keep the timeline coherent.

#### 6.X.3 Timeline semantics

Let:

- `M_tenant` = `Months until current tenant leaves` (0 if vacant or unknown)
- `M_rehab` = `Rehab Length (months)`
- `rehabAfterTenant` = true if “After current tenant leaves” is selected
- `rehabPlanned` = true if “Rehab planned for this property” is checked

Define:

- If `rehabAfterTenant`:
  - `rehabStartMonth = M_tenant + 1`
  - `rehabEndMonth = M_tenant + M_rehab`
- Else (rehab starts immediately):
  - `rehabStartMonth = 1`
  - `rehabEndMonth = M_rehab`

If `rehabPlanned = false`, set:

- `rehabStartMonth = M_tenant + 1` (placeholder anchor)
- `rehabEndMonth = M_tenant` (zero-length rehab) so downstream formulas referencing `rehabEndMonth` remain defined.

The investment lifecycle is divided into three phases:

1. Current condition:
   - Months 1 … `M_tenant`
2. Rehab:
   - Months `rehabStartMonth` … `rehabEndMonth`
3. Stabilized condition:
   - Months > `rehabEndMonth`

#### 6.X.4 Rent and cash flow rules

For each month `m`:

- If `m` is within the **current condition** phase (1 … `M_tenant`):

  - If `isOccupied = true`:
    - `rent[m] = currentMonthlyRent * rentGrowthFactorCurrent(m)`
  - Else (vacant):
    - `rent[m] = 0`

  - All rent-based expenses are derived from `rent[m]` as in the existing model:
    - Vacancy, repairs, capex, property management, lease-up fee, etc.  [oai_citation:8‡New chat.docx](sediment://file_000000008328722fb83a8b253ba9c855)  

- If `m` is within the **rehab** phase (`rehabStartMonth` … `rehabEndMonth`):

  - `rent[m] = 0` (no rental income)
  - Property taxes and insurance accrue as usual.
  - Bridge loan interest (for BRRRR/Flip) accrues per the existing Value Add logic.  [oai_citation:9‡New chat.docx](sediment://file_000000008328722fb83a8b253ba9c855)  

- If `m` is within the **stabilized** phase (`m > rehabEndMonth`):

  - `rent[m] = targetMonthlyRent * rentGrowthFactorFuture(m)`
  - All rent-based expenses follow from `rent[m]`.

If no rehab is planned (`Rehab planned for this property = No`):

- The rehab phase is skipped.
- Rent moves from `currentMonthlyRent` to `targetMonthlyRent` starting the month after `M_tenant`.

#### 6.X.5 Property value, ARV and refinance timing

Add an optional advanced input:

- `As-is value (current condition)` (defaults to Purchase Price if left blank).

Property value is modeled as follows:

- For months `m` up to and including `rehabEndMonth` (or `M_tenant` if no rehab is planned):
  - `propertyValue[m] = asIsValue * (1 + monthlyAppreciation)^m`

- If `rehabPlanned = true`:
  - At month `rehabEndMonth + 1`, the property reaches ARV:
    - `propertyValue[rehabEndMonth + 1] = ARV`
  - For `m > rehabEndMonth + 1`:
    - `propertyValue[m]` continues to appreciate from ARV using the same monthly appreciation logic.

- If `rehabPlanned = false`:
  - No ARV jump is applied; the property value stays on the as-is appreciation track for all `m`.
  - If the user provides ARV/sale price without rehab, treat it as a stabilized market value input, not a forced jump; calculations should remain consistent with the continuous appreciation path.

For BRRRR:

- The refinance step is keyed off the ARV realized after rehab:
  - The “refinance month” becomes `rehabEndMonth + 1` (or `M_tenant + 1` when `rehabPlanned = false`).
  - The long-term mortgage and `cashLeftInDeal` are computed using this timing instead of assuming rehab starts immediately upon purchase.  [oai_citation:10‡New chat.docx](sediment://file_000000008328722fb83a8b253ba9c855)  

For Flip:

- The sale is still modeled using ARV as the baseline, but the months financed for taxes, insurance, and bridge interest now incorporate any tenant-occupied months plus rehab months, consistent with the adjusted timeline.  [oai_citation:11‡New chat.docx](sediment://file_000000008328722fb83a8b253ba9c855)  
- If no rehab is planned, the sale uses the as-is appreciation path (or user-provided selling price/ARV) and still includes tenant-occupied months in the financed duration.

#### 6.X.6 Defaults and backward compatibility

- If the user never checks `Model current vs future conditions`:
  - Behavior exactly matches the legacy calculator and the original reverse-engineering spec.  [oai_citation:12‡New chat.docx](sediment://file_000000008328722fb83a8b253ba9c855)  
- When the checkbox is first enabled:
  - Default `isOccupied = false`
  - Default `M_tenant = 0`
  - Default `Rehab planned for this property = true` only for strategies or templates that already use rehab.
- Existing analyses without timeline data:
  - Are interpreted as `isOccupied = false`, `M_tenant = 0`, rehab starting immediately (legacy behavior).

### 7.X Rehab Estimator Classes (to align with Checklist 2.5)

- Support three classes of rehab work: `Rental Grade`, `Flip/Premium Grade`, and `Retail Grade`.
- Pricing rule: Retail Grade defaults to `Flip/Premium * 1.5x` unless explicitly overridden in a future update.
- Catalog items and default quantities:
  - Flooring: LVP $4.50 / $6.50 (qty 1,000 sq ft), Carpet $3.00 / $4.50 (qty 1,000 sq ft), Bathroom tile $800 / $1,200 per bath.
  - Kitchen: Cabinets $5,000 / $8,000 per kitchen; Countertops $3,000 / $5,000 per kitchen; Appliance package $2,500 / $4,000 per set; Sink & faucet $400 / $700 per sink.
  - Bathrooms: Full reno $4,500 / $7,500 per bath; Vanity $600 / $1,200 per; Toilet $300 / $500 per; Mirror & light $200 / $400 per set.
  - General: Interior paint $1.50 / $2.50 per sq ft (qty 1,000); Drywall repair $0.50 / $0.80 per sq ft (qty 1,000); Wall prep $0.30 / $0.50 per sq ft (qty 1,000); Interior doors $250 / $350 (qty 6); Door knobs $35 / $65 (qty 6); Exterior doors $500 / $800 (qty 2); Windows $450 / $650 (qty 10); Blinds $50 / $80 (qty 10); Smoke/CO $35 / $35 (qty 4).
  - Infrastructure: Exterior paint $4,000 / $6,000; Roof $8,000 / $10,000; Siding/fascia $3,500 / $5,000; Electrical update $4,000 / $6,000; Plumbing update $3,500 / $5,000; Water heater $1,200 / $1,800; New AC $5,000 / $6,500; Furnace $4,500 / $5,500; Landscaping $2,000 / $3,500; Concrete/porch $2,500 / $4,000; Basement waterproofing $3,000 / $4,000.
  - Contingency/Custom: Contingency $2.00 / $3.00 per sq ft (qty 1,000); Custom Item 1 $0 / $0 user-fillable.
