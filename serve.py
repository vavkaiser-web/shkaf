#!/usr/bin/env python3
"""ШКАФ — локальный сервер.

Кроме статики отдаёт GET /__info с адресами:
  { "lan": "http://192.168.x.x:8765/", "public": "https://...trycloudflare.com/" }
— чтобы приложение могло показать QR и ссылку, по которой телефон реально откроет шкаф.
Наружу отдаются только файлы приложения (allowlist), без служебных папок и секретов.
"""
import http.server
import json
import os
import socket
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8765

ALLOWED_FILES = {
    "/", "/index.html", "/styles.css", "/sw.js", "/manifest.webmanifest", "/favicon.ico",
}
ALLOWED_PREFIXES = ("/js/", "/assets/")


def lan_ip():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        try:
            return socket.gethostbyname(socket.gethostname())
        except OSError:
            return None
    finally:
        sock.close()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):  # noqa: N802
        path = urllib.parse.urlparse(self.path).path
        if path == "/__info":
            return self.send_info()
        if not self.is_allowed(path):
            return self.send_error(404, "Not found")
        return super().do_GET()

    def is_allowed(self, path):
        if ".." in path:
            return False
        if path.endswith("/") and path != "/":
            return False
        if path in ALLOWED_FILES:
            return True
        return any(path.startswith(prefix) for prefix in ALLOWED_PREFIXES)

    def send_info(self):
        info = {"app": "shkaf", "port": PORT}
        if self.client_address[0] in ("127.0.0.1", "::1", "::ffff:127.0.0.1"):
            ip = lan_ip()
            if ip:
                info["lan"] = f"http://{ip}:{PORT}/"
        try:
            with open(os.path.join(ROOT, ".public-url"), encoding="utf-8") as handle:
                public = handle.read().strip()
            if public.startswith("https://"):
                info["public"] = public.rstrip("/") + "/"
        except OSError:
            pass
        payload = json.dumps(info, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s — %s\n" % (self.client_address[0], fmt % args))


def main():
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"ШКАФ запущен:  http://127.0.0.1:{PORT}/")
    ip = lan_ip()
    if ip:
        print(f"С телефона:    http://{ip}:{PORT}/   (та же Wi-Fi)")
    print("Остановить: Ctrl+C")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
