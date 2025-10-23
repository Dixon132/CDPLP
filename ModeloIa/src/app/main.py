from fastapi import FastAPI
from .schemas import PostIn, PostOut, BulkIn, MetricOut, AlertOut
from .pipeline import process_post, aggregate, check_alert
from .storage import STORE
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="PsicoTendencias - MVP", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "posts": len(STORE.get_posts())}


@app.post("/posts", response_model=PostOut)
def add_post(post: PostIn):
    pid, scores, z = process_post(post.text, post.zone, post.created_at)
    return {"id": pid, "text": post.text, "zone": z, "scores": scores}


@app.post("/posts/bulk")
def add_posts_bulk(payload: BulkIn):
    inserted = []
    for p in payload.posts:
        pid, scores, z = process_post(p.text, p.zone, p.created_at)
        inserted.append({"id": pid, "zone": z, "scores": scores})
    return {"inserted": inserted, "count": len(inserted)}


@app.get("/metrics", response_model=MetricOut)
def metrics(zone: str | None = None, window: str = "7d"):
    z, total, prev = aggregate(zone, window)
    return {"zone": z, "total_posts": total, "window": window, "prevalence": prev}


@app.get("/alerts", response_model=AlertOut)
def alerts(zone: str | None = None, window: str = "7d"):
    z, triggered, reason, prev = check_alert(zone, window)
    return {"zone": z, "triggered": triggered, "reason": reason, "prevalence": prev}
