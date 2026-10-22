#!/bin/bash
# Публичная HTTPS-ссылка для установки «ШКАФа» на телефон (PWA).
# Нужен .tools/cloudflared — см. README, раздел «Публичная ссылка».
cd "$(dirname "$0")" || exit 1
PORT=8765

if ! lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Сервер не запущен — поднимаю…"
  (python3 serve.py "$PORT" >/tmp/shkaf-server.log 2>&1 &)
  sleep 1
fi

echo "Откройте ссылку на телефоне и нажмите «Установить»."
echo "Не закрывайте это окно, пока пользуетесь ссылкой (Ctrl+C — выключить)."
echo
python3 tunnel.py "$PORT"
