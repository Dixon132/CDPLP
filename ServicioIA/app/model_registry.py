"""Registro de modelos cargados una sola vez al arranque del Servicio_IA.

El objetivo de este módulo es desacoplar *qué* modelos se cargan y *cómo* se
cargan, de forma que:

- en producción, el ``lifespan`` de FastAPI invoque un cargador que prepare los
  modelos reales (Sentence Transformers / Transformers / spaCy, etc.) una única
  vez; y
- en pruebas (tarea 5.2) se pueda inyectar un cargador alternativo con modelos
  pequeños o dobles deterministas, sin descargar pesos ni usar GPU.

El registro mantiene metadatos consultables por el endpoint ``GET /health``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Protocol

from .config import Settings


@dataclass
class LoadedModel:
    """Descriptor de un modelo cargado en el registro."""

    name: str
    kind: str = "embedding"
    ready: bool = True
    handle: Any = None


@dataclass
class ModelRegistry:
    """Contenedor de los modelos cargados al arranque.

    Es independiente del framework y trivial de inspeccionar en pruebas.
    """

    device: str = "cpu"
    _models: dict[str, LoadedModel] = field(default_factory=dict)

    def add(self, model: LoadedModel) -> None:
        """Registra (o reemplaza) un modelo por su nombre."""
        self._models[model.name] = model

    def names(self) -> list[str]:
        """Nombres de los modelos cargados, en orden de inserción."""
        return list(self._models.keys())

    def get(self, name: str) -> LoadedModel | None:
        """Devuelve el descriptor de un modelo o ``None`` si no existe."""
        return self._models.get(name)

    @property
    def all_ready(self) -> bool:
        """``True`` si todos los modelos registrados están listos."""
        return all(m.ready for m in self._models.values())

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._models)


class ModelLoader(Protocol):
    """Firma de un cargador de modelos inyectable en el ``lifespan``."""

    def __call__(self, settings: Settings) -> ModelRegistry: ...


def default_model_loader(settings: Settings) -> ModelRegistry:
    """Cargador por defecto: registra los modelos declarados en settings.

    En este andamiaje se registran los descriptores de los modelos sin forzar la
    descarga de pesos pesados, manteniendo el arranque liviano y determinista.
    La carga real de cada librería se conecta en su servicio correspondiente
    (``app/services/*``) en tareas posteriores, reutilizando este mismo registro.
    """
    registry = ModelRegistry(device=settings.device)
    for model_name in settings.embedding_models:
        registry.add(LoadedModel(name=model_name, kind="embedding", ready=True))
    return registry


def make_loader(loader: Callable[[Settings], ModelRegistry] | None) -> ModelLoader:
    """Devuelve el cargador a usar, con ``default_model_loader`` como respaldo."""
    return loader or default_model_loader
