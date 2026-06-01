"""Test real-mode API: weekly ingestion + history + status."""
from fastapi.testclient import TestClient
from src.irec.api.main import app

c = TestClient(app)

# List all routes
routes = [(r.path, next(iter(r.methods - {"HEAD"}), "?")) for r in app.routes if hasattr(r, "path") and "/api/" in r.path]
print(f"API endpoints: {len(routes)}")
for path, method in sorted(routes):
    print(f"  {method:6} {path}")

# Test weekly ingestion
print("\n--- Weekly Ingestion Test ---")
resp = c.post("/api/ingest/weekly", json={"records": [
    {"text_content": "No puedo mas con los parciales en la Universidad Nacional, estoy agotado", "timestamp": "2026-05-30T10:00:00", "community_id": "test_uni"},
    {"text_content": "Mis companeros me ayudaron mucho, agradecido", "timestamp": "2026-05-30T12:00:00", "community_id": "test_uni"},
    {"text_content": "foto de mi perro en el parque", "timestamp": "2026-05-30T14:00:00", "community_id": "test_uni"},
]})
result = resp.json()
w = result["week"]
print(f"Week: {w['label']}")
print(f"Records: {w['records_raw']} raw, {w['records_clean']} clean")
irec_val = w["irec"].get("irec_value", 0) if w.get("irec") else 0
irec_lvl = w["irec"].get("irec_level", "?") if w.get("irec") else "?"
print(f"IREC: {irec_val:.1f} ({irec_lvl})")
print(f"Spam removed: {w['spam_removed']}")

# Test history
resp = c.get("/api/ingest/history?weeks=4")
hist = resp.json()
print(f"\nHistory: {hist['total_weeks']} weeks, {hist['total_records']} records")

# Test status
resp = c.get("/api/ingest/status")
status = resp.json()
print(f"Status: active={status['active']}, week={status['weeks_processed']}")

print("\nREAL MODE API: OK")
