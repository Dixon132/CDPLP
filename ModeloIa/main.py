"""
CDPLP - IREC System Entry Point

Usage:
    python main.py generate --all              # Generate all synthetic data
    python main.py generate --platform reddit  # Generate for one platform
    python main.py ingest                      # Run ingestion pipeline
    python main.py api                         # Start FastAPI server
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.irec.config import setup_logging


def cmd_generate(args: argparse.Namespace) -> None:
    from src.irec.synthetic_generation import SyntheticDataGenerator

    gen = SyntheticDataGenerator()
    if args.all:
        gen.generate_all()
    elif args.platform:
        output_path = Path(args.output) if args.output else None
        gen.generate_for_platform(args.platform, args.count, output_path)


def cmd_api(args: argparse.Namespace) -> None:
    import uvicorn

    from src.irec.config import settings

    uvicorn.run(
        "src.irec.api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
    )


def main() -> None:
    setup_logging()

    parser = argparse.ArgumentParser(
        description="CDPLP - IREC: Índice de Riesgo Emocional Comunitario"
    )
    sub = parser.add_subparsers(dest="command")

    # --- generate ---
    gen_parser = sub.add_parser("generate", help="Generate synthetic data")
    gen_parser.add_argument("--all", action="store_true")
    gen_parser.add_argument(
        "--platform",
        choices=["reddit", "youtube", "instagram", "tiktok", "facebook"],
    )
    gen_parser.add_argument("--count", type=int, default=None)
    gen_parser.add_argument("--output", type=str, default=None)

    # --- api ---
    api_parser = sub.add_parser("api", help="Start FastAPI server")

    args = parser.parse_args()

    if args.command == "generate":
        cmd_generate(args)
    elif args.command == "api":
        cmd_api(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
