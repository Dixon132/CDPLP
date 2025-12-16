import re


def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""

    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    # quita comillas dobles redundantes
    text = text.replace("“", '"').replace("”", '"')
    return text
