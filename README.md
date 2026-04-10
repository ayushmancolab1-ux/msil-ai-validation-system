# MSIL AI-Enabled Validation System

An AI-powered tool that compares Assembly Drawings against Work Instruction Sheets (WIS) to detect deviations, score risk, and visualise results for automotive manufacturing quality teams.

## Tech Stack

- **Frontend**: React 18 + Vite + TailwindCSS + Recharts + React Router v6
- **Backend**: Python 3.11 + FastAPI + Uvicorn + pdfplumber + PyMuPDF + python-docx
- **Database**: SQLite via SQLAlchemy (`msil_demo.db` — no external DB needed)

## Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python data/seed.py        # generates synthetic data + seeds DB
uvicorn main:app --reload --port 8000
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev                # runs on localhost:5173
```

## Usage

1. Open http://localhost:5173
2. Upload an Assembly Drawing (PDF or DOCX) and a Work Instruction Sheet
3. Select Vehicle Model, Plant, and Component
4. Click "Run Validation" to start the comparison pipeline
5. View results on the Dashboard — deviations are scored Critical/High/Medium/Low
6. Explore Plant Heatmap, Trend Analysis, and Audit Reports from the sidebar

## Features

- **Drag-and-drop file upload** for PDF/DOCX drawings and WIS documents
- **Animated pipeline** showing Document Ingestion → Field Extraction → Cross-Reference Comparison → Risk Scoring
- **KPI Dashboard** with match rate, severity counts, and cost impact in Indian format (₹)
- **Deviation Detail** — side-by-side field comparison with drawing (master truth) vs WIS
- **Cross-Plant Heatmap** — CSS grid showing deviation severity across plants × components
- **Trend Analysis** — 12-month historical line chart showing AI impact on deviation reduction
- **Audit Reports** — filterable, exportable (CSV), printable deviation report

## Vehicles & Plants Covered

| Vehicle | Plants |
|---------|--------|
| Maruti Swift | Manesar, Gurugram |
| Maruti Brezza | Manesar, Gujarat |
| Maruti Dzire | Gurugram, Gujarat |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/upload/drawing | Upload assembly drawing |
| POST | /api/upload/wis | Upload WIS document |
| POST | /api/validate | Start validation run |
| GET | /api/validate/{run_id} | Get run results + deviations |
| GET | /api/dashboard/summary | Aggregate KPIs |
| GET | /api/dashboard/heatmap | Plant × component matrix |
| GET | /api/dashboard/trend | 12-month historical data |
| GET | /api/reports | List all validation runs |
| GET | /api/reports/{run_id}/export | Export deviations as CSV |
