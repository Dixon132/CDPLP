from typing import List, Optional, Literal
from pydantic import BaseModel, Field

Category = Literal["incertidumbre", "ansiedad", "depresion"]


class PostIn(BaseModel):
    text: str = Field(..., description="Contenido del post")
    created_at: Optional[str] = Field(None, description="ISO 8601")
    zone: Optional[str] = Field(None, description="Ej: 'La Paz' o 'Sopocachi'")


class PostOut(BaseModel):
    id: str
    text: str
    zone: str
    scores: dict


class BulkIn(BaseModel):
    posts: List[PostIn]


class MetricOut(BaseModel):
    zone: str
    total_posts: int
    window: str
    prevalence: dict


class AlertOut(BaseModel):
    zone: str
    triggered: bool
    reason: str
    prevalence: dict
