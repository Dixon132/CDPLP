from joblib import load
from pathlib import Path

MODEL_PATH = Path(__file__).parent / "artifacts" / "emotion_model.joblib"

model = load(MODEL_PATH)


def predict_emotion(text: str) -> str:
    return model.predict([text])[0]


if __name__ == "__main__":
    while True:
        txt = input("Texto (enter para salir): ")
        if not txt:
            break
        print("➡️ Emoción:", predict_emotion(txt))
