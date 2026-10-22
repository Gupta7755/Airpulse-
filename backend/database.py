from typing import Generator
from backend.mongo import get_mongo_db, seed_mongo_baseline_data


def get_db():
    """
    FastAPI database dependency providing the active MongoDB database instance.
    Replaces legacy SQLAlchemy Session generator.
    """
    db = get_mongo_db()
    try:
        yield db
    finally:
        pass


def init_db() -> dict:
    """
    Initializes the database by ensuring baseline DGCA corridors,
    airlines, and collections exist in MongoDB Atlas.
    """
    return seed_mongo_baseline_data(clear_existing=False)


# Legacy SQLAlchemy stubs to maintain backwards-compatibility for any un-migrated imports
class _DummyBase:
    metadata = type("Metadata", (), {"create_all": lambda *args, **kwargs: None})()

Base = _DummyBase

class _DummySession:
    def close(self): pass
    def commit(self): pass
    def rollback(self): pass
    def query(self, *args, **kwargs): return self
    def filter_by(self, *args, **kwargs): return self
    def first(self): return None
    def all(self): return []

def SessionLocal():
    return _DummySession()


