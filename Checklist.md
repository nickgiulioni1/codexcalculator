# Off Leash Deal Analyzer – Implementation Checklist & Work Packages

This document breaks the system into discrete, assignable units of work. Each unit should be completable by a single “agent” (human or AI) within a reasonable development session.

## Legend

- [ ] Not started
- [~] In progress
- [x] Done

### 1. Project setup and foundations

#### 1.1 Repository and tooling

- [ ] Create GitHub repo for Off Leash Deal Analyzer.
- [x] Initialize front-end project (e.g., Next.js + TypeScript).
- [x] Configure linting and formatting (ESLint, Prettier).
- [x] Set up basic CI (e.g., GitHub Actions) for build and tests.
- [x] Configure environment management (.env, secrets strategy).
- [ ] Configure deployment pipeline from GitHub → TiinyHost (manual or automated).

#### 1.2 Backend and database

- [ ] Select backend platform (e.g., Supabase, Firebase, Node/Express + hosted Postgres).
- [ ] Create database instance.
- [ ] Define migration strategy (SQL migrations, schema migrations).
- [ ] Implement minimal API host (if not using a BaaS).

### 2. Calculator engine

> This is the deterministic math module implementing the real estate calculations per spec.  [oai_citation:9‡New chat.docx](sediment://file_000000008328722fb83a8b253ba9c855)

#### 2.1 Core types and utilities

- [x] Define shared TypeScript types:
  - [x] `Strategy` enum (BUY_HOLD, BRRRR, FLIP).
  - [x] Shared `CalculatorInputs` structure.
  - [x] Shared `MonthlyResult` and `AnnualSummary` structures.
- [x] Implement financial utilities:
  - [x] PMT, IPMT, PPMT equivalents.
  - [x] Annual-to-monthly rate converter (e.g., RATE approximation).
  - [x] Generic amortization helpers.

#### 2.2 Buy & Hold calculator implementation

- [x] Implement `calculateBuyHold(inputs: BuyHoldInputs): { monthly: MonthlyResult[]; annual: AnnualSummary[]; metrics: BuyHoldMetrics }`.
- [x] Implement:
  - [x] Loan amount and down payment.
  - [x] Monthly mortgage schedule.
  - [x] Monthly property value and equity.
  - [x] Rent and operating expenses per month.
  - [x] Cash flow, cumulative cash flow, total cash invested, and total return.
  - [x] Yearly aggregation into Investment Analysis table.
- [x] Create unit tests with fixed input cases:
  - [x] Reproduce spreadsheet outputs for at least 3 scenarios:
    - Simple baseline, high rehab, high leverage.
  - [x] Verify key metrics (cash flow, equity, total return, DSCR, etc.).

#### 2.3 BRRRR calculator implementation

- [x] Define `BRRRRInputs` including:
  - [x] Short-term financing type.
  - [x] Bridge loan parameters.
  - [x] Rehab duration.
  - [x] Refinance LTV, closing cost %, lender points.
- [x] Implement bridge loan calculation per spec.
- [x] Implement rehab phase:
  - [x] No rent, but taxes and insurance accrue.
- [x] Implement refinance step:
  - [x] New loan amount.
  - [x] Bridge payoff.
  - [x] Cash left in deal.
- [x] Implement post-refi rental phase using Buy & Hold engine, with adjusted initial cash.
- [~] Unit tests:
  - [~] Match spreadsheet outputs for:
    - Ideal BRRRR with cash-out.
    - Tight BRRRR with some cash left in deal.

#### 2.4 Flip calculator implementation

- [x] Define `FlipInputs` including:
  - [x] Rehab length.
  - [x] Months on market.
  - [x] Selling price (default ARV).
  - [x] Agent fee rate.
  - [x] Seller closing cost rate.
  - [x] Marginal tax rate.
- [x] Implement:
  - [x] Bridge principal, interest, closing costs.
  - [x] Carrying costs (taxes, insurance).
  - [x] Selling proceeds and net profit.
  - [x] Profit after tax.
  - [x] ROI based on net cash flow.
- [~] Unit tests:
  - [~] Validate profit and ROI for example scenarios from spreadsheet.

#### 2.5 Rehab estimator logic

- [x] Define `RehabItem` type: id, label, unitType, unitPrice, defaultQuantity, etc.
- [x] Implement `calculateRehabTotal(selectedItems: RehabItemSelection[]): number`.
- [x] Map rehab total into `RehabCost` for BRRRR and Flip (and optionally Buy & Hold).
- [x] Unit tests with example rehab bundles.
- [x] Catalog items across three classes of work (Rental Grade, Flip/Premium Grade, Retail Grade = Flip/Premium * 1.5x unless overridden) with preset quantities:
  - Flooring: LVP $4.50 / $6.50 (qty 1,000 sq ft), Carpet $3.00 / $4.50 (qty 1,000 sq ft), Bathroom tile $800 / $1,200 per bath.
  - Kitchen: Cabinets $5,000 / $8,000 per kitchen; Countertops $3,000 / $5,000 per kitchen; Appliance package $2,500 / $4,000 per set; Sink & faucet $400 / $700 per sink.
  - Bathrooms: Full reno $4,500 / $7,500 per bath; Vanity $600 / $1,200 per; Toilet $300 / $500 per; Mirror & light $200 / $400 per set.
  - General: Interior paint $1.50 / $2.50 per sq ft (qty 1,000); Drywall repair $0.50 / $0.80 per sq ft (qty 1,000); Wall prep $0.30 / $0.50 per sq ft (qty 1,000); Interior doors $250 / $350 (qty 6); Door knobs $35 / $65 (qty 6); Exterior doors $500 / $800 (qty 2); Windows $450 / $650 (qty 10); Blinds $50 / $80 (qty 10); Smoke/CO $35 / $35 (qty 4).
  - Infrastructure: Exterior paint $4,000 / $6,000; Roof $8,000 / $10,000; Siding/fascia $3,500 / $5,000; Electrical update $4,000 / $6,000; Plumbing update $3,500 / $5,000; Water heater $1,200 / $1,800; New AC $5,000 / $6,500; Furnace $4,500 / $5,500; Landscaping $2,000 / $3,500; Concrete/porch $2,500 / $4,000; Basement waterproofing $3,000 / $4,000.
  - Contingency/Custom: Contingency $2.00 / $3.00 per sq ft (qty 1,000); Custom Item 1 $0 / $0 user-fillable.

#### 2.6 Current vs future conditions timeline

- [x] Extend input types to include `isOccupied`, `currentMonthlyRent`, `monthsUntilTenantLeaves`, `rehabPlanned`, `rehabTiming`, `targetMonthlyRent` (relabeled), and optional `asIsValue`.
- [x] Implement timeline semantics: current condition → rehab (or zero-length) → stabilized; enforce rehab cannot start before tenant leaves when occupied.
- [x] Implement rent/expense rules across phases, including rent step-up-only path when `rehabPlanned = false`.
- [x] Implement property value/refinance timing for both rehab and no-rehab paths; anchor refinance month to `rehabEndMonth + 1` or `M_tenant + 1` when no rehab.
- [x] Unit tests for occupied + rehab-after-tenant, vacant + immediate rehab, and no-rehab rent step-up scenarios.

### 3. Front-end core structure

#### 3.1 App skeleton and routing

- [x] Implement basic layout:
  - [x] Header with brand logo/title.
  - [x] Navigation (Home, Analyzer, Admin).
- [~] Set up core routes:
  - [x] `/` – landing page.
  - [x] `/analyze` – main analysis view (strategy + tabs).
  - [ ] `/analysis/[id]` – load specific saved scenario.
  - [ ] `/s/[token]` – shared read-only view.
  - [x] `/admin` – admin dashboard.
  - [ ] `/admin/properties` – property DB management.

#### 3.2 Strategy selector and tab layout

- [x] Implement strategy selector (tabs or dropdown).
- [~] Implement tabbed form layout with sections:
  - [x] Property Details.
  - [x] Deal Details.
  - [x] Rehab Estimator.
  - [x] Rental Details.
  - [x] Financing.
  - [x] Results.
- [x] Ensure form state is shared across tabs.

#### 3.3 Input components and validation

- [~] Implement reusable input components:
  - [~] CurrencyField.
  - [~] PercentageField.
  - [x] NumberField.
  - [ ] SelectField.
- [ ] Add inline validation and error display.
- [ ] Add per-field tooltips/help text.

#### 3.4 Rental details advanced timeline UI

- [x] Add `Model current vs future conditions (advanced)` toggle with conditional fields for occupancy, current rent, months until tenant leaves, rehab planned, rehab timing, and as-is value.
- [x] Relabel stabilized rent field to `Target monthly rent after rehab / turnover`.
- [x] Disable “Immediately after purchase” rehab timing when the property is marked occupied; validate `monthsUntilTenantLeaves >= 0`.
- [x] Wire new fields into shared form state and debounce/submit flows.

### 4. Integrating calculator engine with UI

#### 4.1 Wire up calculations

- [x] On form state change:
  - [x] Collect inputs into appropriate `StrategyInputs` type.
  - [x] Pass to calculator engine.
  - [x] Store results in component state.
- [ ] Implement:
  - [ ] Manual “Recalculate” button (V1).
  - [~] Optional debounced auto-update (later).
- [x] Map current vs future timeline fields into calculator inputs and re-run calculations accordingly.

#### 4.2 Results display components

- [x] Implement SummaryCard:
  - [x] Display main KPIs (cash required, Year 1 cash flow, etc.).
- [x] Implement InvestmentAnalysisTable:
  - [x] Tabular view of yearly results.
- [~] Implement optional MonthlyScheduleView:
  - [~] Collapsible advanced section for month-by-month data.

### 5. Scenario persistence

#### 5.1 Backend: Analysis model and API

- [ ] Create `analyses` table with fields:
  - [ ] id, owner_id, strategy, property_id, name, input_payload, summary_payload, version, created_at, updated_at.
- [~] Implement API endpoints:
  - [~] `POST /api/analyses` – create new analysis.
  - [~] `GET /api/analyses/:id` – fetch single analysis.
  - [~] `GET /api/analyses` – list analyses (paginated, filtered).
  - [~] `PUT /api/analyses/:id` – update analysis.
  - [~] `DELETE /api/analyses/:id` – delete analysis.
- [ ] Persist current/future timeline fields, rehab timing choice, and as-is value in `input_payload` and summary projections.

#### 5.2 Front-end: scenario CRUD

- [~] Implement “Save analysis” button:
  - [~] Creates or updates analysis via API.
- [x] Implement “Save As / Duplicate” functionality:
  - [x] Calls `POST /api/analyses` with input_payload cloned from current.
- [~] Implement “My Analyses” list page:
  - [~] Table of saved analyses (name, strategy, property, date).
  - [~] Actions: open, duplicate, delete.
- [~] Ensure load/save flows hydrate the new timeline fields; add migration/default handling for legacy analyses.

### 6. Property database and autocomplete

#### 6.1 Backend: property model and API

- [ ] Create `properties` table with defined fields.
- [ ] Implement API endpoints:
  - [ ] `POST /api/properties` – create.
  - [ ] `GET /api/properties/:id` – read.
  - [ ] `GET /api/properties` – list (with filters).
  - [ ] `PUT /api/properties/:id` – update.
  - [ ] `DELETE /api/properties/:id` – delete.
  - [ ] `GET /api/properties/search?query=...` – autocomplete search.

#### 6.2 Backend: bulk import

- [ ] Implement `POST /api/properties/import`:
  - [ ] Accept CSV upload.
  - [ ] Parse and validate rows.
  - [ ] Insert valid rows; collect errors for invalid ones.
- [ ] Return:
  - [ ] Counts of imported vs failed rows.
  - [ ] Error messages keyed by row.

#### 6.3 Front-end: property admin UI

- [ ] Build `/admin/properties`:
  - [ ] Table of properties with search/filter.
  - [ ] Add/Edit form modal.
  - [ ] Bulk import UI with:
    - [ ] File upload control.
    - [ ] Column mapping (if needed).
    - [ ] Import results display.

#### 6.4 Front-end: address autocomplete in Analyzer

- [ ] Replace simple Address input with autocomplete control.
- [ ] On user input:
  - [ ] Call `GET /api/properties/search`.
  - [ ] Show dropdown of results.
- [ ] On select:
  - [ ] Fill property details in current form (sq ft, beds, baths, etc.).

### 7. Sharing and read-only views

#### 7.1 Backend: share link model and API

- [ ] Create `analysis_share_links` table:
  - [ ] id, analysis_id, token, snapshot_payload (JSON, optional), created_by, created_at, expires_at, is_revoked.
- [ ] Implement endpoints:
  - [ ] `POST /api/analyses/:id/share` – create share link.
  - [ ] `GET /api/shares/:token` – resolve token to snapshot or analysis id.
  - [ ] `POST /api/shares/:id/revoke` – revoke link.
  - [ ] (Optional) `PUT /api/shares/:id` – update expiration.

#### 7.2 Front-end: share link creation UI

- [~] On analysis view:
  - [x] Add “Share” button.
  - [ ] Modal offering:
    - [ ] Live vs Snapshot mode (if both implemented).
    - [ ] Expiration (optional).
  - [~] After creation:
    - [x] Show generated URL with “Copy” button.

#### 7.3 Front-end: shared view (/s/[token])

- [ ] Implement route `/s/[token]`.
- [ ] On load:
  - [ ] Fetch share data via `GET /api/shares/:token`.
- [ ] Render:
  - [ ] Read-only summary of inputs and outputs.
  - [ ] Investment Analysis table.
- [ ] Include occupancy/timeline details (current rent, tenant months, rehab timing, as-is value) in shared view.
- [ ] If viewer is logged-in owner:
  - [ ] Show actions:
    - [ ] “Open original analysis.”
    - [ ] “Duplicate into my workspace.”

### 8. PDF export

#### 8.1 Layout and implementation

- [ ] Design PDF layout (HTML/CSS):
  - [ ] Header, inputs, rehab summary, results table.
- [ ] Implement client-side PDF generation (e.g., using browser print or client PDF library).
- [ ] Add “Download PDF” button to:
  - [ ] Analysis view.
  - [ ] Shared view (if allowed).
- [ ] Ensure PDF includes current vs future timeline inputs and notes rehab timing/occupancy assumptions.

#### 8.2 Testing

- [ ] Validate PDF rendering across Chrome/Edge.
- [ ] Ensure fonts, currencies, and long tables behave correctly.

### 9. Admin and auth

#### 9.1 Authentication

- [ ] Implement simple auth:
  - [ ] Registration (or manual seeding) for Admin.
  - [ ] Login form.
  - [ ] Session handling (tokens/cookies).
- [ ] Guard:
  - [ ] `/admin` and admin APIs.
  - [ ] Analysis and property CRUD.

#### 9.2 Settings

- [ ] Implement `/admin/settings` page.
- [ ] Fields for defaults:
  - [ ] Vacancy, management, repairs, capex, lease-up, tax rate, insurance, etc.
- [ ] Persist settings (DB or configuration table).
- [ ] Apply defaults when creating new analysis.

### 10. Agent portal (V2/V3)

#### 10.1 Agent accounts and branding

- [ ] Extend users model:
  - [ ] Agent role.
  - [ ] Profile: name, photo URL, brokerage, phone, email, brand colors, logo URL.
- [ ] Implement `/agent` dashboard:
  - [ ] List of analyses owned by agent.
  - [ ] At-a-glance metrics.

#### 10.2 Agent-branded share pages

- [ ] Modify shared view header:
  - [ ] If analysis owner is an Agent:
    - [ ] Show agent logo, name, contact.
- [ ] Allow agent to configure:
  - [ ] Brand colors.
  - [ ] Header blurb.

#### 10.3 Client deal decks

- [ ] Create `clients` table and `client_analyses` linking table.
- [ ] UI:
  - [ ] Agent can create a client, then attach multiple analyses to that client.
  - [ ] Provide “Client share link” to a deck page listing analyses.
- [ ] Implement `/c/[clientToken]`:
  - [ ] Show cards for each analysis (read-only).
  - [ ] Link each card to `/s/[token]`.

### 11. AI features (V3+)

#### 11.1 Rehab from photos

- [ ] Design input format for photos (upload + metadata).
- [ ] Design mapping from AI output to rehab items.
- [ ] Stub endpoint: `POST /api/ai/rehab-from-photos`.
- [ ] UI:
  - [ ] “Analyze Photos” button on Rehab Estimator tab.
  - [ ] Results review and edit screen.

#### 11.2 Comps-based ARV and rent

- [ ] Design format for comps CSV upload or manual entry.
- [ ] Implement CSV parsing and normalization.
- [ ] Stub endpoint: `POST /api/ai/comps`.
- [ ] UI:
  - [ ] “Upload comps” modal.
  - [ ] Selected comps table.
  - [ ] ARV/rent suggestion view with “Use these values” button.

#### 11.3 Deal explanation and risk flags

- [ ] Stub endpoint: `POST /api/ai/explain-deal`:
  - [ ] Accept analysis snapshot.
  - [ ] Return narrative and flags.
- [ ] UI:
  - [ ] “Explain this deal” button on Results tab.
  - [ ] Render summary, risk list, and suggested sensitivity analyses.

### 12. Testing, QA, and validation

#### 12.1 Unit tests

- [~] Thorough tests for all calculator functions (Buy & Hold, BRRRR, Flip, Rehab).
- [~] Edge cases:
  - [ ] Zero rehab.
  - [ ] No bridge loan.
  - [~] Long vs short rehab periods.
  - [ ] High leverage and low down payment.
- [x] Occupied-to-rehab-after-tenant, vacant-immediate-rehab, and no-rehab rent step-up timelines (rent/expense/value/refi).

#### 12.2 Integration tests

- [ ] API tests for property and analysis CRUD.
- [ ] API tests for share links.

#### 12.3 Manual QA

- [ ] Cross-check results vs spreadsheets for several realistic deals.
- [ ] Run through primary user flows:
  - [ ] New analysis → save → share → view share.
  - [ ] Create property → use autocomplete → run analysis.

### 13. Documentation

- [ ] Developer README:
  - [ ] Setup steps.
  - [ ] Tech stack overview.
- [ ] Architecture overview:
  - [ ] Diagram of front-end, API, and DB.
- [ ] User guide:
  - [ ] How to run analyses and share results.
- [ ] FAQ:
  - [ ] Common modeling questions and how assumptions map to inputs.
