## Off Leash Deal Analyzer (MVP)

Next.js + TypeScript app with PRD 6.X timeline-aware calculators (Buy & Hold, BRRRR, Flip), rehab estimator, and hospitality-inspired UI.

### Run locally
```bash
npm install
npm run dev
# open http://localhost:3000
```
Static checks / build:
```bash
npm run lint
npm run build
```

### Environment
- Copy `.env.example` to `.env.local` and adjust values (e.g., `NEXT_PUBLIC_API_BASE_URL`, default uses current origin) when backend endpoints are introduced.
- Secrets are not required for the current MVP; environment variables are scoped for future API/analytics wiring.

### Feature highlights
- Strategy selector: Buy & Hold, BRRRR (bridge → refi), Flip (bridge → sale).
- PRD 6.X timeline: current vs future rent, rehab timing after tenant, ARV/refi month alignment.
- Rehab estimator: Rental/Flip/Retail (retail = 1.5x flip), line items, optional inclusion in cash required.
- Scenario save/load/share: localStorage + sharable URL payload.
- Deal summaries and tables tailored per strategy.

### Test / deploy readiness
- Local smoke: `npm run dev`, `npm run build`, `npm run lint`.
- No secrets required; `.env` not needed for current MVP.
- Ready for drop-in deploy on Vercel/Netlify/TiinyHost (static/edge).

### Notes
- BRRRR/Flip engines implemented; validate against spreadsheet/PRD before GA.
