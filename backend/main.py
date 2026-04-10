import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env before anything else so all env vars are available
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
from routes import upload, validate, reports, dashboard

app = FastAPI(
    title="MSIL AI-Enabled Validation System",
    version="2.0.0",
    description=(
        "AI-powered drawing vs WIS validation system for Maruti Suzuki India Limited. "
        "Supports image assembly drawings analyzed via Azure GPT-4.1 or OpenAI GPT-4.1 vision."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(validate.router, prefix="/api/validate", tags=["Validate"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])

UPLOADS_DIR = Path(__file__).parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "drawings").mkdir(exist_ok=True)
(UPLOADS_DIR / "wis").mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "MSIL Validation API", "version": "2.0.0"}


@app.get("/api/config/llm")
def get_llm_config():
    """
    Return which LLM providers are currently configured (keys present in .env).
    The frontend uses this to know which toggle options are available.
    """
    openai_ready = bool(os.getenv("OPENAI_API_KEY", "").strip())
    azure_ready = bool(
        os.getenv("AZURE_OPENAI_API_KEY", "").strip()
        and os.getenv("AZURE_OPENAI_ENDPOINT", "").strip()
    )
    return {
        "openai": {
            "available": openai_ready,
            "model": os.getenv("OPENAI_MODEL", "gpt-4.1"),
        },
        "azure": {
            "available": azure_ready,
            "model": os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4.1"),
            "endpoint": os.getenv("AZURE_OPENAI_ENDPOINT", ""),
        },
        "default_provider": "azure" if azure_ready else "openai",
    }
