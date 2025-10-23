import csv
import requests

# 📌 Ruta del CSV
CSV_PATH = "src/data/posts.csv"

# 📌 URL de la API
API_URL = "http://localhost:8000/posts/bulk"


def csv_to_api():
    posts = []

    # Leer CSV y guardar en lista
    with open(CSV_PATH, newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            posts.append(
                {
                    "text": row["text"],
                    "zone": row.get("zone", None),
                    "created_at": row.get("created_at", None),
                }
            )

    # Enviar a la API
    response = requests.post(API_URL, json={"posts": posts})

    print("\n✅ Envío completo")
    print("✔ Status:", response.status_code)
    print("✔ Respuesta:", response.json())


if __name__ == "__main__":
    csv_to_api()
