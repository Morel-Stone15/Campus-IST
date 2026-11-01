"""
Entry point for the CAMPUS+ Flask application.

Usage:
    python run.py                  # development server (default host/port)
    python run.py --host 0.0.0.0 --port 8080
    python run.py --production     # uses waitress (production WSGI server)
"""

import argparse
import os

from app import create_app

app = create_app(os.environ.get("FLASK_ENV", "development"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="CAMPUS+ backend server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=5000, help="Port to listen on")
    parser.add_argument(
        "--production",
        action="store_true",
        help="Use waitress production server instead of Flask dev server",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    if args.production:
        try:
            from waitress import serve

            print(f"Starting waitress server on {args.host}:{args.port} …")
            serve(app, host=args.host, port=args.port, threads=4)
        except ImportError:
            print("waitress is not installed. Falling back to Flask dev server.")
            app.run(host=args.host, port=args.port)
    else:
        print(f"Starting Flask development server on {args.host}:{args.port} …")
        app.run(host=args.host, port=args.port, debug=app.config.get("DEBUG", True))
