from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Post:
    text: str
    zone: str
    created_at: datetime


@dataclass
class EmotionScore:
    ansiedad: float
    tristeza: float
    incertidumbre: float


@dataclass
class AggregatedMetrics:
    date: datetime
    zone: str
    ansiedad_mean: float
    tristeza_mean: float
    incertidumbre_mean: float
    risk_level: str  # NORMAL / ALTO / CRITICO
