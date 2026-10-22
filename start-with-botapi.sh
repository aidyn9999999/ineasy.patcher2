#!/bin/sh
# Starts the local Bot API server (when TELEGRAM_API_ID/TELEGRAM_API_HASH are set) and then the app.
if [ -n "$TELEGRAM_API_ID" ] && [ -n "$TELEGRAM_API_HASH" ]; then
  mkdir -p /tmp/botapi
  telegram-bot-api --local --api-id="$TELEGRAM_API_ID" --api-hash="$TELEGRAM_API_HASH" \
    --dir=/tmp/botapi --http-port=8081 &
  i=0
  until nc -z 127.0.0.1 8081 2>/dev/null || [ $i -ge 20 ]; do
    i=$((i + 1)); sleep 1
  done
  export BOT_API_ROOT=http://127.0.0.1:8081
else
  echo "TELEGRAM_API_ID/TELEGRAM_API_HASH not set: using the cloud Bot API (videos up to 20 MB)."
fi
exec node server.js
