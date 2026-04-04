#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# সহজ লাইভ আপডেট (Docker ছাড়া): git → npm build → nginx ওয়েব রুট (/var/www/html)
#
# সার্ভারে একবার SSH করে (প্রথমবার): chmod +x deploy-static.sh
#
# পরে প্রতিবার আপডেট:
#   cd /home/barabd/apps/remittance && ./deploy-static.sh
#
# শুধো sudo পাসওয়ার্ড চাইবে rsync ধাপে (অথবা নিচের NOPASSWD নোট দেখুন)।
#
# Windows (ল্যাপটপ থেকে এক ক্লিক ধরনের): .\deploy-live.ps1
# -----------------------------------------------------------------------------
set -euo pipefail

WEB_ROOT="${WEB_ROOT:-/var/www/html}"
BRANCH="${DEPLOY_BRANCH:-main}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$REPO_ROOT"
export GIT_TERMINAL_PROMPT=0

# deploy-live.ps1 পাঠায় — বিশেষ অক্ষরযুক্ত পাসওয়ার্ড সেফ
if [[ -n "${DEPLOY_SUDO_PASS_B64:-}" ]]; then
  DEPLOY_SUDO_PASS="$(printf '%s' "$DEPLOY_SUDO_PASS_B64" | base64 -d 2>/dev/null || true)"
  export DEPLOY_SUDO_PASS
  unset DEPLOY_SUDO_PASS_B64
fi

echo "======================================"
echo "  Deploy static site → $WEB_ROOT"
echo "======================================"

echo "[1/4] Git ($BRANCH)..."
git fetch origin
git reset --hard "origin/$BRANCH"

echo "[2/4] npm install..."
npm install

echo "[3/4] npm run build..."
npm run build

echo "[4/4] Publish → $WEB_ROOT ..."
if [[ -n "${DEPLOY_SUDO_PASS:-}" ]]; then
  printf '%s\n' "$DEPLOY_SUDO_PASS" | sudo -S rsync -av --delete dist/ "$WEB_ROOT/"
  unset DEPLOY_SUDO_PASS
else
  sudo rsync -av --delete dist/ "$WEB_ROOT/"
fi

echo ""
echo "✓ Done. Hard-refresh browser (Ctrl+F5) if you still see old UI."
echo ""
echo "Tip (optional, no sudo prompt): run visudo and add a line like:"
echo "  barabd ALL=(ALL) NOPASSWD: /usr/bin/rsync"
