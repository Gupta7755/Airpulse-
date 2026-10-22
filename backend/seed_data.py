import sys
import json
import random
from datetime import datetime, timezone, timedelta, date
from pathlib import Path

# Enforce UTF-8 stdout if supported
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
DATA_DIR = BASE_DIR / "data"

from backend.mongo import (
    get_mongo_db,
    seed_mongo_baseline_data,
    save_master_dataset_to_mongo,
    save_audit_log_to_mongo,
)
from backend.dgca_data import AIRLINES_DATA, DGCA_ROUTES_DATA
from backend.config import settings


def seed_database():
    print("[INIT] Initializing MongoDB Atlas collections...")
    db = get_mongo_db()

    # 1. Seed DGCA Routes and Airlines
    seed_res = seed_mongo_baseline_data(clear_existing=False)
    print(f"[OK] Seeded {seed_res['routes_seeded']} routes and {seed_res['airlines_seeded']} airlines in MongoDB.")

    # 2. Ingest Master Flight Quotes Dataset
    normalized_file = DATA_DIR / "all_normalized_flights.json"
    if normalized_file.exists():
        print("[2/3] Loading Master Normalized Flight Quotes...")
        with open(normalized_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        mongo_res = save_master_dataset_to_mongo(data)
        print(f"[OK] Master dataset committed: {mongo_res.get('quotes_saved', 0):,} quotes in MongoDB.")

    # 3. Seed Audit Logs if empty
    if db.scraper_audit_logs.count_documents({}) == 0:
        print("[3/3] Seeding Scraper Resilience Audit Logs...")
        statuses = [
            ("SUCCESS", 200, 1850, 42),
            ("SUCCESS", 200, 2100, 38),
            ("SUCCESS", 200, 1620, 45),
            ("CAPTCHA_BYPASSED", 200, 4800, 40),
            ("SUCCESS", 200, 1950, 44),
            ("BLOCKED_CLOUDFLARE_RECOVERED", 200, 5200, 36),
        ]
        sample_logs = []
        for a in AIRLINES_DATA:
            for route_code in ["DEL-BOM", "DEL-BLR", "BOM-BLR", "DEL-CCU"]:
                status, http_code, latency, count = random.choice(statuses)
                ts = datetime.now(timezone.utc) - timedelta(minutes=random.randint(5, 720))
                sample_logs.append({
                    "scraper_id": f"{a['code']}_{route_code}",
                    "airline_code": a["code"],
                    "route_code": route_code,
                    "status": status,
                    "http_status": http_code,
                    "latency_ms": latency + random.randint(-150, 250),
                    "quotes_extracted": count,
                    "proxy_ip": f"103.25.{random.randint(10, 250)}.{random.randint(1, 254)}",
                    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "timestamp": ts.isoformat(),
                    "created_at": ts.isoformat()
                })
        if sample_logs:
            db.scraper_audit_logs.insert_many(sample_logs)
            print(f"[OK] Created {len(sample_logs)} crawler audit records in MongoDB.")

    print("[SUCCESS] MongoDB Atlas setup and data seeding completed successfully!")


if __name__ == "__main__":
    seed_database()


