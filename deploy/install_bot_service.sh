#!/usr/bin/env bash
# TaxiScan Telegram bot uchun systemd service o'rnatadi.
#
# Ishlatish (serverda, loyiha ichidan):
#   sudo bash deploy/install_bot_service.sh            # foydalanuvchi: sudo chaqirgan user
#   sudo BOT_USER=www-data bash deploy/install_bot_service.sh
set -euo pipefail

SERVICE_NAME="taxiscan-bot"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/backend"
BOT_USER="${BOT_USER:-${SUDO_USER:-$(whoami)}}"

if [[ $EUID -ne 0 ]]; then
  echo "Xato: sudo bilan ishga tushiring." >&2
  exit 1
fi

if [[ ! -f "$BACKEND_DIR/manage.py" ]]; then
  echo "Xato: $BACKEND_DIR/manage.py topilmadi." >&2
  exit 1
fi

# Python: avval backend/venv, keyin loyiha/.venv
PYTHON=""
for candidate in "$BACKEND_DIR/venv/bin/python" "$BACKEND_DIR/.venv/bin/python" \
                 "$PROJECT_DIR/venv/bin/python" "$PROJECT_DIR/.venv/bin/python"; do
  if [[ -x "$candidate" ]]; then PYTHON="$candidate"; break; fi
done
if [[ -z "$PYTHON" ]]; then
  echo "Xato: virtualenv topilmadi. Avval yarating:" >&2
  echo "  cd $BACKEND_DIR && python3 -m venv venv && venv/bin/pip install -r requirements.txt" >&2
  exit 1
fi

if [[ ! -f "$BACKEND_DIR/.env" ]] || ! grep -q '^TELEGRAM_BOT_TOKEN=.\+' "$BACKEND_DIR/.env"; then
  echo "Ogohlantirish: $BACKEND_DIR/.env da TELEGRAM_BOT_TOKEN yo'q — bot ishlamaydi." >&2
fi

sed -e "s|__BACKEND_DIR__|$BACKEND_DIR|g" \
    -e "s|__PYTHON__|$PYTHON|g" \
    -e "s|__USER__|$BOT_USER|g" \
    "$SCRIPT_DIR/taxiscan-bot.service" > "/etc/systemd/system/$SERVICE_NAME.service"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo "O'rnatildi: /etc/systemd/system/$SERVICE_NAME.service"
echo "  backend: $BACKEND_DIR"
echo "  python:  $PYTHON"
echo "  user:    $BOT_USER"
echo
systemctl --no-pager status "$SERVICE_NAME" | head -n 10
echo
echo "Loglar: sudo journalctl -u $SERVICE_NAME -f"
