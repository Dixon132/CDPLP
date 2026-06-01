#!/usr/bin/env python
"""
Generate synthetic datasets for all platforms using Ollama.

Usage:
    python scripts/generate_synthetic_data.py
    python scripts/generate_synthetic_data.py --platform reddit --count 50
    python scripts/generate_synthetic_data.py --all
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.irec.config import setup_logging
from src.irec.synthetic_generation import SyntheticDataGenerator


def main() -> None:
    setup_logging()

    parser = argparse.ArgumentParser(
        description="Generate synthetic social media data for IREC system."
    )
    parser.add_argument(
        "--platform",
        type=str,
        choices=["reddit", "youtube", "instagram", "tiktok", "facebook"],
        help="Generate data for a specific platform only.",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=None,
        help="Number of records to generate (overrides default).",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Generate data for all platforms.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Custom output path for JSON file.",
    )

    args = parser.parse_args()

    if not args.platform and not args.all:
        parser.print_help()
        print("\nError: Must specify --platform or --all")
        sys.exit(1)

    generator = SyntheticDataGenerator()

    if args.platform:
        output_path = Path(args.output) if args.output else None
        records = generator.generate_for_platform(
            platform=args.platform,
            count=args.count,
            output_path=output_path,
        )
        print(f"Generated {len(records)} records for {args.platform}")

    if args.all:
        results = generator.generate_all()
        for platform, records in results.items():
            print(f"  {platform}: {len(records)} records")


if __name__ == "__main__":
    main()
