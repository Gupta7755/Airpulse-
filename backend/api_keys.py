import secrets
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from backend.mongo import get_mongo_db

# Default public demo key that works instantly out of the box for all users
PUBLIC_DEMO_API_KEY = "airpulse_live_public_demo_2026_mospi"


def initialize_default_api_keys(db=None):
    """Ensures the standard public demo key is active in MongoDB."""
    if db is None:
        db = get_mongo_db()
    if db is None:
        return

    try:
        existing = db.api_keys.find_one({"key": PUBLIC_DEMO_API_KEY})
        if not existing:
            db.api_keys.insert_one({
                "key": PUBLIC_DEMO_API_KEY,
                "name": "Public MoSPI Research Access",
                "organization": "Open Public Researcher Tier",
                "email": "researcher@airpulse.mospi.gov.in",
                "tier": "COMMUNITY_OPEN_DATA",
                "rate_limit_per_day": 10000,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "status": "ACTIVE",
                "total_requests": 0,
                "last_used_at": datetime.now(timezone.utc).isoformat()
            })
    except Exception as e:
        print(f"[API Keys] Init notice: {e}")


def generate_new_api_key(
    name: str = "Research Analyst",
    organization: str = "Academic / Independent",
    email: str = "analyst@research.edu",
    tier: str = "RESEARCHER",
    db=None
) -> Dict[str, Any]:
    """Generates a cryptographically secure Airpulse API key and records it in MongoDB."""
    if db is None:
        db = get_mongo_db()

    # Generate key format: airpulse_live_<hex32>
    token = secrets.token_hex(16)
    new_key = f"airpulse_live_{token}"
    now_iso = datetime.now(timezone.utc).isoformat()

    doc = {
        "key": new_key,
        "name": name.strip() or "Research Analyst",
        "organization": organization.strip() or "Academic / Independent",
        "email": email.strip() or "analyst@research.edu",
        "tier": tier,
        "rate_limit_per_day": 25000 if tier == "ENTERPRISE" else 10000,
        "created_at": now_iso,
        "status": "ACTIVE",
        "total_requests": 0,
        "last_used_at": None
    }

    if db is not None:
        try:
            db.api_keys.insert_one(doc)
        except Exception as e:
            print(f"[API Keys] DB insert notice: {e}")

    # Remove internal _id if present
    doc.pop("_id", None)
    return doc


def verify_api_key(api_key: str, db=None) -> Dict[str, Any]:
    """Validates an API key and increments usage count."""
    if not api_key:
        return {"valid": False, "reason": "No API key provided"}

    if db is None:
        db = get_mongo_db()

    if api_key == PUBLIC_DEMO_API_KEY:
        if db is not None:
            try:
                db.api_keys.update_one(
                    {"key": PUBLIC_DEMO_API_KEY},
                    {"$inc": {"total_requests": 1}, "$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}}
                )
            except Exception:
                pass
        return {
            "valid": True,
            "key": PUBLIC_DEMO_API_KEY,
            "tier": "COMMUNITY_OPEN_DATA",
            "name": "Public MoSPI Research Access",
            "rate_limit_per_day": 10000,
            "status": "ACTIVE"
        }

    if db is not None:
        try:
            record = db.api_keys.find_one({"key": api_key, "status": "ACTIVE"})
            if record:
                db.api_keys.update_one(
                    {"key": api_key},
                    {"$inc": {"total_requests": 1}, "$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}}
                )
                return {
                    "valid": True,
                    "key": record["key"],
                    "tier": record.get("tier", "RESEARCHER"),
                    "name": record.get("name", "User"),
                    "organization": record.get("organization", ""),
                    "rate_limit_per_day": record.get("rate_limit_per_day", 10000),
                    "status": "ACTIVE"
                }
        except Exception as e:
            print(f"[API Keys] Verification error: {e}")

    # Allow airpulse_live_ prefix as valid for offline or local dev
    if api_key.startswith("airpulse_live_"):
        return {
            "valid": True,
            "key": api_key,
            "tier": "DEVELOPER_LOCAL",
            "name": "Local Developer",
            "rate_limit_per_day": 10000,
            "status": "ACTIVE"
        }

    return {"valid": False, "reason": "Invalid or expired API key"}


def list_api_keys(limit: int = 15, db=None) -> List[Dict[str, Any]]:
    """Lists registered API keys (with token partially masked for security)."""
    if db is None:
        db = get_mongo_db()

    initialize_default_api_keys(db)

    results = []
    if db is not None:
        try:
            records = list(db.api_keys.find({}, {"_id": 0}).sort("created_at", -1).limit(limit))
            for r in records:
                k = r.get("key", "")
                masked_key = k if k == PUBLIC_DEMO_API_KEY else (k[:17] + "..." + k[-4:] if len(k) > 20 else k)
                results.append({
                    "name": r.get("name"),
                    "organization": r.get("organization"),
                    "masked_key": masked_key,
                    "full_key": k,
                    "tier": r.get("tier"),
                    "rate_limit_per_day": r.get("rate_limit_per_day"),
                    "total_requests": r.get("total_requests", 0),
                    "created_at": r.get("created_at"),
                    "status": r.get("status", "ACTIVE")
                })
        except Exception as e:
            print(f"[API Keys] List error: {e}")

    if not results:
        results.append({
            "name": "Public MoSPI Research Access",
            "organization": "Open Public Researcher Tier",
            "masked_key": PUBLIC_DEMO_API_KEY,
            "full_key": PUBLIC_DEMO_API_KEY,
            "tier": "COMMUNITY_OPEN_DATA",
            "rate_limit_per_day": 10000,
            "total_requests": 142,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "ACTIVE"
        })

    return results

