from .utils import score_text
from .config import settings
from .storage import STORE

DEFAULT_ZONE = settings.default_zone


def process_post(text: str, zone: str | None, created_at: str | None):
    z = zone or DEFAULT_ZONE
    scores = score_text(text)
    pid = STORE.add_post(text=text, zone=z, scores=scores, created_at=created_at)
    return pid, scores, z


def aggregate(zone: str | None, window: str = "7d"):
    z = zone or DEFAULT_ZONE
    posts = [p for p in STORE.get_posts() if p["zone"].lower() == z.lower()]
    total = len(posts)

    if total == 0:
        return z, total, {"incertidumbre": 0.0, "ansiedad": 0.0, "depresion": 0.0}

    sums = {"incertidumbre": 0.0, "ansiedad": 0.0, "depresion": 0.0}

    for p in posts:
        for k in sums.keys():
            sums[k] += 1 if p["scores"][k] >= 0.4 else 0

    prevalence = {k: round(sums[k] / total, 3) for k in sums}
    return z, total, prevalence


def check_alert(zone: str | None, window: str = "7d"):
    z, total, prev = aggregate(zone, window)
    triggered = any(v >= settings.alert_threshold for v in prev.values())
    reason = "; ".join([f"{k}:{v * 100:.1f}%" for k, v in prev.items()])
    return z, triggered, reason, prev
