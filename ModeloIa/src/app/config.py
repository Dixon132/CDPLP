from pydantic import BaseModel


class Settings(BaseModel):
    default_zone: str = "La Paz"
    alert_threshold: float = 0.20  # 20% de posts con score alto activa alerta


settings = Settings()
