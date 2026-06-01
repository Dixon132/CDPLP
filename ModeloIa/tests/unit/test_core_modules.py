"""Unit tests for key modules of the IREC system."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def test_sentiment_analyzer():
    from src.irec.nlp.sentiment_analyzer import analyze_sentiment

    r = analyze_sentiment("estoy muy feliz con mi carrera")
    assert r["label"] == "positivo"
    assert r["score"] > 0.5

    r = analyze_sentiment("no puedo más, estoy agotado y triste")
    assert r["label"] == "negativo"
    assert r["score"] < 0

    r = analyze_sentiment("no estoy feliz")  # negation
    assert r["label"] == "negativo"

    print("  sentiment_analyzer: OK")


def test_emotion_detector():
    from src.irec.nlp.emotion_detector import detect_emotions_detailed

    r = detect_emotions_detailed("no puedo más, parciales, sin dormir, agotado")
    assert r["dominant_emotion"] in ("estres_academico", "agotamiento_emocional")

    r = detect_emotions_detailed("me siento solo, nadie me habla en la universidad")
    assert r["dominant_emotion"] == "aislamiento_social"

    r = detect_emotions_detailed("mis compañeros me ayudaron, estoy agradecido")
    assert r["protective_present"]

    print("  emotion_detector: OK")


def test_topic_classifier():
    from src.irec.nlp.topic_classifier import classify_topic

    r = classify_topic("tengo tres parciales esta semana y no he dormido nada")
    topics = [t["topic"] for t in r]
    assert any(t in topics for t in ["estres_academico", "examenes", "insomnio_cansancio"])

    r = classify_topic("me siento solo en la universidad, no tengo amigos")
    topics = [t["topic"] for t in r]
    assert "soledad_aislamiento" in topics

    print("  topic_classifier: OK")


def test_text_cleaner():
    from src.irec.preprocessing.text_cleaner import clean_text

    assert clean_text("Hola @user mira https://ejemplo.com") == "hola [usuario] mira"
    result = clean_text("NOOOOO puedo massss!!!")
    assert "noo" in result
    assert "mass" in result

    print("  text_cleaner: OK")


def test_spam_filter():
    from src.irec.preprocessing.spam_filter import classify_spam

    is_spam, conf, reason = classify_spam("gané dinero con este método, click aquí")
    assert is_spam

    is_spam, _, _ = classify_spam("estoy cansado de estudiar")
    assert not is_spam

    print("  spam_filter: OK")


def test_risk_indicator_detector():
    from src.irec.nlp.risk_indicator_detector import detect_risk_indicators

    r = detect_risk_indicators("no puedo más, agotado, solo, sin motivación")
    assert r["risk_level"] in ("bajo", "medio", "alto", "critico")
    assert len(r["active_risks"]) >= 1

    r = detect_risk_indicators("hoy fue un buen día, me fue bien en el examen")
    assert r["risk_level"] in ("sin_riesgo", "bajo")

    print("  risk_indicator_detector: OK")


def test_community_association():
    from src.irec.community.association_scorer import get_community_summary

    r = get_community_summary("estudio ingeniería en la Universidad Nacional")
    assert r["association_level"] == "high"
    assert len(r["top_institutions"]) >= 1

    r = get_community_summary("foto de mi perro en el parque")
    assert r["association_level"] == "none"

    print("  community_association: OK")


def test_irec_calculator():
    from src.irec.risk.irec_calculator import calculate_irec

    r = calculate_irec(
        {"presion_academica": 0.7, "malestar_interno": 0.5, "social_negativo": 0.3, "protectoras": 0.1},
        persistence_score=0.8,
        trend_factor=1.15,
    )
    assert r["irec_value"] > 40
    assert r["irec_level"] in ("moderada", "elevada")

    r = calculate_irec(
        {"presion_academica": 0.1, "malestar_interno": 0.1, "protectoras": 0.8},
        persistence_score=0.0,
        trend_factor=1.0,
    )
    assert r["irec_value"] < 20
    assert r["irec_level"] == "sin_tendencia"

    print("  irec_calculator: OK")


def test_privacy_anonymizer():
    from src.irec.privacy.anonymizer import anonymize_text

    text, findings = anonymize_text("mi correo es juan@email.com y mi telefono 555-123-4567")
    assert "[CORREO]" in text
    assert any(f["category"] == "email" for f in findings)

    print("  privacy_anonymizer: OK")


def test_emoji_normalizer():
    from src.irec.preprocessing.emoji_normalizer import normalize_emoji

    result = normalize_emoji("no puedo más 😭😭")
    assert "emoji_llanto" in result

    print("  emoji_normalizer: OK")


if __name__ == "__main__":
    print("Running unit tests...")
    test_sentiment_analyzer()
    test_emotion_detector()
    test_topic_classifier()
    test_text_cleaner()
    test_spam_filter()
    test_risk_indicator_detector()
    test_community_association()
    test_irec_calculator()
    test_privacy_anonymizer()
    test_emoji_normalizer()
    print("\nALL UNIT TESTS PASSED")
