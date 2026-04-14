from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
from datetime import datetime, timezone
import base64
import html
import json
import os

HOST = "0.0.0.0"
PORT = 9090
MAX_POST_SIZE = 2 * 1024 * 1024  # 2MB
PHOTO_DIR = "photos"
LOCATION_LOG = "location_log.txt"


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        raw_length = self.headers.get("Content-Length")
        if not raw_length:
            raise ValueError("Missing Content-Length")

        length = int(raw_length)
        if length <= 0 or length > MAX_POST_SIZE:
            raise ValueError("Invalid Content-Length")

        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            with open("index.html", "rb") as f:
                self.wfile.write(f.read())
            return

        if path == "/gallery":
            os.makedirs(PHOTO_DIR, exist_ok=True)
            images = sorted(
                [name for name in os.listdir(PHOTO_DIR) if name.lower().endswith(".png")],
                reverse=True,
            )

            cards = []
            for name in images:
                escaped = html.escape(name)
                cards.append(
                    f'<a href="/photos/{escaped}" target="_blank" rel="noopener">'
                    f'<img src="/photos/{escaped}" alt="{escaped}"></a>'
                )

            content = "".join(cards) if cards else "<p>No images captured yet.</p>"
            page = f"""<!DOCTYPE html>
<html lang=\"en\"><head><meta charset=\"UTF-8\"><title>Captured Photos</title>
<style>
body {{ font-family: Arial, sans-serif; background: #f6f7fb; margin: 0; padding: 20px; }}
h2 {{ text-align: center; }}
.gallery {{ display:flex; flex-wrap:wrap; gap:12px; justify-content:center; }}
.gallery img {{ width:300px; border-radius:10px; border:1px solid #c7ccdb; background:white; padding:6px; }}
</style></head>
<body><h2>📸 Captured Photos</h2><div class=\"gallery\">{content}</div></body></html>"""

            body = page.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if path.startswith("/photos/"):
            filename = os.path.basename(path.removeprefix("/photos/"))
            safe_path = os.path.join(PHOTO_DIR, filename)
            if not os.path.isfile(safe_path):
                self.send_error(404, "Not Found")
                return
            with open(safe_path, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        self.send_error(404, "Not Found")

    def do_POST(self):
        if self.path == "/log":
            try:
                payload = self._read_json_body()
                lat = float(payload["lat"])
                lon = float(payload["lon"])

                if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    raise ValueError("Coordinates out of range")

                ts = datetime.now(timezone.utc).isoformat()
                with open(LOCATION_LOG, "a", encoding="utf-8") as f:
                    f.write(f"{ts} | Latitude: {lat}, Longitude: {lon}\n")

                self._send_json(200, {"ok": True})
            except Exception as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            return

        if self.path == "/upload":
            try:
                payload = self._read_json_body()
                image_field = payload.get("image", "")

                if not image_field.startswith("data:image/png;base64,"):
                    raise ValueError("Only PNG data URL is accepted")

                b64_data = image_field.split(",", 1)[1]
                image_bytes = base64.b64decode(b64_data, validate=True)

                os.makedirs(PHOTO_DIR, exist_ok=True)
                filename = datetime.now().strftime("%Y%m%d-%H%M%S-%f.png")
                out_path = os.path.join(PHOTO_DIR, filename)

                with open(out_path, "wb") as f:
                    f.write(image_bytes)

                self._send_json(200, {"ok": True, "file": out_path})
            except Exception as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            return

        self.send_error(404, "Not Found")


if __name__ == "__main__":
    print("[*] Starting Camera + Location Consent Demo server...")
    server = HTTPServer((HOST, PORT), Handler)
    print(f"[*] Server running at http://{HOST}:{PORT}")
    server.serve_forever()
