from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def load_prompt_template(name: str, prompts_dir: Path) -> str:
    """Load a prompt template file and return its content."""
    prompt_path = prompts_dir / "synthetic_generation" / f"{name}_prompt.txt"
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt template not found: {prompt_path}")

    content = prompt_path.read_text(encoding="utf-8")
    logger.info("Loaded prompt template: %s", name)
    return content


def build_prompt(template: str, count: int) -> str:
    """Fill in template placeholders."""
    return template.replace("{count}", str(count))
