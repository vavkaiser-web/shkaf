#!/bin/bash
# Запуск «ШКАФа»: локальный сервер + браузер.
cd "$(dirname "$0")" || exit 1
PORT=8765

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Сервер уже запущен: http://127.0.0.1:$PORT/"
  open "http://127.0.0.1:$PORT/"
  exit 0
fi

(sleep 1; open "http://127.0.0.1:$PORT/") &
exec python3 serve.py "$PORT"
