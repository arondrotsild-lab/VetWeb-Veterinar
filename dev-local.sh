#!/bin/bash
# Запуск кабинета ветеринара на Mac.
# Кабинет работает с общим сервером ВетДом (папка VETWEB). Если сервер ещё не запущен — запускаем его вместе с сайтом для клиентов.
cd "$(dirname "$0")"
VETWEB="${VETWEB:-$HOME/Projects/VETWEB/artifacts/veterinarathome}"

if ! curl -s http://localhost:3001/api/health >/dev/null; then
  echo "▶ Сервер ВетДом не запущен — запускаю (сайт для клиентов: http://localhost:5173)"
  (cd "$VETWEB" && ./dev-local.sh > /tmp/vetdom-server.log 2>&1 &)
  for i in $(seq 1 60); do curl -s http://localhost:3001/api/health >/dev/null && break; sleep 1; done
fi

[ -d node_modules ] || npm install
echo "▶ Кабинет ветеринара: http://localhost:5174"
exec ./node_modules/.bin/vite --port 5174 --host 0.0.0.0
