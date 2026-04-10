# MSIL AI-Enabled Validation System — Presenter & Operator Guide

This guide explains every screen, number, and concept in the portal so you can confidently answer questions from any audience — engineering leads, quality managers, or plant operators.

---

## What the system does (one paragraph)

Maruti Suzuki engineers maintain two parallel documents for every component on every vehicle:
- **Assembly Drawing** — the master engineering truth (dimensions, torques, tolerances, surface finish, GD&T)
- **Work Instruction Sheet (WIS)** — the shop-floor operator guide that tells assembly technicians what to do

These two documents must stay in sync. In practice they drift: someone updates a torque spec on the drawing but forgets to update the WIS. That silent mismatch can cause safety issues (under-torqued brake calipers) or quality escapes.

This system automates the comparison. You upload both documents, select the vehicle/plant/component, and within seconds the AI produces a prioritised list of every field that does not match — scored Critical / High / Medium / Low — with estimated rework cost and a recommended action for each deviation.

---

## Tech at a glance

| Layer | Technology | Port |
|---|---|---|
| Frontend UI | React 18 + Vite + TailwindCSS + Recharts | localhost:5173 |
| Backend API | Python FastAPI + Uvicorn | localhost:8000 |
| Database | SQLite (`msil_demo.db`) | local file |
| AI Vision | OpenAI GPT-4.1 **or** Azure GPT-4.1 (toggle in UI) | external API |

---

## Screen-by-screen guide

### 1 — Upload (Home page)

**What users see:** Two drop-zones side by side, three dropdowns, an AI provider toggle, and a "Run Validation" button.

**Left drop-zone — Assembly Drawing**
- Accepts **images (PNG / JPG / WEBP)** — preferred for demo; the AI vision model reads it directly
- Also accepts PDF or DOCX (regex extraction used instead of AI vision)
- After a successful upload a green tick and image preview appear
- A teal badge shows "AI Vision Extraction Active" when an image is selected

**Right drop-zone — Work Instruction Sheet**
- Accepts **PDF or DOCX** only (WIS is always a text document)
- After upload shows filename and file size with a green tick

**Dropdowns**
- **Vehicle Model** — Maruti Swift / Maruti Brezza / Maruti Dzire
- **Plant** — Manesar / Gurugram / Gujarat
- **Component** — 8 options (Engine Mount Bracket, Brake Caliper Bolt Assembly, Suspension Strut Upper Mount, Steering Rack Mounting Bracket, Fuel Tank Strap Assembly, Exhaust Manifold Stud, Wheel Hub Bearing, Gearbox Crossmember)

**AI Provider toggle**
- **OpenAI** (default) — uses `gpt-4.1` via your OpenAI API key
- **Azure GPT-4.1** — uses your Azure OpenAI deployment (data stays in your Azure tenant)
- Buttons are greyed out if the corresponding key is missing from `backend/.env`

**Run Validation button**
- Disabled until both files are uploaded
- On click: uploads both files → calls `POST /api/validate` → redirects to the pipeline screen

---

### 2 — Validation Pipeline (Processing screen)

**What users see:** A 4-step animated progress bar with spinning indicators.

| Step | What is actually happening |
|---|---|
| Document Ingestion | Files saved to server, run record created in SQLite |
| Field Extraction (OCR + NLP) | If drawing is an image: GPT-4.1 Vision reads it and returns a structured JSON of all engineering specs. If PDF/DOCX: regex patterns extract torque, tolerances, Ra values, revision marks, part numbers. WIS is always regex-extracted. |
| Cross-Reference Comparison | Every extracted field from the Drawing is compared against the same field from the WIS. Numeric fields: deviation = |drawing − wis|, flagged if > threshold. String fields: flagged if different. |
| Risk Scoring & Classification | Each deviation is assigned Critical / High / Medium / Low based on the rule engine (safety-critical components get elevated severity). Cost impact is calculated. Results written to database. |

The screen polls `GET /api/validate/{run_id}` every 2 seconds. When `status = "complete"` it auto-redirects to the Dashboard.

---

### 3 — Dashboard (Main results)

**What users see:** 5 KPI tiles at top, a deviation table on the left, a donut chart on the right, and a bar chart at the bottom.

#### KPI Tiles

| Tile | What it means | How it is calculated |
|---|---|---|
| **Total Parameters** | How many engineering fields were actually compared in this run | Count of fields where both Drawing and WIS had a value |
| **Match Rate %** | What fraction of compared fields agreed within tolerance | `matched ÷ total_params × 100` |
| **Critical Deviations** | Safety-critical mismatches requiring immediate action | Count of deviations where severity = "Critical" |
| **High Deviations** | Dimensional mismatches exceeding engineering limits | Count where severity = "High" |
| **Cost Impact ₹** | Estimated rework cost if deviations reach production | Critical×₹45,000 + High×₹28,000 + Medium×₹12,000 + Low×₹4,000 |

> Hover the **ⓘ icon** next to any tile title for a plain-English explanation.

#### What is a "Critical" vs "High" vs "Medium" vs "Low" deviation?

| Severity | Trigger condition | Typical example |
|---|---|---|
| **Critical** | Torque deviation > 10% on brake / suspension / steering component | WIS says 45 Nm, Drawing says 65 Nm on Brake Caliper |
| **High** | Bore tolerance > 0.02 mm off, or gap tolerance > 0.05 mm off, or true position > 0.03 mm off | WIS says ±0.05, Drawing says ±0.02 |
| **Medium** | Ra surface finish differs by > 0.8 µm, or flatness/parallelism tolerance differs | WIS says Ra 3.2, Drawing says Ra 1.6 |
| **Low** | Revision letter mismatch, part number suffix mismatch, old tooling reference | WIS says Rev B, Drawing says Rev C |

#### Deviation Table
- Sortable by any column (click column header)
- Filter buttons: **All / Critical / High / Medium / Low**
- Columns: Component | Field | Drawing Value | WIS Value | Deviation Δ | Severity badge
- **"View Details"** button on each row → goes to Deviation Detail screen

#### Donut Chart (Severity Distribution)
- Shows proportion of Critical / High / Medium / Low deviations
- Centre number = total deviation count
- If no deviations exist the chart is replaced with a "No deviations found" message

---

### 4 — Deviation Detail

**What users see:** A side-by-side comparison card for a single deviation.

- **Left panel (Drawing — master truth):** All extracted fields with a **green highlight** on the deviating field
- **Right panel (WIS — current document):** Same fields with a **red highlight** and bold red value showing what the WIS says
- **Δ pill:** Shows the magnitude and percentage — e.g. "Δ 20 Nm (30.8% off)"
- **Severity badge + Recommendation text:** Plain-English action the QA engineer should take
- **Acknowledge button:** Marks the deviation as reviewed by "QA Engineer" (recorded in audit log with timestamp)

---

### 5 — Plant Heatmap

**What users see:** A grid — rows = 8 components, columns = 3 plants — where each cell is colour-coded by the worst deviation severity found for that plant × component combination across all historical runs.

| Cell colour | Meaning |
|---|---|
| Red | At least one Critical deviation found for this plant × component |
| Orange | Worst is High |
| Yellow | Worst is Medium |
| Green | Worst is Low |
| Grey | No deviations — full match |

The number inside each cell is the total deviation count. Hover for a breakdown tooltip.

**Key use case:** Shows cross-plant drift. Example: Swift Engine Mount at Manesar (Grey/Green) vs Gurugram (Orange/Red) proves the same component has different WIS quality at different plants.

---

### 6 — Trend Analysis

**What users see:** Two charts and three summary KPIs.

**Line chart — "Without AI" vs "With AI"**
- X-axis: 12 months (Jan – Dec)
- "Without AI" line: flat ~45 deviations/month (historical baseline before the system was deployed)
- "With AI" line: declining from ~45 → ~8 (showing continuous improvement as teams correct their WIS docs)
- A marker at Month 4 labelled "AI System Deployed"

**Bar chart — Monthly rework cost avoided (₹)**
- Each bar = rework cost that would have been incurred if deviations had reached production that month
- As deviation count falls, bars get shorter

**Summary KPIs**
- Total deviations caught over 12 months
- Total estimated rework cost avoided (₹ in Indian lakh format)
- Avg detection time improvement: 18 days → 1 day

---

### 7 — Audit Reports

**What users see:** A full-width table of every deviation across all runs, filter buttons, and export controls.

**Columns:** Run ID | Vehicle | Plant | Component | Field | Drawing Value | WIS Value | Severity | Cost Impact | Status (Acknowledged / Open) | Timestamp

**Controls:**
- **Filter buttons** (All / Critical / High / Medium / Low) — filter the table in-browser
- **Export CSV** — downloads a CSV of the current filtered view for the selected run
- **Print** — opens browser print dialog with a print-optimised layout

**Footer:** "Generated by MSIL AI Validation System | MSIL_DE_DX3 | Confidential"

---

## Data flow diagram (simplified)

```
User uploads:
  Assembly Drawing (image/PDF/DOCX)  →  /api/upload/drawing  →  uploads/drawings/{uuid}.png
  Work Instruction Sheet (PDF/DOCX)  →  /api/upload/wis      →  uploads/wis/{uuid}.docx

User clicks Run Validation:
  POST /api/validate  →  Creates ValidationRun in DB (status=processing)
                     →  Spawns background task:

Background task:
  Drawing extraction:
    If image  →  GPT-4.1 Vision API  →  structured JSON (all engineering specs)
    If PDF    →  pdfplumber + regex  →  structured JSON
    If DOCX   →  python-docx + regex →  structured JSON
    Always merges with seeded data for any missing fields

  WIS extraction:
    PDF/DOCX  →  regex extraction  →  structured JSON
    Merges with seeded WIS data (torque, tolerances, revisions only — NOT raw dimensions)

  Comparison (comparator.py):
    For each numeric field: deviation = |drawing_val − wis_val|
    Apply threshold from rule_engine.py → assign severity
    Safety-critical components (brake/steering/suspension): torque >10% off → always Critical

  Scoring (scorer.py):
    Assign cost_impact_inr: Critical=45000, High=28000, Medium=12000, Low=4000

  Write Deviation records to SQLite
  Update ValidationRun status → "complete"

Frontend polls GET /api/validate/{run_id} every 2s → auto-redirects on complete
```

---

## Frequently asked questions

**Q: Why does the match rate sometimes show as less than 100% even for a "correct" WIS?**
A: The system compares against the Drawing as the master truth. If the seeded WIS data for a vehicle/component has any intentional deviations (built in for demo purposes), or the WIS DOCX you uploaded has different values, those will be flagged. A real production deployment would use the actual WIS document.

**Q: What are "seeded deviations" in the demo data?**
A: The database is pre-populated with synthetic data covering 3 vehicles × 3 plants × 8 components = 72 component sets. Each set has deliberate mismatches injected: 6 Critical torque errors, 12 High dimensional errors, 18 Medium surface finish errors, 24 Low revision mismatches. These power the Heatmap and Trend charts without needing real uploads.

**Q: What happens if I upload a real drawing but the LLM API key is not set?**
A: The system falls back gracefully to the pre-seeded JSON data for that vehicle/component combination, so the demo always produces results. A yellow banner in the AI Provider toggle warns that no key is configured.

**Q: Why is the drawing the "master truth" and not the WIS?**
A: Assembly drawings are authored by Design Engineering and go through a formal approval cycle (Rev A → B → C with sign-off). WIS documents are authored by Manufacturing Engineering and can lag behind. Any divergence means the shop floor may be assembling to an outdated or incorrect specification.

**Q: What is the cost impact calculation based on?**
A: Conservative industry estimates for Indian automotive assembly — the cost of detecting a deviation at the shop floor (rework, re-inspection, potential field recall escalation) vs detecting it at the document review stage. The multipliers are: Critical ₹45,000 · High ₹28,000 · Medium ₹12,000 · Low ₹4,000 per deviation per production run.

**Q: Can this be used for other vehicle models?**
A: Yes. The rule engine (`backend/engine/rule_engine.py`) stores thresholds keyed by vehicle model. New models can be added by adding a new threshold dict entry and new seeded data files following the naming pattern `maruti_{model}_{plant}_{component}.json`.

**Q: What is the difference between OpenAI and Azure GPT-4.1 in the toggle?**
A: Same model, different hosting. OpenAI = model runs on OpenAI's infrastructure. Azure = model runs inside your Azure subscription, which means your drawing data never leaves your Azure tenant — important for confidential engineering documents. Switch using the toggle on the Upload page; the backend reads from `backend/.env`.

---

## Demo script (5-minute walkthrough)

1. **Open** `http://localhost:5173` → land on Upload page
2. **Drop** the Assembly Drawing image (e.g. Engine Mount Bracket image) into the left zone
3. **Drop** `WIS_Engine_Mount_Bracket_SW_0421_RevB.docx` into the right zone
4. **Select:** Maruti Swift · Manesar · Engine Mount Bracket (Front LH)
5. **Choose AI provider:** OpenAI (or Azure if configured)
6. **Click Run Validation** — watch the 4-step animated pipeline
7. **Dashboard** auto-loads — point out:
   - Critical deviation: `primary_torque_nm` Drawing=65 Nm, WIS=45 Nm (Δ 30.8%)
   - High deviation: `bore_tolerance_mm` Drawing=0.02, WIS=0.05
   - Medium: `Ra_value` 1.6 vs 3.2
   - Low: revision B vs C
8. **Click "View Details"** on the torque row → show side-by-side red/green diff
9. **Click Acknowledge** → status changes to "Reviewed"
10. **Sidebar → Plant Heatmap** → show cross-plant drift
11. **Sidebar → Trend Analysis** → show 12-month AI impact curve
12. **Sidebar → Audit Reports** → export CSV

---

## Key files reference

| File | What it does |
|---|---|
| `backend/engine/llm_agent.py` | Calls GPT-4.1 Vision API to extract engineering specs from drawing images |
| `backend/engine/extractor.py` | Routes files to LLM or regex; merges with seeded data |
| `backend/engine/comparator.py` | Field-by-field comparison logic; defines NUMERIC_FIELDS, STRING_FIELDS |
| `backend/engine/rule_engine.py` | Tolerance thresholds per vehicle model |
| `backend/engine/scorer.py` | Maps severity → cost impact in INR |
| `backend/data/seed.py` | Generates all synthetic JSON + seeds the SQLite database (run once) |
| `backend/.env` | API keys — OPENAI_API_KEY and AZURE_OPENAI_* — fill in before use |
| `frontend/src/pages/Home.jsx` | Upload page with LLM toggle and image preview |
| `frontend/src/pages/Dashboard.jsx` | Main results page — KPIs, deviation table, donut chart |
| `frontend/src/pages/PlantHeatmap.jsx` | Cross-plant deviation grid (pure CSS, no 3rd-party library) |
| `frontend/src/pages/TrendView.jsx` | 12-month trend charts |
| `frontend/src/pages/AuditReport.jsx` | Printable/exportable audit table |
| `WIS_Engine_Mount_Bracket_SW_0421_RevB.docx` | Ready-to-use demo WIS with intentional deviations |
