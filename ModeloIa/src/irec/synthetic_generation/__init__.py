from __future__ import annotations

from src.irec.synthetic_generation.generator import SyntheticDataGenerator
from src.irec.synthetic_generation.prompt_templates import build_prompt, load_prompt_template
from src.irec.synthetic_generation.scenario_templates import (
    INSTITUTIONS,
    SCENARIOS,
    get_random_scenario_context,
)

__all__ = [
    "SyntheticDataGenerator",
    "load_prompt_template",
    "build_prompt",
    "get_random_scenario_context",
    "INSTITUTIONS",
    "SCENARIOS",
]
