from typing import List, Dict
from datetime import datetime
import uuid


class InMemoryStore:
    def __init__(self):
        self.posts: List[Dict] = []

    def add_post(self, text: str, zone: str, scores: Dict, created_at: str | None):
        pid = str(uuid.uuid4())
        self.posts.append(
            {
                "id": pid,
                "text": text,
                "zone": zone,
                "scores": scores,
                "created_at": created_at or datetime.utcnow().isoformat(),
            }
        )
        return pid

    def get_posts(self):
        return list(self.posts)


STORE = InMemoryStore()
