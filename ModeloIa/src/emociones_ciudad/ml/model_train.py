import pandas as pd
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report
from joblib import dump
from sklearn.model_selection import train_test_split


from emociones_ciudad.infrastructure.io.csv_reader import load_posts_csv
from emociones_ciudad.nlp.emotion_rules import score_emotions


ARTIFACTS_DIR = Path(__file__).parent / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "emotion_model.joblib"


def auto_label(text: str) -> str:
    """
    Usa reglas para generar una etiqueta automática.
    """
    scores = score_emotions(text)

    if not scores or max(scores.values()) == 0:
        return "neutral"

    best_emotion = max(scores.items(), key=lambda item: item[1])[0]

    return best_emotion


def train_model(csv_path: str):
    print("📥 Cargando datos...")
    df = load_posts_csv(csv_path)

    print("🏷️ Generando etiquetas automáticas...")
    df["label"] = df["text"].apply(auto_label)

    print("📊 Distribución de etiquetas:")
    print(df["label"].value_counts())

    X = df["text"]
    y = df["label"]

    # 🔹 Split real: 70% train / 30% test
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y
    )

    # 🔹 DEFINIR PIPELINE (ANTES de usarlo)
    pipeline = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    ngram_range=(1, 2),
                    stop_words=None,  # español lo manejamos nosotros
                ),
            ),
            ("clf", LogisticRegression(max_iter=1000, class_weight="balanced")),
        ]
    )

    print("🧠 Entrenando modelo ML (train set)...")
    pipeline.fit(X_train, y_train)

    print("📈 Evaluación REAL (test set):")
    preds = pipeline.predict(X_test)
    print(classification_report(y_test, preds))

    dump(pipeline, MODEL_PATH)
    print(f"✅ Modelo guardado en {MODEL_PATH}")


if __name__ == "__main__":
    train_model("data/raw/posts_electorales.csv")
