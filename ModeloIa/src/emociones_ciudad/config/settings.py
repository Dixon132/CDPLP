from pathlib import Path

# sube 3 niveles desde this file:
# src/emociones_ciudad/config/settings.py
# parents[0] -> src/emociones_ciudad/config
# parents[1] -> src/emociones_ciudad
# parents[2] -> src
# parents[3] -> <project_root>
BASE_DIR = Path(__file__).resolve().parents[3]

DATA_RAW_DIR = BASE_DIR / "data" / "raw"
DEFAULT_INPUT_FILE = DATA_RAW_DIR / "posts_electorales.csv"
