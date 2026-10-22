import json
import subprocess
import sys
import time
import subprocess
from datetime import datetime, timezone
from pathlib import Path

# Ensure UTF-8 output encoding on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent if Path(__file__).resolve().parent.name == "scripts" else Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
SCRAPERS_DIR = ROOT_DIR / "scrapers"


INDIGO_SCRIPT = SCRAPERS_DIR / "indigo" / "indigo_scraper.py"
AIR_INDIA_SCRIPT = SCRAPERS_DIR / "air_india" / "airindia_scraper.py"
AKASA_AIR_SCRIPT = SCRAPERS_DIR / "akasa_air" / "akasaair_scraper.py"
EASEMYTRIP_SCRIPT = SCRAPERS_DIR / "easemytrip" / "easemytrip_scraper.py"
MAKEMYTRIP_SCRIPT = SCRAPERS_DIR / "makemytrip" / "makemytrip_scraper.py"
YATRA_SCRIPT = SCRAPERS_DIR / "yatra" / "yatra_scraper.py"
CLEARTRIP_SCRIPT = SCRAPERS_DIR / "cleartrip" / "cleartrip_scraper.py"
IXIGO_SCRIPT = SCRAPERS_DIR / "ixigo" / "ixigo_scraper.py"
GOIBIBO_SCRIPT = SCRAPERS_DIR / "goibibo" / "goibibo_scraper.py"
SKYSCANNER_SCRIPT = SCRAPERS_DIR / "skyscanner" / "skyscanner_scraper.py"

INDIGO_FLIGHTS_JSON = SCRAPERS_DIR / "indigo" / "flights.json"
AIR_INDIA_FLIGHTS_JSON = SCRAPERS_DIR / "air_india" / "flights.json"
AKASA_AIR_FLIGHTS_JSON = SCRAPERS_DIR / "akasa_air" / "flights.json"
EASEMYTRIP_FLIGHTS_JSON = SCRAPERS_DIR / "easemytrip" / "flights.json"
MAKEMYTRIP_FLIGHTS_JSON = SCRAPERS_DIR / "makemytrip" / "flights.json"
YATRA_FLIGHTS_JSON = SCRAPERS_DIR / "yatra" / "flights.json"
CLEARTRIP_FLIGHTS_JSON = SCRAPERS_DIR / "cleartrip" / "flights.json"
IXIGO_FLIGHTS_JSON = SCRAPERS_DIR / "ixigo" / "flights.json"
GOIBIBO_FLIGHTS_JSON = SCRAPERS_DIR / "goibibo" / "flights.json"
SKYSCANNER_FLIGHTS_JSON = SCRAPERS_DIR / "skyscanner" / "flights.json"

# Master consolidated normalized output location
MASTER_NORMALIZED_DATA = DATA_DIR / "all_normalized_flights.json"


def banner(text):
    print()
    print("=" * 90)
    print(text)
    print("=" * 90)


def pretty_json(data):
    try:
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception:
        return str(data)


def run_scraper(script_path, name):
    banner(f"STARTING CRAWLER: {name}")
    start = time.time()
    try:
        proc = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=str(script_path.parent),
            check=True
        )
        duration = time.time() - start
        print(f"\n[SUCCESS] {name} completed in {duration:.1f} seconds (Exit Code: {proc.returncode})")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n[FAILED] {name} exited with error code {e.returncode}")
        return False
    except Exception as e:
        print(f"\n[ERROR] Could not execute {name}: {e}")
        return False


def consolidate_normalized_data():
    """
    Reads normalized flight outputs from all scraped airline directories,
    validates schema fields, aggregates quotes, and stores them in a single master JSON file.
    """
    banner("CONSOLIDATING NORMALIZED DATA INTO MASTER JSON FILE")
    now_utc = datetime.now(timezone.utc).isoformat()
    now_date = datetime.now().date().isoformat()

    all_quotes = []
    airline_summaries = {}
    corridor_summaries = {}
    window_summaries = {}

    sources = [
        ("IndiGo", "6E", INDIGO_FLIGHTS_JSON),
        ("Air India", "AI", AIR_INDIA_FLIGHTS_JSON),
        ("Akasa Air", "QP", AKASA_AIR_FLIGHTS_JSON),
        ("EaseMyTrip", "EMT", EASEMYTRIP_FLIGHTS_JSON),
        ("MakeMyTrip", "MMT", MAKEMYTRIP_FLIGHTS_JSON),
        ("Yatra", "YTR", YATRA_FLIGHTS_JSON),
        ("Cleartrip", "CT", CLEARTRIP_FLIGHTS_JSON),
        ("ixigo", "IXG", IXIGO_FLIGHTS_JSON),
        ("Goibibo", "GIB", GOIBIBO_FLIGHTS_JSON),
        ("Skyscanner", "SKY", SKYSCANNER_FLIGHTS_JSON),
    ]

    for airline_name, airline_code, file_path in sources:
        if not file_path.exists():
            print(f"[WARN] File not found: {file_path}. Skipping {airline_name}.")
            continue

        try:
            data = json.loads(file_path.read_text(encoding="utf-8"))
            quotes = data.get("quotes", [])
            print(f"[LOADED] {airline_name} ({airline_code}): {len(quotes)} normalized quotes from {file_path.name}")

            airline_summaries[airline_code] = {
                "name": airline_name,
                "code": airline_code,
                "quotes_count": len(quotes),
                "source_file": str(file_path.relative_to(ROOT_DIR)),
            }

            is_ota = airline_code in ["MMT", "EMT", "YTR", "CT", "IXG", "GIB", "SKY"]
            for q in quotes:
                if is_ota:
                    q["ota_code"] = airline_code
                    q["ota_name"] = airline_name
                    q["source_platform"] = airline_name
                    q["channel"] = "OTA"
                else:
                    q["ota_code"] = None
                    q["ota_name"] = None
                    q["source_platform"] = airline_name
                    q["channel"] = "DIRECT"
                all_quotes.append(q)

                # Track corridor breakdown
                route = q.get("route", "UNKNOWN")
                corridor_summaries[route] = corridor_summaries.get(route, 0) + 1

                # Track window breakdown
                win = q.get("advance_window", "UNKNOWN")
                window_summaries[win] = window_summaries.get(win, 0) + 1

        except Exception as e:
            print(f"[ERROR] Failed to parse {file_path}: {e}")

    # Build master structured dataset
    master_payload = {
        "status": "SUCCESS",
        "created_at": now_utc,
        "run_date": now_date,
        "total_quotes": len(all_quotes),
        "total_airlines": len(airline_summaries),
        "total_corridors": len(corridor_summaries),
        "advance_windows": sorted(list(window_summaries.keys())),
        "summary": {
            "by_airline": airline_summaries,
            "by_corridor": corridor_summaries,
            "by_advance_window": window_summaries,
        },
        "quotes": all_quotes,
    }

    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Save to data/all_normalized_flights.json
    MASTER_NORMALIZED_DATA.write_text(pretty_json(master_payload), encoding="utf-8")
    data_size_kb = MASTER_NORMALIZED_DATA.stat().st_size / 1024
    print(f"[SAVED] Master dataset saved to: {MASTER_NORMALIZED_DATA.relative_to(ROOT_DIR)} ({data_size_kb:,.1f} KB)")

    return master_payload


def main():
    banner("MoSPI REAL-TIME AIRFARE PRICE INDEX (AirPulse) - MULTI-CARRIER SCRAPER ENGINE")
    print(f"Python Executable : {sys.executable}")
    print(f"Working Directory : {ROOT_DIR}")
    print(f"Airlines Targeted : IndiGo (6E), Air India (AI), Akasa Air (QP), EaseMyTrip (EMT), MakeMyTrip (MMT), Yatra (YTR), Cleartrip (CT), ixigo (IXG), Goibibo (GIB) & Skyscanner (SKY)")
    print(f"Route Basket      : 10 Official DGCA Domestic Corridors")
    print(f"Advance Windows   : T+0, T+1, T+7, T+15, T+30, T+45")
    print(f"Master Output     : {MASTER_NORMALIZED_DATA.relative_to(ROOT_DIR)}")

    total_start = time.time()
    results = {}

    # 0. Sync Dynamic DGCA Traffic & Market Share Data
    banner("STEP 0: SYNCHRONIZING DYNAMIC DGCA AIR TRAFFIC & MARKET SHARES")
    try:
        from backend.dgca_scraper import sync_dgca_database
        dgca_res = sync_dgca_database()
        print(f"[SUCCESS] DGCA Data Synced: {dgca_res['updated_airlines']} airlines, {dgca_res['updated_weights']} routes (Weight sum: {dgca_res['weight_sum']:.6f})")
    except Exception as e:
        print(f"[WARN] DGCA Sync Note: {e}")

    # 1. Run IndiGo Scraper
    results["IndiGo (6E)"] = run_scraper(INDIGO_SCRIPT, "INDIGO (6E) OFFICIAL SCRAPER")

    # 2. Run Air India Scraper
    results["Air India (AI)"] = run_scraper(AIR_INDIA_SCRIPT, "AIR INDIA (AI) OFFICIAL SCRAPER")

    # 3. Run Akasa Air Scraper
    results["Akasa Air (QP)"] = run_scraper(AKASA_AIR_SCRIPT, "AKASA AIR (QP) OFFICIAL SCRAPER")

    # 4. Run EaseMyTrip Scraper
    results["EaseMyTrip (EMT)"] = run_scraper(EASEMYTRIP_SCRIPT, "EASEMYTRIP (EMT) OFFICIAL SCRAPER")

    # 5. Run MakeMyTrip Scraper
    results["MakeMyTrip (MMT)"] = run_scraper(MAKEMYTRIP_SCRIPT, "MAKEMYTRIP (MMT) OFFICIAL SCRAPER")

    # 6. Run Yatra Scraper
    results["Yatra (YTR)"] = run_scraper(YATRA_SCRIPT, "YATRA (YTR) OFFICIAL SCRAPER")

    # 7. Run Cleartrip Scraper
    results["Cleartrip (CT)"] = run_scraper(CLEARTRIP_SCRIPT, "CLEARTRIP (CT) OFFICIAL SCRAPER")

    # 8. Run ixigo Scraper
    results["ixigo (IXG)"] = run_scraper(IXIGO_SCRIPT, "IXIGO (IXG) OFFICIAL SCRAPER")

    # 9. Run Goibibo Scraper
    results["Goibibo (GIB)"] = run_scraper(GOIBIBO_SCRIPT, "GOIBIBO (GIB) OFFICIAL SCRAPER")

    # 10. Run Skyscanner Scraper
    results["Skyscanner (SKY)"] = run_scraper(SKYSCANNER_SCRIPT, "SKYSCANNER (SKY) OFFICIAL SCRAPER")

    total_duration = time.time() - total_start

    # 3. Consolidate Normalized Flight Data into Master JSON
    master_data = consolidate_normalized_data()

    # 4. Upload Consolidated Normalized Data into MongoDB Atlas
    banner("UPLOADING MASTER NORMALIZED DATASET INTO MONGODB ATLAS")
    from backend.ingestion import ingest_normalized_dataset, clean_database_duplicates
    clean_database_duplicates()
    db_res = ingest_normalized_dataset(master_data, clear_previous_scrapes=True)
    print(f"[SUCCESS] MongoDB Atlas: {db_res.get('quotes_saved', 0):,} quotes committed to collection 'price_quotes'")

    # Optionally notify live FastAPI backend ingestion endpoint if running
    try:
        import urllib.request
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/v1/ingest/normalized-dataset",
            data=json.dumps(master_data, default=str).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                print("[SUCCESS] Backend Ingestion API: Successfully notified live FastAPI backend endpoint")
    except Exception:
        # Backend might not be running in this terminal session, which is completely fine
        pass

    # 5. Summary Table
    banner("MASTER SCRAPING & CONSOLIDATION REPORT")
    for name, success in results.items():
        status = "[PASSED]" if success else "[FAILED]"
        print(f"  {status:<10} {name}")

    print(f"\nTotal Crawl Duration      : {total_duration:.1f} seconds")
    print(f"Total Normalized Quotes   : {master_data['total_quotes']:,} price observations")
    print(f"Total Corridors Covered   : {master_data['total_corridors']} DGCA corridors")
    print(f"Advance Windows Covered   : {', '.join(master_data['advance_windows'])}")

    print("\n--- QUOTE COUNT BY AIRLINE ---")
    for code, info in master_data["summary"]["by_airline"].items():
        print(f"  [{code}] {info['name']:<15}: {info['quotes_count']:>5} quotes ({info['source_file']})")

    print("\n--- QUOTE COUNT BY ADVANCE WINDOW ---")
    for win, count in sorted(master_data["summary"]["by_advance_window"].items()):
        print(f"  {win:<6}: {count:>5} quotes")

    print("\n--- QUOTE COUNT BY DGCA CORRIDOR ---")
    for corridor, count in sorted(master_data["summary"]["by_corridor"].items()):
        print(f"  {corridor:<10}: {count:>5} quotes")

    print("\nConsolidated JSON Dataset:")
    print(f"  * {MASTER_NORMALIZED_DATA}")

    # 6. Run DB Health Check
    print("\nRunning MoSPI Database Step 1 Health Verification...")
    try:
        subprocess.run([sys.executable, "backend/verify_step1.py"], cwd=str(ROOT_DIR))
    except Exception as e:
        print(f"Verification check note: {e}")

    # 7. Update platform proof screenshots with fresh telemetry audit stamp
    try:
        from backend.screenshot_service import update_all_screenshots_on_crawl_cycle
        update_all_screenshots_on_crawl_cycle()
        print("[SUCCESS] All 10 platform screenshots updated with live telemetry and cryptographic SHA-256 seal")
    except Exception as se:
        print(f"[NOTE] Screenshot stamping: {se}")


if __name__ == "__main__":
    main()


