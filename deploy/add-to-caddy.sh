#!/usr/bin/env bash
# Adds reviewhood.tech to the backend's Caddy with a live reload, so the API isn't restarted.
# Run from the frontend repo:
#   scp deploy/Caddyfile.frontend tunirate:/tmp/ && ssh tunirate 'bash -s' < deploy/add-to-caddy.sh
#
# Uses the real certificate if /opt/reviewhood-frontend/certs holds one. Otherwise it installs a temporary
# self-signed one, which is enough to test before DNS moves but won't pass Cloudflare's Full (strict) mode.
# Run it again after saving the real certificate: it swaps the certificate and reloads.
set -euo pipefail

CADDY=reviewhood-caddy-1
DIR=~/tunirate-backend/ReviewHood
CERTS=/opt/reviewhood-frontend/certs
BLOCKS=/tmp/Caddyfile.frontend

[ -f "$BLOCKS" ] || { echo "$BLOCKS is missing, scp it first"; exit 1; }

docker exec "$CADDY" mkdir -p /data/origin-certs
if sudo test -f "$CERTS/reviewhood.tech.pem" && sudo test -f "$CERTS/reviewhood.tech.key"; then
  echo "==> Installing the certificate from $CERTS"
  sudo docker cp -q "$CERTS/reviewhood.tech.pem" "$CADDY:/data/origin-certs/reviewhood.tech.pem"
  sudo docker cp -q "$CERTS/reviewhood.tech.key" "$CADDY:/data/origin-certs/reviewhood.tech.key"
elif docker exec "$CADDY" test -f /data/origin-certs/reviewhood.tech.pem; then
  echo "==> Keeping the certificate already installed"
else
  echo "==> No certificate yet, installing a TEMPORARY self-signed one"
  TMP=$(mktemp -d)
  openssl req -x509 -newkey rsa:2048 -nodes -keyout "$TMP/key" -out "$TMP/crt" -days 30 \
    -subj "/CN=TEMPORARY reviewhood.tech" -addext "subjectAltName=DNS:reviewhood.tech,DNS:www.reviewhood.tech" 2>/dev/null
  docker cp -q "$TMP/crt" "$CADDY:/data/origin-certs/reviewhood.tech.pem"
  docker cp -q "$TMP/key" "$CADDY:/data/origin-certs/reviewhood.tech.key"
  rm -rf "$TMP"
fi
docker exec "$CADDY" chmod 600 /data/origin-certs/reviewhood.tech.key

if grep -q '^reviewhood.tech {' "$DIR/Caddyfile"; then
  echo "==> The site is already in the Caddyfile"
else
  echo "==> Validating the new config on a copy"
  cat "$DIR/Caddyfile" "$BLOCKS" | docker exec -i "$CADDY" sh -c \
    'cat > /tmp/Caddyfile.test && caddy validate --config /tmp/Caddyfile.test --adapter caddyfile' >/dev/null 2>&1 \
    || { echo "Validation failed, the Caddyfile was not changed"; exit 1; }

  cp "$DIR/Caddyfile" "$DIR/Caddyfile.bak-before-frontend"
  # Append instead of replacing the file: it is bind-mounted as a single file, so a new file wouldn't reach the container
  cat "$BLOCKS" >> "$DIR/Caddyfile"
fi

echo "==> Reloading Caddy"
if ! docker exec "$CADDY" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  # A rejected reload leaves the old config running, so only the file needs restoring
  [ -f "$DIR/Caddyfile.bak-before-frontend" ] && cat "$DIR/Caddyfile.bak-before-frontend" > "$DIR/Caddyfile"
  echo "Reload failed, the Caddyfile was restored and Caddy kept its old config"
  exit 1
fi
sleep 2

R="--resolve reviewhood.tech:443:127.0.0.1 --resolve www.reviewhood.tech:443:127.0.0.1"
echo "==> Checks"
curl -sk $R https://reviewhood.tech/p/49 | grep -o 'property="og:title" content="[^"]*"'
curl -skI $R https://reviewhood.tech/p/999999 | head -1
curl -sk $R https://reviewhood.tech/ | grep -o '<title>[^<]*'
echo "sitemap URLs: $(curl -sk $R https://reviewhood.tech/sitemap.xml | grep -c '<loc>')"
curl -skI $R https://www.reviewhood.tech/p/49 | grep -iE '^(HTTP|location)'
echo "API: $(curl -sI -m 10 https://api.reviewhood.tech/feed | head -1)"
echo | openssl s_client -connect 127.0.0.1:443 -servername reviewhood.tech 2>/dev/null | openssl x509 -noout -subject -enddate
docker ps --format '{{.Names}} {{.Status}}'
