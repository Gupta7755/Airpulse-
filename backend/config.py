import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
SNAPSHOTS_DIR = DATA_DIR / "snapshots"

# Ensure data directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    PROJECT_NAME: str = "Airpulse - MoSPI Real-time Airfare Price Index (AirPulse)"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # MongoDB Database Configuration (Primary & Exclusive Data Store)
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "apix_mospi")
    USE_MONGODB: bool = True

    # Scraper Scheduler Configuration (Default: 30 minutes)
    SCHEDULER_INTERVAL_MINUTES: int = int(os.getenv("SCHEDULER_INTERVAL_MINUTES", "30"))
    SCHEDULER_INTERVAL_HOURS: float = float(os.getenv("SCHEDULER_INTERVAL_HOURS", "0.5"))
    
    # Statistical Index Parameters
    BASE_INDEX_VALUE: float = 100.0
    BASE_PERIOD_LABEL: str = "2024-Q1"
    
    # Advance Purchase Windows monitored by MoSPI
    ADVANCE_WINDOWS: list[str] = ["T+0", "T+1", "T+7", "T+15", "T+30", "T+45"]
    
    # Outlier detection parameters (Interquartile Range multiplier)
    IQR_MULTIPLIER: float = 1.5

    # HTTP Basic Authentication
    API_AUTH_ENABLED: bool = os.getenv("API_AUTH_ENABLED", "true").lower() in ("true", "1", "yes")
    API_AUTH_USER: str = os.getenv("API_AUTH_USER", "admin")
    API_AUTH_PASS: str = os.getenv("API_AUTH_PASS", "airpulse_secure_2026")

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"


settings = Settings()

