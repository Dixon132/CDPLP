from __future__ import annotations

import json
import logging
import random
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from src.irec.config import settings
from src.irec.synthetic_generation.prompt_templates import build_prompt, load_prompt_template

logger = logging.getLogger(__name__)

# Each platform config simulates the expected "messiness" of real data collection
PLATFORM_CONFIGS = {
    "reddit": {
        "count": 30,
        "output_subdir": "synthetic_reddit",
        "default_filename": "reddit_raw.json",
    },
    "youtube": {
        "count": 20,
        "output_subdir": "synthetic_youtube",
        "default_filename": "youtube_raw.json",
    },
    "instagram": {
        "count": 30,
        "output_subdir": "synthetic_instagram",
        "default_filename": "instagram_raw.json",
    },
    "tiktok": {
        "count": 30,
        "output_subdir": "synthetic_tiktok",
        "default_filename": "tiktok_raw.json",
    },
    "facebook": {
        "count": 20,
        "output_subdir": "synthetic_facebook",
        "default_filename": "facebook_raw.json",
    },
}


class SyntheticDataGenerator:
    """Generates realistic, messy synthetic social media data using Ollama.

    The output mimics actual data collection from APIs/scraping:
    - Fields are often missing or null
    - Comments may be empty arrays
    - Some content is spam or irrelevant
    - Data structures vary wildly by platform
    """

    def __init__(self) -> None:
        try:
            import ollama  # type: ignore
            self._ollama = ollama
        except ImportError:
            raise ImportError(
                "ollama package not installed. Run: pip install ollama"
            )

        self._client = self._ollama.Client(host=settings.ollama_base_url)
        self._model = settings.ollama_model
        self._temperature = settings.ollama_temperature
        self._max_tokens = settings.ollama_max_tokens
        self._prompts_dir = settings.prompts_dir

        logger.info(
            "SyntheticDataGenerator initialized | model=%s | host=%s",
            self._model,
            settings.ollama_base_url,
        )

    def generate_for_platform(
        self,
        platform: str,
        count: Optional[int] = None,
        output_path: Optional[Path] = None,
    ) -> list[dict[str, Any]]:
        """Generate raw synthetic data for a specific platform."""
        if platform not in PLATFORM_CONFIGS:
            raise ValueError(
                f"Unknown platform: {platform}. "
                f"Valid: {list(PLATFORM_CONFIGS.keys())}"
            )

        config = PLATFORM_CONFIGS[platform]
        n = count or config["count"]

        logger.info("Generating %d synthetic records for %s (realistic mode)", n, platform)

        template = load_prompt_template(platform, self._prompts_dir)
        prompt = build_prompt(template, n)

        try:
            response = self._client.generate(
                model=self._model,
                prompt=prompt,
                options={
                    "temperature": self._temperature,
                    "num_predict": max(self._max_tokens, n * 500),
                },
            )
        except Exception as e:
            logger.error("Ollama generation failed for %s: %s", platform, e)
            raise

        raw_output = response.get("response", "")
        records = self._parse_json_response(raw_output, platform)

        # Post-process: add realistic data collection artifacts
        records = self._inject_realistic_noise(records, platform)

        # Save
        out_path = output_path or (
            settings.data_dir / "raw" / config["output_subdir"] / config["default_filename"]
        )
        self._save_with_quality_report(records, out_path, platform)

        logger.info(
            "Generated %d records for %s | saved to %s",
            len(records), platform, out_path,
        )
        return records

    def generate_all(self) -> dict[str, list[dict[str, Any]]]:
        """Generate synthetic data for all platforms."""
        results: dict[str, list[dict[str, Any]]] = {}
        for platform in PLATFORM_CONFIGS:
            try:
                records = self.generate_for_platform(platform)
                results[platform] = records
            except Exception as e:
                logger.error("Failed to generate data for %s: %s", platform, e)
                results[platform] = []
        total = sum(len(r) for r in results.values())
        logger.info("Generation complete: %d total records across %d platforms",
                     total, len(results))
        return results

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _parse_json_response(self, raw: str, platform: str) -> list[dict[str, Any]]:
        """Extract JSON array from LLM response with multiple fallbacks."""
        try:
            data = json.loads(raw)
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass

        json_match = re.search(r"\[.*\]", raw, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group())
                if isinstance(data, list):
                    return data
            except json.JSONDecodeError:
                pass

        objects = re.findall(r"\{[^{}]*\}", raw, re.DOTALL)
        if objects:
            parsed = []
            for obj_str in objects:
                try:
                    parsed.append(json.loads(obj_str))
                except json.JSONDecodeError:
                    continue
            if parsed:
                return parsed

        logger.warning(
            "Could not parse JSON from %s response (len=%d). Preview: %s...",
            platform, len(raw), raw[:200],
        )
        return []

    def _inject_realistic_noise(
        self, records: list[dict[str, Any]], platform: str
    ) -> list[dict[str, Any]]:
        """Add collection artifacts: missing fields, encoding issues, etc."""
        config = PLATFORM_CONFIGS[platform]["expected_empty_pct"]

        for record in records:
            # Randomly remove some fields (simulate API limitations)
            if platform == "instagram":
                if random.random() < config["no_caption"]:
                    record["caption"] = None
                if random.random() < config["no_hashtags"]:
                    record["hashtags"] = []
                if random.random() < config["no_location"]:
                    record["location"] = None
                if random.random() < config["no_ocr"]:
                    record["ocr_text"] = None
                if random.random() < config["no_education_context"]:
                    record["educational_context"] = None

            elif platform == "tiktok":
                if random.random() < config["no_ocr"]:
                    record["ocr_text"] = None
                if random.random() < config["no_education_context"]:
                    record["educational_context"] = None

            elif platform == "facebook":
                if random.random() < config["no_education_context"]:
                    record["educational_context"] = None

            # Random encoding glitches (1% chance)
            if random.random() < 0.01:
                text_fields = [k for k in record if isinstance(record[k], str)]
                if text_fields:
                    field = random.choice(text_fields)
                    if record[field]:
                        # Introduce a non-breaking space or smart quote issue
                        record[field] = record[field][:50] + "\xa0" + record[field][50:]

        return records

    def _save_with_quality_report(
        self,
        records: list[dict[str, Any]],
        filepath: Path,
        platform: str,
    ) -> None:
        """Save records + generation metadata + quality report."""
        filepath.parent.mkdir(parents=True, exist_ok=True)

        # Calculate quality metrics
        quality = self._compute_quality_metrics(records, platform)

        output = {
            "metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "generator_model": self._model,
                "platform": platform,
                "record_count": len(records),
                "simulation_mode": "realistic_data_collection",
            },
            "quality_report": quality,
            "records": records,
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        # Print quality summary
        logger.info("=== Quality Report: %s ===", platform)
        for metric, value in quality.items():
            logger.info("  %s: %s", metric, value)

    def _compute_quality_metrics(
        self, records: list[dict[str, Any]], platform: str
    ) -> dict[str, Any]:
        """Compute data quality metrics to demonstrate the 'data lagoon'."""
        total = len(records)
        if total == 0:
            return {"total_records": 0, "error": "no_records"}

        metrics: dict[str, Any] = {"total_records": total}

        # Count records with various missing fields
        if platform == "instagram":
            metrics["pct_no_caption"] = round(
                sum(1 for r in records if not r.get("caption")) / total * 100, 1
            )
            metrics["pct_no_comments"] = round(
                sum(1 for r in records if not r.get("comments")) / total * 100, 1
            )
            metrics["pct_no_hashtags"] = round(
                sum(1 for r in records if not r.get("hashtags")) / total * 100, 1
            )
            metrics["pct_no_location"] = round(
                sum(1 for r in records if not r.get("location")) / total * 100, 1
            )
            metrics["pct_no_ocr"] = round(
                sum(1 for r in records if not r.get("ocr_text")) / total * 100, 1
            )
            metrics["pct_no_edu_context"] = round(
                sum(1 for r in records if not r.get("educational_context")) / total * 100, 1
            )
            metrics["pct_ads"] = round(
                sum(1 for r in records if r.get("is_ad")) / total * 100, 1
            )

        elif platform == "tiktok":
            metrics["pct_no_comments"] = round(
                sum(1 for r in records if not r.get("comments")) / total * 100, 1
            )
            metrics["pct_no_ocr"] = round(
                sum(1 for r in records if not r.get("ocr_text")) / total * 100, 1
            )
            metrics["pct_no_edu_context"] = round(
                sum(1 for r in records if not r.get("educational_context")) / total * 100, 1
            )

        elif platform == "facebook":
            metrics["pct_no_comments"] = round(
                sum(1 for r in records if not r.get("comments")) / total * 100, 1
            )
            metrics["pct_no_edu_context"] = round(
                sum(1 for r in records if not r.get("educational_context")) / total * 100, 1
            )

        elif platform == "reddit":
            metrics["pct_no_comments"] = round(
                sum(1 for r in records if not r.get("comments")) / total * 100, 1
            )

        elif platform == "youtube":
            metrics["pct_no_comments"] = round(
                sum(1 for r in records if not r.get("comments")) / total * 100, 1
            )

        return metrics
