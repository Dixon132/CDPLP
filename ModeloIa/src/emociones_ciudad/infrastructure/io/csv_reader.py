# src/emociones_ciudad/infrastructure/io/csv_reader.py
from __future__ import annotations
from typing import Optional, Union, Tuple
from pathlib import Path
import pandas as pd
from ...config import settings


def _try_read(path: str) -> Tuple[pd.DataFrame, str]:
    """
    Intenta leer con varias combinaciones comunes de encoding y separador.
    Devuelve (df, method_str). Si todas fallan, lanza una excepción estándar.
    """
    errors = []
    combos = [
        ("utf-8-sig", ","),
        ("utf-8", ","),
        ("latin-1", ","),
        ("utf-8", ";"),
        ("latin-1", ";"),
    ]

    last_exc = None

    for enc, sep in combos:
        try:
            df = pd.read_csv(path, encoding=enc, sep=sep)
            return df, f"encoding={enc} sep='{sep}'"
        except Exception as e:
            last_exc = e
            errors.append((enc, sep, str(e)))

    # Si llegamos aquí, ninguna combinación funcionó
    if last_exc is None:
        raise RuntimeError(
            f"No se pudo leer el CSV en {path}. No hubo excepciones capturadas."
        )
    else:
        raise RuntimeError(
            f"No se pudo leer el CSV en {path}. Intentos fallidos:\n"
            + "\n".join([f"{enc}/{sep}: {msg}" for enc, sep, msg in errors])
        ) from last_exc


def _normalize_colname(name: str) -> str:
    """Normaliza un nombre de columna para comparaciones simples."""
    return name.strip().lower().replace("-", "_").replace(" ", "_")


def _find_column(cols: list[str], candidates: list[str]) -> Optional[str]:
    """Busca en cols (lista de nombres reales) alguna coincidencia con candidates (posibles nombres)."""
    normalized = {_normalize_colname(c): c for c in cols}
    for cand in candidates:
        nc = _normalize_colname(cand)
        if nc in normalized:
            return normalized[nc]
    return None


def load_posts_csv(path: Optional[Union[str, Path]] = None) -> pd.DataFrame:
    """
    Lee el CSV de posts y devuelve un DataFrame con columnas:
    text, zone, created_at (datetime) y una columna date (datetime.date) lista.

    Esta versión intenta detectar encoding y separador, y maneja nombres
    de columna variantes.
    """
    if path is None:
        path = settings.DEFAULT_INPUT_FILE

    # asegurar string para pandas
    path_to_read = str(path) if isinstance(path, Path) else path

    # probar lecturas con distintos encodings/separadores
    try:
        df_raw, method = _try_read(path_to_read)
    except Exception as e:
        raise FileNotFoundError(
            f"No pude leer el CSV. Intentos fallidos. Error: {e}"
        ) from e

    # mostrar info útil para debug (puedes comentar/quitar después)
    print(f"[csv_reader] leído con: {method}")
    print(f"[csv_reader] columnas encontradas: {list(df_raw.columns)}")

    # Normalizar nombres y buscar columnas esperadas
    cols = list(df_raw.columns)

    # posibles nombres de cada campo importante
    text_candidates = ["text", "texto", "mensaje", "post", "contenido"]
    zone_candidates = ["zone", "zona", "location", "localidad", "place"]
    created_candidates = [
        "created_at",
        "created at",
        "createdat",
        "created",
        "fecha",
        "fecha_hora",
        "timestamp",
        "time",
        "datetime",
        "createdat",
    ]

    text_col = _find_column(cols, text_candidates)
    zone_col = _find_column(cols, zone_candidates)
    created_col = _find_column(cols, created_candidates)

    missing = []
    if text_col is None:
        missing.append("text (posibles: " + ", ".join(text_candidates) + ")")
    if zone_col is None:
        missing.append("zone (posibles: " + ", ".join(zone_candidates) + ")")
    if created_col is None:
        missing.append("created_at (posibles: " + ", ".join(created_candidates) + ")")

    if missing:
        raise KeyError(
            "No encontré las columnas necesarias en el CSV. "
            f"Faltan: {missing}. Columnas encontradas: {cols}"
        )

    # renombrar a nombres estándar
    df = df_raw.rename(
        columns={
            text_col: "text",
            zone_col: "zone",
            created_col: "created_at",
        }
    )

    # parseo seguro a datetime
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True, errors="coerce")

    # detectar filas con parseo fallido
    n_bad = df["created_at"].isna().sum()
    if n_bad > 0:
        print(
            f"[csv_reader] advertencia: {n_bad} filas no se pudieron parsear a datetime y serán NaT"
        )

    # crear columna date para agrupar por día (devuelve datetime.date)
    df["date"] = df["created_at"].dt.date  # type: ignore[attr-defined]

    return df
