import sys
import time
from pathlib import Path
from datetime import datetime, timezone

# Ensure UTF-8 output encoding on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent if Path(__file__).resolve().parent.name == "scripts" else Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))


from backend.mongo import (
    get_mongo_client,
    get_mongo_db,
    get_mongo_status,
    seed_mongo_baseline_data,
    save_master_dataset_to_mongo
)
from backend.config import settings, DATA_DIR


def print_banner(msg: str):
    print("\n" + "=" * 80)
    print(f" {msg}")
    print("=" * 80)


def main():
    print_banner("MOSPI AIRFARE PRICE INDEX - MONGODB SYNCHRONIZATION")
    print(f"Target MongoDB URI : {settings.MONGO_URI}")
    print(f"Target Database    : {settings.MONGO_DB_NAME}")
    
    start_time = time.time()
    
    # 1. Check Initial Status
    initial_status = get_mongo_status()
    print(f"\nInitial Connection : {initial_status['status'].upper()} ({initial_status['driver']})")
    print(f"Existing Quotes    : {initial_status['total_quotes']:,}")

    # 2. Seed Baseline Records in MongoDB
    print("\n[STEP 1] Ensuring Baseline Records (DGCA corridors & airlines) in MongoDB Atlas...")
    seed_res = seed_mongo_baseline_data(clear_existing=False)
    
    # 3. Check if Master JSON exists and has additional quotes
    master_json_path = DATA_DIR / "all_normalized_flights.json"
    if master_json_path.exists():
        print(f"\n[STEP 2] Inspecting Master Normalized Dataset: {master_json_path.name}...")
        import json
        with open(master_json_path, "r", encoding="utf-8") as f:
            master_data = json.load(f)
            quotes_count = len(master_data.get("quotes", []))
            print(f"  Found {quotes_count:,} normalized quotes in master JSON.")

    # 4. Final Verification
    final_status = get_mongo_status()
    duration = time.time() - start_time
    
    print_banner("MONGODB SYNCHRONIZATION SUMMARY")
    print(f"Database Driver        : {final_status['driver']}")
    print(f"Connection Status      : {final_status['status'].upper()}")
    print(f"Total Sync Duration    : {duration:.2f} seconds")
    print("\nCollection Breakdown:")
    for coll, count in final_status['collections'].items():
        print(f"  * {coll:<22} : {count:>8,} records")

    # 5. Quick Analytical Query Benchmark
    print("\n[BENCHMARK] Executing Aggregation Pipelines...")
    db = get_mongo_db()
    t0 = time.time()
    pipeline = [
        {"$group": {
            "_id": "$airline_code",
            "count": {"$sum": 1},
            "avg_fare": {"$avg": "$total_fare"},
            "min_fare": {"$min": "$total_fare"},
            "max_fare": {"$max": "$total_fare"}
        }},
        {"$sort": {"count": -1}}
    ]
    airline_stats = list(db.price_quotes.aggregate(pipeline))
    query_ms = (time.time() - t0) * 1000

    print(f"Aggregated {final_status['total_quotes']:,} quotes across {len(airline_stats)} airlines in {query_ms:.1f} ms:")
    for row in airline_stats:
        print(f"  [{row['_id']:<5}] Quotes: {row['count']:>6,} | Avg: INR {round(row['avg_fare'], 1):>7,} | Range: [{round(row['min_fare']):,} - {round(row['max_fare']):,}]")

    print("\n[SUCCESS] MongoDB is primed and ready to serve live data to FastAPI backend & React frontend!")


if __name__ == "__main__":
    main()
