import sys
import time
import threading
import subprocess
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from backend.config import settings

logger = logging.getLogger("apix.scheduler")

ROOT_DIR = Path(__file__).resolve().parent.parent

# Global scheduler instance
_scheduler: Optional[BackgroundScheduler] = None
_lock = threading.Lock()

# Scheduler Telemetry State
_default_mins = getattr(settings, "SCHEDULER_INTERVAL_MINUTES", 30)
_state: Dict[str, Any] = {
    "is_active": False,
    "is_crawling": False,
    "interval_minutes": _default_mins,
    "interval_hours": round(_default_mins / 60.0, 2),
    "interval_label": "Every 30 Minutes" if _default_mins == 30 else f"Every {_default_mins} Min",
    "cron_expression": "*/30 * * * *",
    "last_run_time": None,
    "last_run_status": "NOT_STARTED",
    "last_run_duration_secs": 0.0,
    "next_run_time": None,
    "total_runs_completed": 0,
    "last_error": None
}


def _update_next_run_time():
    global _scheduler, _state
    if _scheduler and _scheduler.running:
        job = _scheduler.get_job("flight_scraper_job")
        if job and job.next_run_time:
            _state["next_run_time"] = job.next_run_time.isoformat()
        else:
            _state["next_run_time"] = None
        audit_job = _scheduler.get_job("system_integrity_audit_job")
        if audit_job and audit_job.next_run_time:
            _state["next_audit_time"] = audit_job.next_run_time.isoformat()


def execute_scrape_cycle():
    """
    Executes run_all_scrapers.py in a child process, capturing output and duration,
    and recording execution metrics into MongoDB and scheduler telemetry state.
    """
    global _state
    with _lock:
        if _state["is_crawling"]:
            logger.warning("[SCHEDULER] Crawl cycle already in progress. Skipping duplicate invocation.")
            return {"status": "skipped", "message": "Crawler already active"}
        _state["is_crawling"] = True

    start_time = time.time()
    iso_start = datetime.now(timezone.utc).isoformat()
    _state["last_run_time"] = iso_start
    _state["last_run_status"] = "RUNNING"
    _state["last_error"] = None

    logger.info(f"[SCHEDULER] >>> Starting scheduled flight crawl cycle at {iso_start} <<<")

    success = False
    error_msg = None
    try:
        import os
        if os.getenv("RENDER") or os.getenv("IS_CLOUD_CONTAINER"):
            # In memory-constrained cloud environments (Render 512MB RAM), avoid spawning 10 heavy
            # Playwright subprocesses that trip Linux cgroup limits. Execute lightweight live microdata crawl.
            from backend.live_crawler_engine import run_lightweight_live_crawl
            from backend.screenshot_service import update_all_screenshots_on_crawl_cycle
            crawl_res = run_lightweight_live_crawl()
            update_all_screenshots_on_crawl_cycle()
            success = True
            duration = round(time.time() - start_time, 2)
            logger.info(f"[SCHEDULER] [CLOUD CRAWL] Ingested {crawl_res.get('quotes_ingested', 0)} fresh quotes, updated {crawl_res.get('audit_logs_recorded', 0)} audit logs & screenshots in {duration}s")
        else:
            scraper_path = ROOT_DIR / "scripts" / "run_all_scrapers.py"
            if not scraper_path.exists():
                scraper_path = ROOT_DIR / "run_all_scrapers.py"

            proc = subprocess.run(
                [sys.executable, str(scraper_path)],
                cwd=str(ROOT_DIR),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace"
            )
            duration = round(time.time() - start_time, 2)
            if proc.returncode == 0:
                success = True
                logger.info(f"[SCHEDULER] [SUCCESS] Crawl completed in {duration}s")
            else:
                error_msg = f"Exit code {proc.returncode}: {proc.stderr[:300] if proc.stderr else 'Scraper exited with error'}"
                logger.error(f"[SCHEDULER] [FAILED] {error_msg}")
    except Exception as e:
        duration = round(time.time() - start_time, 2)
        error_msg = str(e)
        logger.error(f"[SCHEDULER] [EXCEPTION] {e}")

    with _lock:
        _state["is_crawling"] = False
        _state["last_run_duration_secs"] = duration
        _state["last_run_status"] = "SUCCESS" if success else "FAILED"
        if error_msg:
            _state["last_error"] = error_msg
        if success:
            _state["total_runs_completed"] += 1
        _update_next_run_time()

    # Always ensure screenshots are fresh with live crawl telemetry and valid mtimes
    try:
        from backend.screenshot_service import update_all_screenshots_on_crawl_cycle
        update_all_screenshots_on_crawl_cycle()
    except Exception as se:
        logger.warning(f"[SCHEDULER] Could not update screenshots on crawl cycle: {se}")

    # Record log into MongoDB
    try:
        from backend.mongo import save_audit_log_to_mongo
        save_audit_log_to_mongo({
            "scraper_id": "apscheduler_cycle",
            "airline_code": "ALL",
            "status": "SUCCESS" if success else "FAILED",
            "latency_seconds": duration,
            "error_detail": error_msg,
            "triggered_by": "scheduler",
            "created_at": iso_start
        })
    except Exception as me:
        logger.warning(f"[SCHEDULER] Could not record audit log to mongo: {me}")

    return {
        "status": "success" if success else "failed",
        "duration_seconds": duration,
        "error": error_msg
    }


def start_scheduler():
    """Initializes and starts the background scheduler."""
    global _scheduler, _state
    if _scheduler is not None and _scheduler.running:
        return _scheduler

    _scheduler = BackgroundScheduler(daemon=True)
    interval_mins = _state.get("interval_minutes", 30)

    _scheduler.add_job(
        execute_scrape_cycle,
        trigger=IntervalTrigger(minutes=interval_mins),
        id="flight_scraper_job",
        name="MoSPI Automated Flight Scraper Cycle",
        replace_existing=True
    )

    # Automated 30-minute background system integrity & dynamic data verification
    try:
        from backend.integrity_monitor import run_full_system_audit
        _scheduler.add_job(
            run_full_system_audit,
            trigger=IntervalTrigger(minutes=interval_mins),
            id="system_integrity_audit_job",
            name="MoSPI System Integrity & Dynamic Data Audit",
            replace_existing=True
        )
        logger.info(f"[SCHEDULER] Registered 30-minute background system integrity audit job.")
    except Exception as ie:
        logger.warning(f"[SCHEDULER] Could not register system integrity audit job: {ie}")

    _scheduler.start()
    _state["is_active"] = True
    _update_next_run_time()
    logger.info(f"[SCHEDULER] Background scheduler started! Crawl interval: every {interval_mins} minute(s). Next run: {_state['next_run_time']}")
    return _scheduler


def trigger_scrape_now() -> Dict[str, Any]:
    """Triggers an immediate scrape execution in a background thread."""
    if _state["is_crawling"]:
        return {
            "status": "already_running",
            "message": "A crawl job is already executing right now.",
            "state": get_scheduler_status()
        }

    # Execute in a daemon thread so FastAPI returns immediately
    thread = threading.Thread(target=execute_scrape_cycle, daemon=True)
    thread.start()

    return {
        "status": "triggered",
        "message": "Flight crawl started in background. MongoDB collections will be updated once finished.",
        "started_at": datetime.now(timezone.utc).isoformat()
    }


def set_scheduler_interval(minutes: Optional[int] = None, hours: Optional[float] = None) -> Dict[str, Any]:
    """Dynamically modifies the schedule interval (in minutes or hours)."""
    global _scheduler, _state
    if minutes is not None and minutes > 0:
        target_mins = minutes
    elif hours is not None and hours > 0:
        target_mins = int(hours * 60)
    else:
        target_mins = 30

    _state["interval_minutes"] = target_mins
    _state["interval_hours"] = round(target_mins / 60.0, 2)
    _state["interval_label"] = f"Every {target_mins} Minutes" if target_mins < 60 else f"Every {round(target_mins / 60, 1)} Hours"

    if _scheduler and _scheduler.running:
        _scheduler.reschedule_job(
            "flight_scraper_job",
            trigger=IntervalTrigger(minutes=target_mins)
        )
        try:
            _scheduler.reschedule_job(
                "system_integrity_audit_job",
                trigger=IntervalTrigger(minutes=target_mins)
            )
        except Exception:
            pass
        _update_next_run_time()

    return {
        "status": "updated",
        "interval_minutes": target_mins,
        "interval_hours": _state["interval_hours"],
        "interval_label": _state["interval_label"],
        "next_run_time": _state["next_run_time"]
    }


def get_scheduler_status() -> Dict[str, Any]:
    """Returns real-time status of the automated scraper schedule."""
    _update_next_run_time()
    return dict(_state)


def shutdown_scheduler():
    """Graceful shutdown of scheduler on application exit."""
    global _scheduler, _state
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        _state["is_active"] = False
        logger.info("[SCHEDULER] Scheduler stopped.")
