import argparse
from src.emociones_ciudad.pipelines.batch_offline import run_offline_pipeline


def main():
    parser = argparse.ArgumentParser(description="Radar emocional por zonas (offline)")
    parser.add_argument(
        "--mode",
        choices=["offline"],
        default="offline",
        help="Modo de ejecución (por ahora solo offline).",
    )
    parser.add_argument(
        "--input",
        type=str,
        default=None,
        help="Ruta al CSV de entrada (opcional, usa default si no se pasa).",
    )
    parser.add_argument(
        "--zone", type=str, default=None, help="Filtrar por zona (ej: 'Miraflores')."
    )
    parser.add_argument(
        "--date", type=str, default=None, help="Filtrar por fecha (YYYY-MM-DD)."
    )

    args = parser.parse_args()

    if args.mode == "offline":
        run_offline_pipeline(
            input_path=args.input,
            filter_zone=args.zone,
            filter_date=args.date,
        )


if __name__ == "__main__":
    main()
