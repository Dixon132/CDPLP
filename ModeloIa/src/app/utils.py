import re
from typing import Dict
from .nlp.lexicon_es import CATEGORIES

_word_re = re.compile(r"[\\wáéíóúñü]+", re.IGNORECASE)


def normalize_text(t: str) -> str:
    return t.lower().strip()


def score_text(text: str) -> Dict[str, float]:
    t = normalize_text(text)
    tokens = _word_re.findall(t)
    total = max(len(tokens), 1)
    scores = {}

    for cat, vocab in CATEGORIES.items():
        hits = 0
        for v in vocab:
            if v in t:
                hits += 1
        scores[cat] = min(hits / (1 + total**0.5), 1.0)

    return scores
