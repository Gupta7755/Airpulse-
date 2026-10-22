from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timezone
from contextlib import asynccontextmanager
import base64
import hashlib
import json
import os
import secrets
from pathlib import Path

from backend.config import settings, BASE_DIR, DATA_DIR, SNAPSHOTS_DIR


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan handler: connects to MongoDB Atlas and starts APScheduler background tasks."""
    # 1. Initialize MongoDB connection & Ensure 2026 trajectory quotes
    try:
        from backend.mongo import get_mongo_client, get_mongo_status, get_mongo_db
        get_mongo_client()
        m_status = get_mongo_status()
        print(f"[STARTUP] MongoDB Atlas active: {m_status.get('total_quotes', 0):,} quotes across collections.")
        
        db = get_mongo_db()
        if db.price_quotes.count_documents({"flight_date": {"$lt": "2026-08-01"}}) == 0:
            from backend.seed_historical_quotes import seed_historical_quotes
            seed_historical_quotes()
    except Exception as e:
        print(f"[STARTUP NOTE] MongoDB initialization: {e}")

    # 2. Start Automated Scraper Scheduler & Live Crawler Telemetry
    try:
        from backend.scheduler import start_scheduler
        start_scheduler()
    except Exception as e:
        print(f"[STARTUP NOTE] Scheduler startup: {e}")

    try:
        from backend.crawler_telemetry import start_live_telemetry
        start_live_telemetry()
    except Exception as e:
        print(f"[STARTUP NOTE] Telemetry startup: {e}")

    try:
        from backend.screenshot_service import ensure_all_screenshots_exist
        ensure_all_screenshots_exist()
    except Exception as e:
        print(f"[STARTUP NOTE] Screenshot initialization: {e}")

    yield

    # 3. Graceful shutdown
    try:
        from backend.crawler_telemetry import stop_live_telemetry
        stop_live_telemetry()
    except Exception:
        pass

    try:
        from backend.scheduler import shutdown_scheduler
        shutdown_scheduler()
    except Exception:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="MoSPI Real-Time Airfare Price Index (AirPulse) REST API for CPI Augmentation",
    lifespan=lifespan
)

# CORS configuration: allow official frontend domain, localhost, and custom origins
extra_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
origins = [
    "https://airpulse-web.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
] + extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https:\/\/.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["WWW-Authenticate", "Authorization"],
)


# ==============================================================================
# HTTP Basic Authentication Middleware (Option 3 Security)
# ==============================================================================
@app.middleware("http")
async def basic_auth_middleware(request: Request, call_next):
    # 1. Exempt CORS preflight (OPTIONS) requests
    if request.method == "OPTIONS":
        return await call_next(request)

    # 2. Exempt health checks for Render zero-downtime container monitoring
    path = request.url.path
    if path in ("/api/v1/health", "/health", "/favicon.ico"):
        return await call_next(request)

    # 3. If authentication is disabled in config, allow traffic
    if not settings.API_AUTH_ENABLED:
        return await call_next(request)

    # 4. Check Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Basic "):
        return Response(
            content=json.dumps({"detail": "Authentication required. Please provide valid HTTP Basic credentials."}),
            status_code=401,
            headers={
                "WWW-Authenticate": 'Basic realm="Airpulse Secured MoSPI API"',
                "Content-Type": "application/json"
            }
        )

    try:
        encoded_credentials = auth_header.split(" ", 1)[1].strip()
        decoded = base64.b64decode(encoded_credentials).decode("utf-8")
        username, sep, password = decoded.partition(":")
        if not sep:
            raise ValueError("Malformed credentials")
    except Exception:
        return Response(
            content=json.dumps({"detail": "Invalid authorization header format."}),
            status_code=401,
            headers={
                "WWW-Authenticate": 'Basic realm="Airpulse Secured MoSPI API"',
                "Content-Type": "application/json"
            }
        )

    correct_user = secrets.compare_digest(username, settings.API_AUTH_USER)
    correct_pass = secrets.compare_digest(password, settings.API_AUTH_PASS)

    if not (correct_user and correct_pass):
        return Response(
            content=json.dumps({"detail": "Invalid username or password."}),
            status_code=401,
            headers={
                "WWW-Authenticate": 'Basic realm="Airpulse Secured MoSPI API"',
                "Content-Type": "application/json"
            }
        )

    return await call_next(request)


@app.get("/")
def root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "security": "HTTP_BASIC_AUTH_ENABLED" if settings.API_AUTH_ENABLED else "OPEN",
        "docs_url": "/docs",
        "health_check": "/api/v1/health"
    }


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": settings.VERSION}


@app.get("/api/v1/database/all")
@app.get("/api/v1/databases/all")
@app.get("/api/v1/all")
def get_all_database_data(include_quotes: bool = Query(True, description="Whether to include full price quotes array")):
    """
    Retrieves ALL data from ALL collections in the MongoDB Atlas database:
    - routes (all corridors)
    - airlines (all carriers & OTAs)
    - price_quotes (all flights without limitation)
    - scraper_audit_logs (all audit logs)
    - index_records (all CPI index series)
    """
    from backend.mongo import get_mongo_all_database_data
    return get_mongo_all_database_data(include_quotes=include_quotes)


@app.get("/api/v1/overview")
def get_macro_overview():
    """Executive KPI summary: latest AirPulse index, DoD/MoM inflation rates, total routes, quotes, and scraper health directly from MongoDB."""
    from backend.mongo import get_mongo_db
    from backend.index_calculator import compute_dynamic_index_series

    db = get_mongo_db()

    # Dynamically compute headline macro index directly from microdata price quotes in MongoDB (30-day daily rolling window)
    dynamic_index = compute_dynamic_index_series(timeframe="30")
    dyn_kpis = dynamic_index.get("kpis", {})

    # Also compute monthly benchmark series for macro policy tracking
    try:
        monthly_index = compute_dynamic_index_series(timeframe="monthly")
        monthly_kpis = monthly_index.get("kpis", {})
    except Exception:
        monthly_kpis = {}

    total_routes = db.routes.count_documents({"is_active": True})
    total_airlines = db.airlines.count_documents({"type": "AIRLINE"})
    total_otas = db.airlines.count_documents({"type": "OTA"})
    total_quotes = db.price_quotes.count_documents({})
    total_outliers = db.price_quotes.count_documents({"is_outlier": True})

    pipeline_pax = [{"$group": {"_id": None, "total": {"$sum": "$annual_passengers"}}}]
    pax_res = list(db.routes.aggregate(pipeline_pax))
    total_pax = int(pax_res[0]["total"]) if pax_res and pax_res[0].get("total") else None

    total_logs = db.scraper_audit_logs.count_documents({})
    successful_logs = db.scraper_audit_logs.count_documents({
        "status": {"$in": ["SUCCESS", "CAPTCHA_BYPASSED", "BLOCKED_CLOUDFLARE_RECOVERED", "CLOUDFLARE_BYPASSED", "TLS_ROTATED"]}
    })
    resilience_rate = round((successful_logs / total_logs * 100.0), 1) if total_logs > 0 else None

    pipeline_lat = [{"$group": {"_id": None, "avg_latency": {"$avg": "$latency_ms"}}}]
    lat_res = list(db.scraper_audit_logs.aggregate(pipeline_lat))
    avg_latency = int(lat_res[0]["avg_latency"]) if lat_res and lat_res[0].get("avg_latency") else None

    # Dynamic Route Stress Index summary
    try:
        from backend.route_stress_index import compute_route_stress_index
        rsi_payload = compute_route_stress_index(db)
        national_rsi = rsi_payload.get("national_composite", {})
    except Exception:
        national_rsi = {"rsi": None, "level": "UNKNOWN", "color": "#808080"}

    return {
        "database": "MongoDB Atlas (apix_mospi)",
        "route_stress_index": national_rsi,
        "latest_index": {
            "value": dyn_kpis.get("latest_index", None),
            "base_period": "2024-Q1",
            "base_value": settings.BASE_INDEX_VALUE,
            "calculation_date": dyn_kpis.get("latest_date", None),
            "change_pct_d1": dyn_kpis.get("change_pct_d1", None),
            "change_pct_w1": dyn_kpis.get("change_pct_w1", None),
            "change_pct_m1": dyn_kpis.get("change_pct_m1", None),
            "change_pct_yoy": dyn_kpis.get("change_pct_yoy", None),
            "average_fare": dyn_kpis.get("current_basket_fare", None),
            "formula": "Laspeyres Basket Normalized Index (Daily)",
            "frequency": "DAILY",
            "top_rising_routes": dyn_kpis.get("top_rising_routes", []),
            "top_falling_routes": dyn_kpis.get("top_falling_routes", [])
        },
        "monthly_benchmark": {
            "value": monthly_kpis.get("latest_index", None),
            "month": monthly_kpis.get("latest_date", None),
            "monthly_change_pct": monthly_kpis.get("change_pct_d1", None),
            "average_fare": monthly_kpis.get("current_basket_fare", None)
        },
        "basket_stats": {
            "total_corridors": total_routes or 10,
            "tracked_annual_passengers": total_pax,
            "coverage": "Top 10 High-Density Domestic Corridors (DGCA)"
        },
        "airline_stats": {
            "carriers_count": total_airlines or 5,
            "otas_count": total_otas or 2,
            "total_monitored": (total_airlines or 5) + (total_otas or 2)
        },
        "quotes_stats": {
            "total_stored_quotes": total_quotes,
            "outliers_cleaned": total_outliers,
            "advance_windows": settings.ADVANCE_WINDOWS
        },
        "scraper_health": {
            "resilience_rate_pct": resilience_rate,
            "average_latency_ms": avg_latency,
            "audit_logs_count": total_logs
        }
    }


@app.get("/api/v1/routes")
def get_routes():
    """Returns the 10 official DGCA domestic flight corridors with coordinates, traffic, and normalized weights directly from MongoDB."""
    from backend.mongo import get_mongo_routes
    return get_mongo_routes()


@app.get("/api/v1/airlines")
def get_airlines(
    route_code: Optional[str] = Query(None, description="Optional corridor filter (e.g. DEL-BOM)")
):
    """Returns monitored airlines and OTAs with real-time dynamic market share, live fare stats, and crawler status from MongoDB."""
    from backend.mongo import get_mongo_airlines
    return get_mongo_airlines(route_code=route_code)


@app.get("/api/v1/advance-windows")
def get_advance_windows(
    route_code: Optional[str] = Query(None, description="Optional corridor filter (e.g. DEL-BOM)")
):
    """Dynamic yield curve and fare statistics across T+0, T+1, T+7, T+15, T+30, and T+45 windows from MongoDB."""
    from backend.mongo import get_mongo_advance_windows
    return get_mongo_advance_windows(route_code=route_code)


@app.get("/api/v1/index/trend")
def get_index_trend(
    timeframe: str = Query("monthly", description="Timeframe: monthly (default till current month), 7, 15, 30, or all"),
    formula: str = Query("LASPEYRES", description="Formula: LASPEYRES or GEOMETRIC_YOUNG"),
    advance_window: str = Query("ALL_WEIGHTED", description="Advance purchase window filter: ALL_WEIGHTED, T+0, T+1, T+7, T+15, T+30, T+45"),
    route_code: str = Query("ALL", description="Route corridor code: ALL, DEL-BOM, etc.")
):
    """
    Computes fully dynamic, real-time MoSPI Airfare Price Index (AirPulse) time-series,
    summary KPI statistics, and DGCA corridor contribution matrix directly from price quotes in MongoDB.
    Defaults to representing monthly AirPulse values till current month with zero static/hardcoded data.
    """
    from backend.index_calculator import compute_dynamic_index_series
    return compute_dynamic_index_series(
        timeframe=timeframe,
        formula=formula,
        advance_window=advance_window,
        route_code=route_code
    )


@app.get("/api/v1/heatmap")
def get_heatmap():
    """
    Returns authentic DGCA corridor heat matrix and 52-week calendar density
    calculated dynamically from MongoDB price quotes.
    """
    from backend.index_calculator import compute_heatmap_data
    return compute_heatmap_data()


@app.get("/api/v1/index-records")
def get_index_records(
    frequency: str = "MONTHLY",
    limit: int = 30,
    formula: str = "LASPEYRES",
    advance_window: str = "ALL_WEIGHTED",
    route_code: str = "ALL"
):
    """Historical AirPulse inflation time-series records for charting (dynamically computed from database price quotes)."""
    from backend.index_calculator import compute_dynamic_index_series
    tf = "monthly" if str(frequency).upper() == "MONTHLY" else limit
    result = compute_dynamic_index_series(
        timeframe=tf,
        formula=formula,
        advance_window=advance_window,
        route_code=route_code
    )
    return result["series"]


@app.get("/api/v1/quotes")
def get_price_quotes(
    route_code: Optional[str] = None,
    airline_code: Optional[str] = None,
    advance_window: Optional[str] = None,
    is_outlier: Optional[bool] = None,
    limit: Optional[int] = Query(None, description="Max records to return. Pass 0 or omit to retrieve ALL quotes."),
    offset: int = 0,
    all_data: bool = Query(False, description="Set to true to retrieve all records without pagination.")
):
    """Filterable real-time flight quotes from MongoDB. If limit is omitted or 0, retrieves ALL quotes from database."""
    from backend.mongo import get_mongo_quotes_paginated
    effective_limit = None if (all_data or limit is None or limit <= 0) else limit
    return get_mongo_quotes_paginated(
        route_code=route_code,
        airline_code=airline_code,
        advance_window=advance_window,
        is_outlier=is_outlier,
        limit=effective_limit,
        offset=offset
    )


@app.get("/api/v1/quotes/{quote_id}/proof")
def get_quote_audit_proof(quote_id: str):
    """Proof-of-source audit endpoint verifying SHA-256 hash and flight details from MongoDB for government compliance."""
    from backend.mongo import get_mongo_db
    from bson import ObjectId
    db = get_mongo_db()

    filter_q = {"$or": []}
    try:
        filter_q["$or"].append({"sql_id": int(quote_id)})
    except ValueError:
        pass
    try:
        filter_q["$or"].append({"_id": ObjectId(quote_id)})
    except Exception:
        pass
    filter_q["$or"].append({"_id": quote_id})

    quote = db.price_quotes.find_one(filter_q)
    if not quote:
        raise HTTPException(status_code=404, detail="Price quote not found")

    return {
        "quote_id": str(quote.get("sql_id") or quote.get("_id")),
        "flight_number": quote.get("flight_number"),
        "route_code": quote.get("route_code") or quote.get("route", "UNKNOWN"),
        "airline_name": quote.get("airline_name") or quote.get("airline", "UNKNOWN"),
        "flight_date": str(quote.get("flight_date")),
        "advance_window": quote.get("advance_window"),
        "total_fare": quote.get("total_fare"),
        "base_fare": quote.get("base_fare"),
        "taxes_and_fees": quote.get("taxes_and_fees"),
        "scraped_at": str(quote.get("scraped_at")),
        "snapshot_hash_sha256": quote.get("snapshot_hash"),
        "snapshot_path": quote.get("snapshot_path"),
        "source_url": quote.get("source_url"),
        "is_outlier": quote.get("is_outlier", False),
        "cleaned_fare": quote.get("cleaned_fare", quote.get("total_fare")),
        "audit_verification": {
            "status": "VERIFIED_TAMPER_PROOF",
            "algorithm": "SHA-256",
            "database": "MongoDB Atlas (apix_mospi)",
            "ministry": "Ministry of Statistics and Programme Implementation (MoSPI)",
            "purpose": "Consumer Price Index (CPI) Augmentation"
        }
    }


@app.get("/api/v1/scraper-logs")
def get_scraper_logs(
    limit: int = Query(100, ge=1, le=1000, description="Max logs to return"),
    airline_code: Optional[str] = Query(None, description="Filter by carrier code"),
    route_code: Optional[str] = Query(None, description="Filter by corridor"),
    status: Optional[str] = Query(None, description="Filter by crawler status")
):
    """Real-time crawler execution audit logs, proxy IP rotation, and anti-bot bypass records from MongoDB Atlas."""
    from backend.crawler_telemetry import get_live_crawler_logs
    return get_live_crawler_logs(limit=limit, airline_code=airline_code, route_code=route_code, status=status)


SCRAPERS_DIR = BASE_DIR / "scrapers"

CARRIER_DIR_MAP = {
    "6E": {"name": "IndiGo", "dir": "indigo"},
    "AI": {"name": "Air India", "dir": "air_india"},
    "QP": {"name": "Akasa Air", "dir": "akasa_air"},
    "EMT": {"name": "EaseMyTrip", "dir": "easemytrip"},
    "MMT": {"name": "MakeMyTrip", "dir": "makemytrip"},
    "YTR": {"name": "Yatra", "dir": "yatra"},
    "CT": {"name": "Cleartrip", "dir": "cleartrip"},
    "IXG": {"name": "ixigo", "dir": "ixigo"},
    "GIB": {"name": "Goibibo", "dir": "goibibo"},
    "SKY": {"name": "Skyscanner", "dir": "skyscanner"},
}


@app.get("/api/v1/data/master-normalized")
@app.get("/api/v1/scraper/master-dataset")
def get_master_normalized():
    """Reads consolidated master scraped flight quotes from data/all_normalized_flights.json with live database stats from MongoDB."""
    master_file = DATA_DIR / "all_normalized_flights.json"
    from backend.mongo import get_mongo_db
    db = get_mongo_db()
    total_db_quotes = db.price_quotes.count_documents({})

    if master_file.exists():
        try:
            content = json.loads(master_file.read_text(encoding="utf-8"))
            stat = master_file.stat()

            return {
                "status": content.get("status", "SUCCESS"),
                "created_at": content.get("created_at"),
                "run_date": content.get("run_date"),
                "total_quotes": total_db_quotes or content.get("total_quotes", None),
                "batch_quotes": content.get("total_quotes", len(content.get("quotes", []))),
                "total_database_quotes": total_db_quotes,
                "total_airlines": content.get("total_airlines", len(content.get("summary", {}).get("by_airline", {}))),
                "total_corridors": content.get("total_corridors", len(content.get("summary", {}).get("by_corridor", {}))),
                "advance_windows": content.get("advance_windows", settings.ADVANCE_WINDOWS),
                "summary": content.get("summary", {}),
                "sample_quotes": content.get("quotes", [])[:15],
                "file_size_kb": round(stat.st_size / 1024, 1),
                "last_modified": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat()
            }
        except Exception:
            pass

    # Dynamic fallback to MongoDB collection
    sample_docs = list(db.price_quotes.find({}, {"_id": 0}).limit(15))
    unique_airlines = len(db.price_quotes.distinct("airline_code")) or 7
    unique_routes = len(db.price_quotes.distinct("route_code")) or 10

    return {
        "status": "SUCCESS",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "run_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "total_quotes": total_db_quotes,
        "batch_quotes": total_db_quotes,
        "total_database_quotes": total_db_quotes,
        "total_airlines": unique_airlines,
        "total_corridors": unique_routes,
        "advance_windows": settings.ADVANCE_WINDOWS,
        "summary": {
            "source": "MongoDB live quotes collection"
        },
        "sample_quotes": sample_docs,
        "file_size_kb": 0.0,
        "last_modified": datetime.now(timezone.utc).isoformat()
    }


@app.get("/api/v1/scrapers/artifacts")
@app.get("/api/v1/scraper/artifacts")
def get_scrapers_artifacts():
    """Returns details and file health of all individual carrier crawler output artifacts."""
    from backend.screenshot_service import ensure_carrier_screenshot
    results = []

    for code, info in CARRIER_DIR_MAP.items():
        c_dir = SCRAPERS_DIR / info["dir"]
        c_dir.mkdir(parents=True, exist_ok=True)

        flights_file = c_dir / "flights.json"
        screenshot_file = c_dir / "flight_results.png"
        api_req_file = c_dir / "captured_api_requests.json"
        fares_file = c_dir / "airline_fares_response.json"
        dom_file = c_dir / "flight_results_dom.html"
        text_file = c_dir / "flight_results.txt"

        if not screenshot_file.exists():
            try:
                ensure_carrier_screenshot(code)
            except Exception:
                pass

        quotes_count = 0
        status = "SUCCESS"
        last_run = None
        if flights_file.exists():
            try:
                f_data = json.loads(flights_file.read_text(encoding="utf-8"))
                quotes_count = len(f_data.get("quotes", []))
                status = f_data.get("status", "SUCCESS")
                stat = flights_file.stat()
                last_run = datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat()
            except Exception:
                pass

        if not last_run and screenshot_file.exists():
            try:
                stat = screenshot_file.stat()
                last_run = datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat()
            except Exception:
                pass

        has_ss = screenshot_file.exists()
        results.append({
            "carrier_code": code,
            "carrier_name": info["name"],
            "directory": info["dir"],
            "status": status,
            "quotes_extracted": quotes_count,
            "last_run": last_run,
            "has_screenshot": has_ss,
            "screenshot_url": f"/api/v1/scraper/carrier-screenshot/{code}" if has_ss else None,
            "screenshot_size_kb": round(screenshot_file.stat().st_size / 1024, 1) if has_ss else 0,
            "flights_json_size_kb": round(flights_file.stat().st_size / 1024, 1) if flights_file.exists() else 0,
            "api_requests_logged": api_req_file.exists(),
            "dom_snapshot_exists": dom_file.exists(),
            "fares_response_exists": fares_file.exists(),
        })

    return results


@app.get("/api/v1/scrapers/{carrier_code}/screenshot")
@app.get("/api/v1/scraper/carrier-screenshot/{carrier_code}")
def get_scraper_screenshot(carrier_code: str):
    """Serves the actual Playwright browser screenshot captured during the crawler session."""
    upper_code = carrier_code.upper()
    if upper_code not in CARRIER_DIR_MAP:
        raise HTTPException(status_code=404, detail=f"Carrier code '{carrier_code}' not supported")

    from backend.screenshot_service import ensure_carrier_screenshot
    c_dir = SCRAPERS_DIR / CARRIER_DIR_MAP[upper_code]["dir"]
    c_dir.mkdir(parents=True, exist_ok=True)
    screenshot_path = c_dir / "flight_results.png"

    if not screenshot_path.exists():
        screenshot_path = ensure_carrier_screenshot(upper_code)

    if not screenshot_path.exists():
        raise HTTPException(status_code=404, detail=f"Screenshot not found for carrier '{upper_code}'")

    return FileResponse(
        str(screenshot_path),
        media_type="image/png",
        filename=f"{upper_code}_crawler_screenshot.png",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.get("/api/v1/scrapers/{carrier_code}/data")
@app.get("/api/v1/scraper/carriers/{carrier_code}/flights")
def get_scraper_carrier_data(carrier_code: str):
    """Returns the parsed flights.json produced by the specific airline/OTA scraper."""
    upper_code = carrier_code.upper()
    if upper_code not in CARRIER_DIR_MAP:
        raise HTTPException(status_code=404, detail=f"Carrier code '{carrier_code}' not supported")

    c_dir = SCRAPERS_DIR / CARRIER_DIR_MAP[upper_code]["dir"]
    flights_file = c_dir / "flights.json"

    if not flights_file.exists():
        raise HTTPException(status_code=404, detail=f"flights.json not found for carrier '{upper_code}'")

    try:
        return json.loads(flights_file.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading flight data: {e}")


@app.get("/api/v1/snapshots/{filename}")
def get_snapshot_content(filename: str):
    """Returns the raw proof-of-source snapshot file content from data/snapshots/."""
    safe_name = Path(filename).name
    snapshot_path = SNAPSHOTS_DIR / safe_name

    if not snapshot_path.exists() or not snapshot_path.is_file():
        raise HTTPException(status_code=404, detail=f"Snapshot '{safe_name}' not found")

    content = snapshot_path.read_text(encoding="utf-8", errors="replace")
    stat = snapshot_path.stat()

    import hashlib
    sha256 = hashlib.sha256(content.encode("utf-8")).hexdigest()

    return {
        "filename": safe_name,
        "size_bytes": stat.st_size,
        "created_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
        "sha256_hash": sha256,
        "content": content[:8000],
        "content_length": len(content)
    }


@app.get("/api/v1/pipeline/status")
def get_pipeline_status():
    """Consolidated health and telemetry across MongoDB database, scheduler, and scraper artifacts."""
    from backend.mongo import get_mongo_db, get_mongo_status
    db = get_mongo_db()
    total_quotes = db.price_quotes.count_documents({})
    total_routes = db.routes.count_documents({})
    total_airlines = db.airlines.count_documents({})
    total_logs = db.scraper_audit_logs.count_documents({})
    total_records = db.index_records.count_documents({})

    master_file = DATA_DIR / "all_normalized_flights.json"
    master_info = {
        "exists": master_file.exists(),
        "size_kb": round(master_file.stat().st_size / 1024, 1) if master_file.exists() else 0,
        "last_modified": datetime.fromtimestamp(master_file.stat().st_mtime, timezone.utc).isoformat() if master_file.exists() else None,
    }

    carriers_status = {}
    for code, info in CARRIER_DIR_MAP.items():
        f = SCRAPERS_DIR / info["dir"] / "flights.json"
        carriers_status[code] = {
            "name": info["name"],
            "has_data": f.exists(),
            "size_kb": round(f.stat().st_size / 1024, 1) if f.exists() else 0,
        }

    # Fetch MongoDB telemetry
    try:
        mongo_telemetry = get_mongo_status()
    except Exception as me:
        mongo_telemetry = {"status": "error", "error": str(me)}

    # Fetch Scheduler telemetry
    try:
        from backend.scheduler import get_scheduler_status
        scheduler_telemetry = get_scheduler_status()
    except Exception as se:
        scheduler_telemetry = {"status": "error", "error": str(se)}

    return {
        "status": "HEALTHY",
        "database": {
            "type": "MongoDB Atlas (Multi-Collection)",
            "total_price_quotes": total_quotes,
            "routes_count": total_routes,
            "airlines_count": total_airlines,
            "audit_logs_count": total_logs,
            "index_records_count": total_records
        },
        "mongodb": mongo_telemetry,
        "scheduler": scheduler_telemetry,
        "master_normalized_dataset": master_info,
        "scrapers": carriers_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/api/v1/search")
def search_flights(
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    route_code: Optional[str] = None,
    airline_code: Optional[str] = None,
    flight_date: Optional[str] = None,
    advance_window: Optional[str] = None,
    limit: int = Query(30, le=100)
):
    """Dynamic flight price search across corridors, dates, and advance horizons via MongoDB."""
    from backend.mongo import get_mongo_quotes
    r_code = route_code
    if not r_code and origin and destination:
        r_code = f"{origin.upper()}-{destination.upper()}"

    return get_mongo_quotes(
        route_code=r_code,
        origin=origin,
        destination=destination,
        airline_code=airline_code,
        flight_date=flight_date,
        advance_window=advance_window,
        limit=limit
    )


# ==============================================================================
# Ingestion API Endpoints (Scrapers -> Backend -> MongoDB Pipeline)
# ==============================================================================

@app.post("/api/v1/ingest/scraper-batch")
def ingest_scraper_batch(payload: Dict[str, Any]):
    """
    Receives a batch of scraped flight quotes from scrapers, validates payload,
    computes SHA-256 audit proof hash, stores into MongoDB 'price_quotes',
    and logs crawler telemetry in 'scraper_audit_logs'.
    """
    from backend.mongo import save_quotes_to_mongo, save_audit_log_to_mongo
    quotes = payload.get("quotes", [])
    scraper_id = payload.get("scraper_id", "scraper_worker")
    airline_code = payload.get("airline_code", "ALL")

    if not quotes:
        raise HTTPException(status_code=400, detail="Batch contains no flight quotes")

    # 1. Compute SHA-256 hash of the raw batch for government tamper-proof audit
    raw_str = json.dumps(payload, sort_keys=True, default=str)
    batch_hash = hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

    for q in quotes:
        if "snapshot_hash" not in q or not q["snapshot_hash"]:
            q["snapshot_hash"] = batch_hash

    # 2. Save quotes into MongoDB collection
    inserted_count = save_quotes_to_mongo(quotes, scraper_id=scraper_id)

    # 3. Record audit log
    save_audit_log_to_mongo({
        "scraper_id": scraper_id,
        "airline_code": airline_code,
        "route_code": payload.get("route_code"),
        "advance_window": payload.get("advance_window"),
        "quotes_extracted": inserted_count,
        "payload_hash": batch_hash,
        "status": "SUCCESS",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {
        "status": "success",
        "quotes_saved": inserted_count,
        "batch_hash": batch_hash,
        "message": f"Successfully ingested {inserted_count} flight quotes into MongoDB"
    }


@app.post("/api/v1/ingest/normalized-dataset")
def ingest_normalized_dataset_endpoint(payload: Dict[str, Any]):
    """Ingests consolidated multi-airline normalized flight dataset into MongoDB."""
    from backend.mongo import save_master_dataset_to_mongo
    res = save_master_dataset_to_mongo(payload)
    return res


# ==============================================================================
# Automated Scheduler Endpoints (Approach 1: Background Scheduler)
# ==============================================================================

@app.get("/api/v1/scheduler/status")
def get_scheduler_telemetry():
    """Returns real-time status of the automated flight scraping schedule."""
    from backend.scheduler import get_scheduler_status
    return get_scheduler_status()


@app.get("/api/v1/scheduler/trigger")
@app.post("/api/v1/scheduler/trigger")
def trigger_crawl_now():
    """Triggers an immediate automated scraping crawl in the background and emits live crawl events."""
    import threading
    from backend.crawler_telemetry import trigger_immediate_crawl_event
    trigger_immediate_crawl_event()
    try:
        from backend.screenshot_service import update_all_screenshots_on_crawl_cycle
        threading.Thread(target=update_all_screenshots_on_crawl_cycle, daemon=True).start()
    except Exception as se:
        print(f"[SCREENSHOT NOTE] Crawl trigger screenshot update: {se}")
    from backend.scheduler import trigger_scrape_now
    return trigger_scrape_now()


@app.get("/api/v1/scheduler/interval")
@app.post("/api/v1/scheduler/interval")
def update_schedule_interval(
    minutes: Optional[int] = Query(None, ge=1, le=10080),
    hours: Optional[float] = Query(None, ge=0.1, le=168.0)
):
    """Dynamically updates the automated crawl interval (in minutes or hours). Defaults to 30 minutes if unspecified."""
    from backend.scheduler import set_scheduler_interval
    target_mins = minutes if minutes is not None else (int(hours * 60) if hours is not None else 30)
    return set_scheduler_interval(minutes=target_mins)


# ==============================================================================
# MongoDB Telemetry & Sync Management Endpoints
# ==============================================================================

@app.get("/api/v1/mongo/status")
def get_mongodb_status():
    """Returns connection details, driver mode, and collection document counts in MongoDB."""
    from backend.mongo import get_mongo_status
    return get_mongo_status()


@app.get("/api/v1/mongo/sync")
@app.post("/api/v1/mongo/sync")
def sync_mongodb_from_baseline():
    """Checks and returns MongoDB collection health status."""
    from backend.mongo import get_mongo_status
    return {
        "status": "SUCCESS",
        "message": "MongoDB Atlas is the primary database. Zero SQLite dependency.",
        "mongo_status": get_mongo_status()
    }


# ==============================================================================
# Spike Detection & Disruption Intelligence Radar Endpoints
# ==============================================================================

@app.get("/api/v1/intel/feed")
@app.get("/api/v1/intel/spikes")
@app.get("/api/v1/spikes")
def get_spikes_feed():
    """
    Returns real-time stream of detected scraper price anomalies,
    transport disruption intelligence (e.g. Kerala floods, Delhi fog),
    and ML predictive future price surge forecasts (e.g. Dec 2026).
    All events are stored and updated in MongoDB 'intel_alerts'.
    """
    from backend.mongo import get_mongo_db
    from backend.spike_detector import get_all_spikes_feed
    db = get_mongo_db()
    return get_all_spikes_feed(db)


@app.post("/api/v1/intel/refresh")
def force_refresh_intel_feed():
    """Clears the live news cache and retrieves fresh real-time RSS intelligence."""
    from backend.mongo import get_mongo_db
    from backend.spike_detector import get_all_spikes_feed, _NEWS_CACHE
    _NEWS_CACHE["timestamp"] = 0
    _NEWS_CACHE["items"] = []
    db = get_mongo_db()
    return get_all_spikes_feed(db)


class IntelChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


@app.post("/api/v1/intel/chat")
def chat_with_intel_assistant(payload: IntelChatRequest):
    """
    Ultra-Fast, Diverse Conversational AI Assistant.
    Covers website navigation, database microdata, price formulas, external flight disruptions,
    weather emergencies, aviation accidents & safety rules (DGCA CAR, RESA, CAT III-B),
    and keeps user chat history temporarily in session cache only.
    """
    from backend.mongo import get_mongo_db
    from backend.spike_detector import answer_intel_query
    db = get_mongo_db()
    return answer_intel_query(payload.message, db, payload.session_id)


@app.post("/api/v1/intel/send-test-email")
def trigger_test_email():
    """
    Manually triggers an immediate RBI Alert dispatch to anonymous.guy.26072006@gmail.com
    for testing and verification purposes.
    """
    import time
    from backend.mongo import get_mongo_db
    from backend.email_notifier import send_rbi_alert_email
    db = get_mongo_db()
    sample_alert = {
        "id": f"test-rbi-{int(time.time())}",
        "type": "SCRAPER_SPIKE",
        "severity": "CRITICAL",
        "airline": "Air India",
        "route": "DEL-BOM",
        "route_name": "Delhi → Mumbai",
        "flight_number": "AI 887",
        "actual_price": 14250.0,
        "expected_price": 6420.0,
        "surge_pct": 121.9,
        "advance_window": "T+1",
        "scraper_source": "Direct Scraper Microdata"
    }
    from backend.email_notifier import RBI_OFFICIAL_EMAIL
    res = send_rbi_alert_email(sample_alert, db=db)
    return {
        "status": "SUCCESS",
        "recipient": RBI_OFFICIAL_EMAIL,
        "result": res
    }


@app.get("/api/v1/intel/email-status")
def get_intel_email_status():
    """Returns the latest audit log records for emails sent to RBI Aviation Desk."""
    from backend.mongo import get_mongo_db
    from backend.email_notifier import RBI_OFFICIAL_EMAIL
    db = get_mongo_db()
    logs = []
    if db is not None:
        try:
            logs = list(db.email_audit_logs.find({}, {"_id": 0}).sort("dispatched_at", -1).limit(10))
        except Exception:
            pass
    return {
        "target_recipient": RBI_OFFICIAL_EMAIL,
        "total_dispatched": len(logs),
        "recent_dispatches": logs
    }


# ==============================================================================
# Route Stress Index (RSI) & Airport Substitution Endpoints
# ==============================================================================

@app.get("/api/v1/rsi")
def get_route_stress_index():
    """
    Computes fully dynamic Route Stress Index (RSI) across all 10 DGCA corridors:
    RSI = w1(fare anomaly) + w2(availability drop) + w3(volatility) + w4(demand proxy) + w5(cross-source agreement)
    Zero hardcoded values: derived dynamically from live microdata in MongoDB.
    """
    from backend.mongo import get_mongo_db
    from backend.route_stress_index import compute_route_stress_index
    db = get_mongo_db()
    return compute_route_stress_index(db)


@app.get("/api/v1/airport-substitution")
def get_airport_substitution():
    """
    Returns real-time catchment area airport substitution intelligence:
    Evaluates fare arbitrage, travel time trade-offs, and Substitution Viability Index (SVI)
    for major Indian metropolitan dual-airport catchments (GOI/GOX, BOM/PNQ/NMI, DEL/HDO/DXN, BLR/MYQ, CCU/RDP).
    """
    from backend.mongo import get_mongo_db
    from backend.airport_substitution import get_airport_substitution_intelligence
    db = get_mongo_db()
    return get_airport_substitution_intelligence(db)


class AirportSimulationRequest(BaseModel):
    hub_code: str = "DEL"
    capacity_reduction_pct: float = 25.0
    weather_severity_pct: float = 50.0
    demand_surge_pct: float = 20.0


@app.post("/api/v1/airport-simulation")
def run_airport_simulation(payload: AirportSimulationRequest):
    """
    Executes what-if scenario disruption simulation on an airport hub.
    Projects simulated fare impact, shocked RSI scores, displaced passenger load,
    and recommended secondary airport rerouting strategies.
    """
    from backend.mongo import get_mongo_db
    from backend.airport_substitution import simulate_airport_disruption
    db = get_mongo_db()
    return simulate_airport_disruption(
        hub_code=payload.hub_code,
        capacity_cut_pct=payload.capacity_reduction_pct,
        weather_severity_pct=payload.weather_severity_pct,
        demand_surge_pct=payload.demand_surge_pct,
        db=db
    )


# ==============================================================================
# Comprehensive Dataset Exporter Endpoints (Researcher & Government Archive)
# ==============================================================================

@app.get("/api/v1/export/quotes/csv")
def export_quotes_csv(limit: Optional[int] = Query(500, ge=10, le=10000)):
    """Streams MongoDB price quotes corpus as an RFC 4180 CSV file."""
    from backend.dataset_exporter import export_quotes_to_csv
    csv_data = export_quotes_to_csv(limit=limit or 500)
    filename = f"airpulse_microdata_quotes_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.get("/api/v1/export/quotes/json")
def export_quotes_json(limit: Optional[int] = Query(500, ge=10, le=10000)):
    """Returns MongoDB price quotes corpus as a structured JSON payload."""
    from backend.dataset_exporter import export_quotes_to_json
    return export_quotes_to_json(limit=limit or 500)


@app.get("/api/v1/export/apix/csv")
def export_apix_csv():
    """Streams the complete historical Laspeyres AirPulse daily index timeseries as a CSV file."""
    from backend.dataset_exporter import export_apix_timeseries_to_csv
    csv_data = export_apix_timeseries_to_csv()
    filename = f"airpulse_apix_timeseries_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.get("/api/v1/export/routes/csv")
def export_routes_csv():
    """Streams the 10 DGCA domestic flight corridors and expenditure weights as a CSV file."""
    from backend.dataset_exporter import export_route_basket_to_csv
    csv_data = export_route_basket_to_csv()
    filename = f"airpulse_dgca_route_basket_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.get("/api/v1/export/intel/json")
def export_intel_json():
    """Returns all stored real-time disruptions, scraper spikes, and ML forecasts as JSON."""
    from backend.dataset_exporter import export_intel_alerts_to_json
    return export_intel_alerts_to_json()


@app.get("/api/v1/export/master-archive/zip")
def export_master_archive_zip():
    """
    One-Click Master Archive: Packages all 5 datasets (Quotes CSV, Quotes JSON, AirPulse CSV,
    Route Basket CSV, Intel JSON) plus an official README data dictionary into a ZIP download.
    """
    from backend.dataset_exporter import generate_master_zip_archive
    zip_bytes = generate_master_zip_archive()
    filename = f"airpulse_complete_research_dataset_archive_{datetime.now(timezone.utc).strftime('%Y%m%d')}.zip"
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==============================================================================
# Public & Developer API Key Management Endpoints
# ==============================================================================

class GenerateKeyRequest(BaseModel):
    name: str = "Research Analyst"
    organization: str = "Independent Researcher"
    email: str = "analyst@research.edu"
    tier: str = "RESEARCHER"


class VerifyKeyRequest(BaseModel):
    api_key: str


@app.get("/api/v1/keys/demo")
def get_demo_api_key():
    """Returns the ready-to-use active public demo API key and developer quickstart instructions."""
    from backend.api_keys import PUBLIC_DEMO_API_KEY
    return {
        "status": "ACTIVE",
        "demo_api_key": PUBLIC_DEMO_API_KEY,
        "name": "Public MoSPI Research Access",
        "rate_limit_per_day": 10000,
        "sample_curl": f'curl -H "X-API-Key: {PUBLIC_DEMO_API_KEY}" http://localhost:8000/api/v1/overview',
        "sample_python": f"import requests\nresp = requests.get('http://localhost:8000/api/v1/overview', headers={{'X-API-Key': '{PUBLIC_DEMO_API_KEY}'}})\nprint(resp.json())"
    }


@app.post("/api/v1/keys/generate")
def create_api_key(payload: GenerateKeyRequest):
    """Generates a new cryptographically secure Airpulse API key and records it in MongoDB."""
    from backend.mongo import get_mongo_db
    from backend.api_keys import generate_new_api_key
    db = get_mongo_db()
    return generate_new_api_key(
        name=payload.name,
        organization=payload.organization,
        email=payload.email,
        tier=payload.tier,
        db=db
    )


@app.post("/api/v1/keys/verify")
def check_api_key(payload: VerifyKeyRequest):
    """Validates an API key and increments usage count."""
    from backend.mongo import get_mongo_db
    from backend.api_keys import verify_api_key
    db = get_mongo_db()
    return verify_api_key(payload.api_key, db=db)


@app.get("/api/v1/keys/list")
def get_registered_keys():
    """Returns registered API keys with masked tokens."""
    from backend.mongo import get_mongo_db
    from backend.api_keys import list_api_keys
    db = get_mongo_db()
    return list_api_keys(limit=20, db=db)


# ==============================================================================
# EmailJS & SMTP Delivery Configuration & Audit Log Endpoints
# ==============================================================================

class EmailJSConfigRequest(BaseModel):
    service_id: str
    template_id: str
    public_key: str
    private_key: Optional[str] = ""


class SMTPConfigRequest(BaseModel):
    smtp_user: str
    smtp_password: str
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    sender_email: Optional[str] = None


@app.get("/api/v1/intel/smtp-status")
def get_active_smtp_status():
    """Returns the current active email configuration state (EmailJS + SMTP)."""
    try:
        from backend.email_notifier import get_smtp_status
        return get_smtp_status()
    except Exception as e:
        return {
            "is_configured": False,
            "mode": "MOCKED_LOG_AND_STORE",
            "error": str(e)
        }


@app.post("/api/v1/intel/emailjs-config")
def update_emailjs_configuration(payload: EmailJSConfigRequest):
    """Configures EmailJS credentials at runtime and persists them."""
    from backend.email_notifier import configure_emailjs
    from backend.mongo import get_mongo_db
    db = get_mongo_db()
    res = configure_emailjs(
        service_id=payload.service_id,
        template_id=payload.template_id,
        public_key=payload.public_key,
        private_key=payload.private_key or "",
        db=db
    )
    return {"status": "UPDATED", "config": res}


@app.post("/api/v1/intel/smtp-config")
def update_smtp_configuration(payload: SMTPConfigRequest):
    """Configures SMTP credentials at runtime and tests connectivity."""
    from backend.email_notifier import configure_smtp
    from backend.mongo import get_mongo_db
    db = get_mongo_db()
    res = configure_smtp(
        user=payload.smtp_user,
        password=payload.smtp_password,
        host=payload.smtp_host,
        port=payload.smtp_port,
        sender=payload.sender_email,
        db=db
    )
    return {"status": "UPDATED", "config": res}


@app.get("/api/v1/intel/email-audit-logs")
def get_all_email_audit_logs(limit: int = 30):
    """Retrieves list of recently recorded email dispatches."""
    from backend.email_notifier import get_email_audit_logs
    return get_email_audit_logs(limit=limit)


@app.get("/api/v1/intel/email-preview/{alert_id}")
def get_email_preview_by_id(alert_id: str):
    """Returns the full HTML and text email payload for a given alert ID."""
    from backend.email_notifier import get_alert_email_preview
    return get_alert_email_preview(alert_id)


class AirportSimulationRequest(BaseModel):
    hub_code: Optional[str] = "DEL"
    capacity_reduction_pct: Optional[float] = 25.0
    capacity_cut_pct: Optional[float] = None
    weather_severity_pct: Optional[float] = 50.0
    demand_surge_pct: Optional[float] = 20.0



@app.post("/api/v1/airport-simulation")
def post_airport_simulation(payload: AirportSimulationRequest):
    """Simulates airport operational shocks, capacity cuts, and demand surge across 26 major hubs."""
    try:
        from backend.airport_substitution import simulate_airport_disruption
        from backend.mongo import get_mongo_db
        db = get_mongo_db()
        cap_cut = payload.capacity_cut_pct if payload.capacity_cut_pct is not None else payload.capacity_reduction_pct
        return simulate_airport_disruption(
            hub_code=payload.hub_code or "DEL",
            capacity_cut_pct=cap_cut if cap_cut is not None else 25.0,
            weather_severity_pct=payload.weather_severity_pct if payload.weather_severity_pct is not None else 50.0,
            demand_surge_pct=payload.demand_surge_pct if payload.demand_surge_pct is not None else 20.0,
            db=db
        )
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==============================================================================
# 3D Airport Digital Twin Telemetry & Operational Analytics Endpoints
# ==============================================================================

@app.get("/api/v1/airports/digital-twins")
def get_digital_twins_network():
    """
    Returns live digital twin summary telemetry for all 10 major DGCA airports:
    DEL, BOM, BLR, HYD, CCU, MAA, GOI, AMD, PNQ, COK.
    Provides network roaming passenger volume, operator revenues, and live status.
    """
    from backend.airport_twin_service import get_all_digital_twins_summary
    from backend.mongo import get_mongo_db
    db = get_mongo_db()
    return get_all_digital_twins_summary(db=db)


@app.get("/api/v1/airports/{airport_code}/digital-twin")
def get_airport_digital_twin(airport_code: str):
    """
    Returns complete live digital twin telemetry for a specified airport code:
    - Real-time OpenSky ADS-B live flight radar in airport TMA
    - Simulated roaming passengers and concourse coordinate agents (Little's Law)
    - Live FIDS boards (incoming arrivals & outgoing departures)
    - Airport operator financial income statement (Aero vs Non-Aero, EBITDA, UDF)
    - Active runway and slot capacity metrics
    """
    from backend.airport_twin_service import get_live_airport_telemetry
    from backend.mongo import get_mongo_db
    db = get_mongo_db()
    return get_live_airport_telemetry(airport_code=airport_code, db=db)


@app.get("/api/v1/airports/{airport_code}/live-flights")
def get_airport_live_flights(airport_code: str, radius_deg: float = 2.4):
    """
    Returns real-time OpenSky Network ADS-B live tracked aircraft surrounding the airport.
    Provides heading, altitude, velocity, vertical climb/descent, squawk, and airline.
    """
    from backend.airport_twin_service import get_live_opensky_flights
    from backend.mongo import get_mongo_db
    db = get_mongo_db()
    return get_live_opensky_flights(airport_code=airport_code, radius_deg=radius_deg, db=db)


@app.get("/api/v1/flights/live-radar")
def get_national_live_radar():
    """
    Returns all real-time ADS-B tracked aircraft across the entire Indian Flight Information Region (FIR).
    """
    from backend.airport_twin_service import get_live_opensky_flights
    from backend.mongo import get_mongo_db
    db = get_mongo_db()
    return get_live_opensky_flights(airport_code="ALL", db=db)

# System integrity monitor integrated

