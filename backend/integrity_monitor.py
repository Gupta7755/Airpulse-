"""
================================================================================
Airpulse MoSPI - Platform System Integrity & Dynamic Data Verification Monitor
================================================================================
Background verification engine that executes on a regular schedule (every 30 mins).
Validates that:
  1. MongoDB Atlas is healthy, responsive, and contains authentic market microdata.
  2. Mathematical models (Laspeyres Price Index, Heatmap, 5-Factor RSI, Advance Windows,
     Spike Radar) compute dynamic, differentiated values with zero static flat fares.
  3. All core REST API endpoints return HTTP 200 with dynamic, non-empty payloads.
  4. Zero hardcoded / static fallback values remain anywhere in the data pipeline.
  5. Scraper pipeline telemetry and crawl execution cycles are healthy.

STRICT STEALTH REQUIREMENT:
  This monitor operates purely in the background / internally.
  It generates local logs in logs/integrity_audit.log and stores audit records in
  the internal MongoDB collection `_internal_integrity_audits`.
  It is NEVER exposed in the frontend UI or navigation.
================================================================================
"""

import os
import sys
import time
import math
import json
import logging
import argparse
import urllib.request
import urllib.error
from datetime import datetime, timezone, date, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.config import settings

# Configure dedicated local logger
LOGS_DIR = ROOT_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
AUDIT_LOG_FILE = LOGS_DIR / "integrity_audit.log"

logger = logging.getLogger("apix.integrity_monitor")
logger.setLevel(logging.INFO)

# File handler for local audit log
_file_handler = logging.FileHandler(str(AUDIT_LOG_FILE), encoding="utf-8")
_file_handler.setLevel(logging.INFO)
_file_formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
_file_handler.setFormatter(_file_formatter)

# Avoid duplicate handlers
if not any(isinstance(h, logging.FileHandler) for h in logger.handlers):
    logger.addHandler(_file_handler)


class CheckResult:
    def __init__(self, check_id: str, category: str, name: str, passed: bool, detail: str, metrics: Optional[Dict[str, Any]] = None):
        self.check_id = check_id
        self.category = category
        self.name = name
        self.passed = passed
        self.detail = detail
        self.metrics = metrics or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "check_id": self.check_id,
            "category": self.category,
            "name": self.name,
            "passed": self.passed,
            "detail": self.detail,
            "metrics": self.metrics
        }


class SystemIntegrityAuditor:
    """
    Comprehensive auditor for verifying database fidelity, mathematical engine accuracy,
    API endpoint health, and dynamic data adherence.
    """

    def __init__(self, api_base_url: str = "http://127.0.0.1:8000"):
        self.api_base_url = api_base_url.rstrip("/")
        self.results: List[CheckResult] = []
        self._db = None

    def _get_db(self):
        if self._db is None:
            from backend.mongo import get_mongo_db
            self._db = get_mongo_db()
        return self._db

    # --------------------------------------------------------------------------
    # CATEGORY 1: MongoDB Atlas Database Integrity & Microdata Quality
    # --------------------------------------------------------------------------
    def audit_mongodb_connection(self) -> CheckResult:
        """Verifies direct connectivity to MongoDB Atlas cluster."""
        try:
            from backend.mongo import get_mongo_client, is_mongo_connected
            client = get_mongo_client()
            ping_res = client.admin.command("ping")
            is_live = is_mongo_connected()
            passed = bool(ping_res.get("ok") == 1.0 and is_live)
            return CheckResult(
                check_id="DB-01",
                category="DATABASE",
                name="MongoDB Atlas Live Ping",
                passed=passed,
                detail="Connected to live MongoDB Atlas cluster (ping ok)" if passed else "Ping failed or using fallback",
                metrics={"ping_response": ping_res, "is_live": is_live, "database": settings.MONGO_DB_NAME}
            )
        except Exception as e:
            return CheckResult(
                check_id="DB-01",
                category="DATABASE",
                name="MongoDB Atlas Live Ping",
                passed=False,
                detail=f"Connection exception: {e}",
                metrics={"error": str(e)}
            )

    def audit_collection_documents(self) -> CheckResult:
        """Verifies document volume across all required collections."""
        try:
            db = self._get_db()
            counts = {
                "price_quotes": db.price_quotes.count_documents({}),
                "routes": db.routes.count_documents({}),
                "airlines": db.airlines.count_documents({}),
                "index_records": db.index_records.count_documents({}),
                "scraper_audit_logs": db.scraper_audit_logs.count_documents({})
            }
            # price_quotes should have > 8,000 documents; routes must be 10; airlines must be >= 12
            passed = (
                counts["price_quotes"] >= 8000 and
                counts["routes"] == 10 and
                counts["airlines"] >= 12 and
                counts["index_records"] >= 100
            )
            detail = f"Quotes: {counts['price_quotes']:,} | Corridors: {counts['routes']} | Carriers/OTAs: {counts['airlines']} | Index Records: {counts['index_records']}"
            return CheckResult(
                check_id="DB-02",
                category="DATABASE",
                name="Database Collections Inventory",
                passed=passed,
                detail=detail,
                metrics=counts
            )
        except Exception as e:
            return CheckResult(
                check_id="DB-02",
                category="DATABASE",
                name="Database Collections Inventory",
                passed=False,
                detail=f"Query error: {e}",
                metrics={"error": str(e)}
            )

    def audit_price_quotes_fidelity(self) -> CheckResult:
        """Verifies that quotes have realistic variance and standard deviation (not flat/fake)."""
        try:
            db = self._get_db()
            pipeline = [
                {"$match": {"is_outlier": {"$ne": True}}},
                {"$group": {
                    "_id": None,
                    "avg_fare": {"$avg": "$total_fare"},
                    "min_fare": {"$min": "$total_fare"},
                    "max_fare": {"$max": "$total_fare"},
                    "std_fare": {"$stdDevPop": "$total_fare"},
                    "total_count": {"$sum": 1}
                }}
            ]
            agg = list(db.price_quotes.aggregate(pipeline))
            if not agg:
                return CheckResult(check_id="DB-03", category="DATABASE", name="Price Quotes Statistical Variance", passed=False, detail="No price quotes found in aggregate")

            stats = agg[0]
            avg_fare = round(float(stats.get("avg_fare") or 0), 2)
            min_fare = round(float(stats.get("min_fare") or 0), 2)
            max_fare = round(float(stats.get("max_fare") or 0), 2)
            std_fare = round(float(stats.get("std_fare") or 0), 2)
            count = int(stats.get("total_count") or 0)

            # Assert std_fare is substantial (> 500 INR) indicating real dynamic dispersion, not identical numbers
            passed = (count >= 8000 and std_fare > 500.0 and min_fare > 1000.0 and max_fare > min_fare)
            detail = f"Evaluated {count:,} quotes: Avg ₹{avg_fare:,.2f}, StdDev ₹{std_fare:,.2f}, Range [₹{min_fare:,.0f} - ₹{max_fare:,.0f}]"
            return CheckResult(
                check_id="DB-03",
                category="DATABASE",
                name="Price Quotes Statistical Variance",
                passed=passed,
                detail=detail,
                metrics={"avg_fare": avg_fare, "min_fare": min_fare, "max_fare": max_fare, "std_fare": std_fare, "count": count}
            )
        except Exception as e:
            return CheckResult(
                check_id="DB-03",
                category="DATABASE",
                name="Price Quotes Statistical Variance",
                passed=False,
                detail=f"Aggregation error: {e}",
                metrics={"error": str(e)}
            )

    def audit_route_and_carrier_diversity(self) -> CheckResult:
        """Verifies all 10 DGCA routes and all 12 airline/OTA feeds have active quotes."""
        try:
            db = self._get_db()
            distinct_routes = set(db.price_quotes.distinct("route_code") or [])
            distinct_carriers = set(db.price_quotes.distinct("airline_code") or [])
            distinct_otas = set([x for x in db.price_quotes.distinct("ota_code") if x])

            expected_routes = {"DEL-BOM", "DEL-BLR", "BOM-BLR", "DEL-CCU", "BLR-HYD", "MAA-DEL", "DEL-HYD", "BOM-GOI", "BOM-MAA", "CCU-BLR"}
            missing_routes = expected_routes - distinct_routes

            total_feeds = len(distinct_carriers) + len(distinct_otas)
            passed = (len(missing_routes) == 0 and len(distinct_carriers) >= 5 and len(distinct_otas) >= 5)
            detail = f"Corridors represented: {len(distinct_routes)}/10 | Direct Airlines: {len(distinct_carriers)} | OTAs: {len(distinct_otas)} (Total feeds: {total_feeds})"
            if missing_routes:
                detail += f" (Missing corridors: {', '.join(missing_routes)})"

            return CheckResult(
                check_id="DB-04",
                category="DATABASE",
                name="Corridor & Carrier Feed Representation",
                passed=passed,
                detail=detail,
                metrics={
                    "routes_found": len(distinct_routes),
                    "airlines_count": len(distinct_carriers),
                    "otas_count": len(distinct_otas),
                    "total_feeds": total_feeds,
                    "missing_routes": list(missing_routes)
                }
            )
        except Exception as e:
            return CheckResult(
                check_id="DB-04",
                category="DATABASE",
                name="Corridor & Carrier Feed Representation",
                passed=False,
                detail=f"Query error: {e}",
                metrics={"error": str(e)}
            )

    # --------------------------------------------------------------------------
    # CATEGORY 2: Mathematical Engine & Dynamic Calculation Verification
    # --------------------------------------------------------------------------
    def audit_laspeyres_index_engine(self) -> CheckResult:
        """Verifies Laspeyres formula computation is dynamic, numeric, and properly weighted."""
        try:
            from backend.mongo import compute_live_laspeyres_index
            res = compute_live_laspeyres_index()
            val = res.get("value")
            quotes_used = res.get("total_quotes_used", 0)
            calc_date = res.get("calculation_date")
            chg_d1 = res.get("change_pct_d1")

            passed = (
                isinstance(val, (int, float)) and
                90.0 <= val <= 250.0 and
                quotes_used >= 8000 and
                calc_date is not None and
                chg_d1 is not None
            )
            detail = f"Headline AirPulse Index: {val} (calculated on {calc_date} from {quotes_used:,} quotes, DoD {chg_d1}%)"
            return CheckResult(
                check_id="MATH-01",
                category="MATHEMATICS",
                name="Laspeyres CPI Price Index Calculation",
                passed=passed,
                detail=detail,
                metrics={"index_value": val, "quotes_used": quotes_used, "dod_pct": chg_d1}
            )
        except Exception as e:
            return CheckResult(
                check_id="MATH-01",
                category="MATHEMATICS",
                name="Laspeyres CPI Price Index Calculation",
                passed=False,
                detail=f"Calculation error: {e}",
                metrics={"error": str(e)}
            )

    def audit_heatmap_corridor_differentiation(self) -> CheckResult:
        """Verifies heatmap calculation generates 10 distinct corridor prices (no flat identical fares)."""
        try:
            from backend.index_calculator import compute_heatmap_data
            data = compute_heatmap_data()
            corridors = data.get("corridors", [])
            days = data.get("corridor_days", [])

            if len(corridors) != 10:
                return CheckResult(check_id="MATH-02", category="MATHEMATICS", name="Heatmap Corridor Fare Variance", passed=False, detail=f"Expected 10 corridors, got {len(corridors)}")

            fares = [float(c.get("average_fare", 0)) for c in corridors]
            mean_fare = sum(fares) / len(fares)
            variance = sum((f - mean_fare) ** 2 for f in fares) / len(fares)
            std_dev = math.sqrt(variance)

            # Check that std_dev across routes is > 300 INR (proves genuine corridor differentiation)
            passed = (std_dev > 300.0 and len(days) == 35 and all(f > 0 for f in fares))
            min_fare = min(fares)
            max_fare = max(fares)
            detail = f"10 corridors: Mean ₹{mean_fare:,.0f}, StdDev ₹{std_dev:,.0f}, Dynamic spread [₹{min_fare:,.0f} - ₹{max_fare:,.0f}]"
            return CheckResult(
                check_id="MATH-02",
                category="MATHEMATICS",
                name="Heatmap Corridor Fare Variance",
                passed=passed,
                detail=detail,
                metrics={"std_dev": round(std_dev, 2), "min_fare": min_fare, "max_fare": max_fare, "days_count": len(days)}
            )
        except Exception as e:
            return CheckResult(
                check_id="MATH-02",
                category="MATHEMATICS",
                name="Heatmap Corridor Fare Variance",
                passed=False,
                detail=f"Heatmap error: {e}",
                metrics={"error": str(e)}
            )

    def audit_route_stress_index_rsi(self) -> CheckResult:
        """Verifies 5-Factor Route Stress Index (RSI) composite calculation."""
        try:
            from backend.route_stress_index import compute_route_stress_index
            db = self._get_db()
            rsi_payload = compute_route_stress_index(db)
            national = rsi_payload.get("national_composite", {})
            rsi_val = national.get("rsi")
            level = national.get("level")
            top_route = national.get("top_stressed_route")

            passed = (
                isinstance(rsi_val, (int, float)) and
                0.0 <= rsi_val <= 100.0 and
                level in ["LOW", "MODERATE", "ELEVATED", "HIGH", "CRITICAL"] and
                top_route is not None
            )
            detail = f"National Composite RSI: {rsi_val} ({level}), Top Stressed Corridor: {top_route}"
            return CheckResult(
                check_id="MATH-03",
                category="MATHEMATICS",
                name="5-Factor Route Stress Index (RSI)",
                passed=passed,
                detail=detail,
                metrics={"rsi": rsi_val, "level": level, "top_stressed_route": top_route}
            )
        except Exception as e:
            return CheckResult(
                check_id="MATH-03",
                category="MATHEMATICS",
                name="5-Factor Route Stress Index (RSI)",
                passed=False,
                detail=f"RSI calculation error: {e}",
                metrics={"error": str(e)}
            )

    def audit_advance_windows_curve(self) -> CheckResult:
        """Verifies dynamic yield curve calculation across T+0 to T+45 booking horizons."""
        try:
            from backend.mongo import get_mongo_advance_windows
            windows = get_mongo_advance_windows()
            if not isinstance(windows, list) or len(windows) < 5:
                return CheckResult(check_id="MATH-04", category="MATHEMATICS", name="Advance Purchase Horizon Yield Curve", passed=False, detail=f"Expected >= 5 windows, got {len(windows) if isinstance(windows, list) else 'none'}")

            t0 = next((w for w in windows if w.get("window") == "T+0"), None)
            t30 = next((w for w in windows if w.get("window") in ["T+30", "T+45"]), None)

            # Usually T+0 fare >= T+30 fare due to surge
            t0_fare = t0.get("average_fare", 0) if t0 else 0
            t30_fare = t30.get("average_fare", 0) if t30 else 0
            passed = (len(windows) >= 5 and t0_fare > 0 and t30_fare > 0)
            detail = f"Computed {len(windows)} horizons: T+0 ₹{t0_fare:,.0f} vs T+30 ₹{t30_fare:,.0f}"
            return CheckResult(
                check_id="MATH-04",
                category="MATHEMATICS",
                name="Advance Purchase Horizon Yield Curve",
                passed=passed,
                detail=detail,
                metrics={"windows_count": len(windows), "t0_fare": t0_fare, "t30_fare": t30_fare}
            )
        except Exception as e:
            return CheckResult(
                check_id="MATH-04",
                category="MATHEMATICS",
                name="Advance Purchase Horizon Yield Curve",
                passed=False,
                detail=f"Advance windows error: {e}",
                metrics={"error": str(e)}
            )

    # --------------------------------------------------------------------------
    # CATEGORY 3: REST API Endpoints Live Health Check
    # --------------------------------------------------------------------------
    def audit_api_endpoints(self) -> List[CheckResult]:
        """Tests core REST API endpoints for HTTP 200 response and dynamic payload contents."""
        endpoints_to_test = [
            ("/api/v1/health", "Health Status"),
            ("/api/v1/overview", "Macro Overview KPI"),
            ("/api/v1/routes", "10 DGCA Corridors"),
            ("/api/v1/airlines", "Carriers & OTAs"),
            ("/api/v1/quotes?limit=10", "Live Quotes Microdata"),
            ("/api/v1/heatmap", "Heat Matrix Engine"),
            ("/api/v1/rsi", "Route Stress Index Composite"),
            ("/api/v1/spikes", "Spikes & Disruption Intelligence"),
            ("/api/v1/advance-windows", "Advance Horizons"),
            ("/api/v1/mongo/status", "MongoDB Connection Status"),
            ("/api/v1/scheduler/status", "Scraper Scheduler Status"),
            ("/api/v1/scraper-logs?limit=5", "Scraper Audit Logs"),
            ("/api/v1/scraper/master-dataset", "Master Normalized Dataset"),
            ("/api/v1/export/routes/csv", "Routes CSV Export"),
            ("/api/v1/export/apix/csv", "AirPulse Timeseries CSV Export")
        ]

        results = []
        for path, label in endpoints_to_test:
            url = f"{self.api_base_url}{path}"
            check_id = f"API-{len(results)+1:02d}"
            last_err = None
            passed = False
            detail = ""
            metrics = {}

            for attempt in range(2):
                try:
                    req = urllib.request.Request(url, headers={"User-Agent": "MoSPI-Integrity-Auditor/1.0"})
                    with urllib.request.urlopen(req, timeout=25) as response:
                        status_code = response.status
                        content_type = response.headers.get("Content-Type", "")
                        body = response.read()

                        passed = (status_code == 200 and len(body) > 0)
                        detail = f"HTTP {status_code} ({len(body):,} bytes, {content_type.split(';')[0]})"
                        metrics = {"status_code": status_code, "bytes": len(body), "url": url}
                        if passed:
                            break
                except Exception as e:
                    last_err = e
                    if attempt == 0:
                        time.sleep(0.6)

            if not passed:
                detail = f"Request failed: {last_err}"
                metrics = {"error": str(last_err), "url": url}

            results.append(CheckResult(
                check_id=check_id,
                category="API_ENDPOINTS",
                name=f"Endpoint: {path} ({label})",
                passed=passed,
                detail=detail,
                metrics=metrics
            ))
        return results

    # --------------------------------------------------------------------------
    # CATEGORY 4: Static & Hardcoded Fallback Detection Guard
    # --------------------------------------------------------------------------
    def audit_zero_static_fallbacks(self) -> CheckResult:
        """
        Scans current live API responses to guarantee no previously hardcoded dummy numbers remain:
        - quotes count != 4219 and != 4922
        - latest index != 104.77 and != 140.04
        - daily change != 1.68
        - total passenger traffic != 42800000
        - confirms 'MongoDB Atlas (apix_mospi)' is the authoritative data source
        """
        data = None
        last_err = None
        url = f"{self.api_base_url}/api/v1/overview"

        for attempt in range(2):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "MoSPI-Integrity-Auditor/1.0"})
                with urllib.request.urlopen(req, timeout=25) as response:
                    data = json.loads(response.read().decode("utf-8"))
                if data:
                    break
            except Exception as e:
                last_err = e
                if attempt == 0:
                    time.sleep(0.6)

        if data is None:
            return CheckResult(
                check_id="GUARD-01",
                category="STATIC_DATA_GUARD",
                name="Hardcoded / Dummy Fallback Elimination Guard",
                passed=False,
                detail=f"Guard check error: {last_err}",
                metrics={"error": str(last_err)}
            )

        try:
            violations = []
            quotes_count = data.get("quotes_stats", {}).get("total_stored_quotes")
            if quotes_count in [4219, 4922]:
                violations.append(f"Static quotes fallback detected: {quotes_count}")

            latest_idx = data.get("latest_index", {}).get("value")
            if latest_idx in [104.77, 140.04]:
                violations.append(f"Static index fallback detected: {latest_idx}")

            dod_chg = data.get("latest_index", {}).get("change_pct_d1")
            if dod_chg == 1.68:
                violations.append(f"Static DoD change fallback detected: {dod_chg}")

            total_pax = data.get("basket_stats", {}).get("tracked_annual_passengers")
            if total_pax == 42800000:
                violations.append("Static passenger traffic fallback detected: 42,800,000")

            db_source = data.get("database", "")
            if "MongoDB Atlas" not in db_source:
                violations.append(f"Unexpected database source: '{db_source}'")

            passed = (len(violations) == 0)
            if passed:
                detail = f"Zero static fallbacks detected. Authoritative source: '{db_source}' (Quotes: {quotes_count:,}, Index: {latest_idx})"
            else:
                detail = "VIOLATION: " + "; ".join(violations)

            return CheckResult(
                check_id="GUARD-01",
                category="STATIC_DATA_GUARD",
                name="Hardcoded / Dummy Fallback Elimination Guard",
                passed=passed,
                detail=detail,
                metrics={"violations_count": len(violations), "violations": violations}
            )
        except Exception as e:
            return CheckResult(
                check_id="GUARD-01",
                category="STATIC_DATA_GUARD",
                name="Hardcoded / Dummy Fallback Elimination Guard",
                passed=False,
                detail=f"Guard check error: {e}",
                metrics={"error": str(e)}
            )

    # --------------------------------------------------------------------------
    # CATEGORY 5: Scraper Telemetry & Crawler Cycle Health
    # --------------------------------------------------------------------------
    def audit_scraper_pipeline(self) -> CheckResult:
        """Verifies scraper execution logs and crawl resilience rate."""
        try:
            db = self._get_db()
            total_logs = db.scraper_audit_logs.count_documents({})
            if total_logs == 0:
                return CheckResult(check_id="SCRAPE-01", category="SCRAPERS", name="Scraper Crawler Telemetry", passed=False, detail="No scraper audit logs found in database")

            recent_success = db.scraper_audit_logs.count_documents({
                "status": {"$in": ["SUCCESS", "CAPTCHA_BYPASSED", "CLOUDFLARE_BYPASSED", "TLS_ROTATED", "BLOCKED_CLOUDFLARE_RECOVERED"]}
            })
            resilience_rate = round((recent_success / total_logs) * 100.0, 1)

            # Find latest scraper log timestamp
            latest_log = db.scraper_audit_logs.find_one({}, sort=[("created_at", -1)])
            latest_ts = latest_log.get("created_at") if latest_log else None

            passed = (total_logs > 100 and resilience_rate >= 70.0)
            detail = f"Audit logs: {total_logs:,} | Resilience rate: {resilience_rate}% | Most recent crawl log: {latest_ts}"
            return CheckResult(
                check_id="SCRAPE-01",
                category="SCRAPERS",
                name="Scraper Crawler Telemetry",
                passed=passed,
                detail=detail,
                metrics={"total_logs": total_logs, "resilience_rate": resilience_rate, "latest_ts": latest_ts}
            )
        except Exception as e:
            return CheckResult(
                check_id="SCRAPE-01",
                category="SCRAPERS",
                name="Scraper Crawler Telemetry",
                passed=False,
                detail=f"Scraper telemetry query error: {e}",
                metrics={"error": str(e)}
            )

    # --------------------------------------------------------------------------
    # RUN ALL AUDITS
    # --------------------------------------------------------------------------
    def run_all(self) -> Dict[str, Any]:
        """Runs the entire system integrity verification suite."""
        start_time = time.time()
        self.results.clear()

        # Category 1: Database
        self.results.append(self.audit_mongodb_connection())
        self.results.append(self.audit_collection_documents())
        self.results.append(self.audit_price_quotes_fidelity())
        self.results.append(self.audit_route_and_carrier_diversity())

        # Category 2: Mathematics & Engines
        self.results.append(self.audit_laspeyres_index_engine())
        self.results.append(self.audit_heatmap_corridor_differentiation())
        self.results.append(self.audit_route_stress_index_rsi())
        self.results.append(self.audit_advance_windows_curve())

        # Category 3: REST APIs
        api_results = self.audit_api_endpoints()
        self.results.extend(api_results)

        # Category 4: Static Data Guard
        self.results.append(self.audit_zero_static_fallbacks())

        # Category 5: Scrapers
        self.results.append(self.audit_scraper_pipeline())

        duration = round(time.time() - start_time, 2)
        total_checks = len(self.results)
        passed_checks = sum(1 for r in self.results if r.passed)
        failed_checks = total_checks - passed_checks
        overall_status = "PASS" if failed_checks == 0 else "FAIL"

        timestamp_iso = datetime.now(timezone.utc).isoformat()

        dossier = {
            "audit_id": f"audit-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
            "timestamp": timestamp_iso,
            "overall_status": overall_status,
            "total_checks": total_checks,
            "passed_checks": passed_checks,
            "failed_checks": failed_checks,
            "pass_rate_pct": round((passed_checks / total_checks) * 100.0, 1) if total_checks > 0 else 0,
            "duration_seconds": duration,
            "checks": [r.to_dict() for r in self.results]
        }

        # 1. Log human-readable dossier to logs/integrity_audit.log
        self._write_to_local_log(dossier)

        # 2. Persist to internal MongoDB collection (_internal_integrity_audits)
        self._persist_to_mongo(dossier)

        return dossier

    def _write_to_local_log(self, dossier: Dict[str, Any]):
        """Writes clean formatted summary to logs/integrity_audit.log."""
        try:
            status = dossier["overall_status"]
            ts = dossier["timestamp"]
            tot = dossier["total_checks"]
            passed = dossier["passed_checks"]
            failed = dossier["failed_checks"]
            dur = dossier["duration_seconds"]

            lines = [
                "=" * 80,
                f"[{ts}] SYSTEM INTEGRITY & DYNAMIC DATA AUDIT: {status}",
                f"Summary: {passed}/{tot} checks passed ({dossier['pass_rate_pct']}%) in {dur}s",
                "=" * 80
            ]
            for c in dossier["checks"]:
                icon = "[PASS]" if c["passed"] else "[FAIL]"
                lines.append(f"  {icon} [{c['check_id']}] [{c['category']}] {c['name']}: {c['detail']}")

            lines.append("=" * 80 + "\n")
            log_text = "\n".join(lines)

            logger.info("\n" + log_text)
        except Exception as e:
            print(f"[INTEGRITY MONITOR ERROR] Could not write to log file: {e}")

    def _persist_to_mongo(self, dossier: Dict[str, Any]):
        """Saves audit record to private MongoDB collection _internal_integrity_audits (keeping last 200)."""
        try:
            db = self._get_db()
            col = db["_internal_integrity_audits"]
            col.insert_one(dict(dossier))

            # Maintain capped size: prune old documents beyond 200
            count = col.count_documents({})
            if count > 200:
                oldest = list(col.find({}, {"_id": 1}).sort("timestamp", 1).limit(count - 200))
                if oldest:
                    col.delete_many({"_id": {"$in": [d["_id"] for d in oldest]}})
        except Exception as e:
            logger.warning(f"[INTEGRITY AUDIT] MongoDB persistence note: {e}")


# Global convenience function for APScheduler / scheduler.py
def run_full_system_audit() -> Dict[str, Any]:
    """
    Called by the background scheduler every 30 minutes to verify system health.
    Returns the audit dossier.
    """
    logger.info("[INTEGRITY AUDIT] >>> Starting scheduled 30-minute system integrity audit <<<")
    auditor = SystemIntegrityAuditor()
    result = auditor.run_all()
    logger.info(f"[INTEGRITY AUDIT] Completed in {result['duration_seconds']}s with status {result['overall_status']} ({result['passed_checks']}/{result['total_checks']} passed)")
    return result


def _safe_print(text: str):
    """Safely prints text to stdout handling Windows cp1252 character restrictions."""
    try:
        print(text)
    except UnicodeEncodeError:
        safe_text = text.replace("\u20b9", "INR ")
        try:
            print(safe_text)
        except Exception:
            print(safe_text.encode("ascii", "replace").decode("ascii"))


def main():
    """Command-line entrypoint for manual verification or daemon execution."""
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="MoSPI Airpulse Background System Integrity & Dynamic Data Auditor")
    parser.add_argument("--daemon", action="store_true", help="Run continuously in background every 30 minutes")
    parser.add_argument("--interval", type=int, default=30, help="Interval in minutes for daemon mode (default: 30)")
    parser.add_argument("--api-url", type=str, default="http://127.0.0.1:8000", help="Base URL of FastAPI backend")
    args = parser.parse_args()

    auditor = SystemIntegrityAuditor(api_base_url=args.api_url)

    if args.daemon:
        _safe_print(f"[*] Starting MoSPI Background Integrity Auditor Daemon (Every {args.interval} minutes)...")
        _safe_print(f"[*] Local audit log destination: {AUDIT_LOG_FILE}")
        _safe_print(f"[*] Internal MongoDB collection: _internal_integrity_audits")
        _safe_print("[*] Press Ctrl+C to terminate daemon.\n")
        while True:
            try:
                res = auditor.run_all()
                _safe_print(f"[{datetime.now().strftime('%H:%M:%S')}] Audit cycle finished: {res['overall_status']} ({res['passed_checks']}/{res['total_checks']} passed in {res['duration_seconds']}s)")
            except Exception as e:
                _safe_print(f"[!] Audit error: {e}")
            time.sleep(args.interval * 60)
    else:
        _safe_print("=" * 80)
        _safe_print("  MoSPI Airpulse - Platform System Integrity & Dynamic Data Verification")
        _safe_print("=" * 80)
        res = auditor.run_all()
        _safe_print(f"\nOverall Status: {res['overall_status']}")
        _safe_print(f"Passed: {res['passed_checks']}/{res['total_checks']} ({res['pass_rate_pct']}%)")
        _safe_print(f"Execution Duration: {res['duration_seconds']}s")
        _safe_print(f"Log written to: {AUDIT_LOG_FILE}")
        _safe_print("=" * 80)
        for check in res["checks"]:
            icon = "[PASS]" if check["passed"] else "[FAIL]"
            _safe_print(f"  {icon} [{check['check_id']}] {check['name']}: {check['detail']}")
        _safe_print("=" * 80)

        # Exit with non-zero if audit failed
        if res["overall_status"] != "PASS":
            sys.exit(1)


if __name__ == "__main__":
    main()
