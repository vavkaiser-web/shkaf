#!/usr/bin/env python3
"""Временная HTTPS-ссылка для «ШКАФа» через Cloudflare Quick Tunnel.

Зачем: браузеры ставят PWA (иконку на экран) только с HTTPS или localhost.
Скрипт поднимает туннель к локальному серверу и пишет ссылку в .public-url —
дальше приложение само покажет её в QR-коде и в разделе «Установка».
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8765
BIN = os.path.join(ROOT, ".tools", "cloudflared")
URL_FILE = os.path.join(ROOT, ".public-url")

if not os.path.exists(BIN):
    sys.exit(
        "Нет .tools/cloudflared.\n"
        "Скачайте бинарник Cloudflare Tunnel (см. README, раздел «Публичная ссылка»)\n"
        "или запустите приложение на localhost — установка там работает и без туннеля."
    )

env = dict(os.environ, HOME=os.path.join(ROOT, ".cloudflared-home"))
os.makedirs(env["HOME"], exist_ok=True)

print(f"Поднимаю HTTPS-туннель к http://127.0.0.1:{PORT} …", flush=True)
process = subprocess.Popen(
    [BIN, "tunnel", "--url", f"http://127.0.0.1:{PORT}", "--no-autoupdate"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    env=env,
)

url = None
try:
    for line in process.stdout:
        sys.stdout.write(line)
        sys.stdout.flush()
        if not url:
            match = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
            if match:
                url = match.group(0)
                with open(URL_FILE, "w", encoding="utf-8") as handle:
                    handle.write(url + "\n")
                print("\n" + "=" * 60, flush=True)
                print(f"Ссылка для установки на телефоне: {url}", flush=True)
                print("Она временная: пока этот скрипт запущен — работает.", flush=True)
                print("=" * 60 + "\n", flush=True)
except KeyboardInterrupt:
    pass
finally:
    process.terminate()
    try:
        os.remove(URL_FILE)
    except OSError:
        pass
