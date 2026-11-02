#!/usr/bin/env bash
# The Origin certificate covers *.reviewhood.tech, so Caddy stopped managing the API's Let's Encrypt certificate.
# This adds the global option that keeps it managed, and restores the previous config if the API doesn't recover.
# Run from the frontend repo: ssh tunirate 'bash -s' < deploy/fix-api-cert.sh
set -u

CADDY=reviewhood-caddy-1
cd ~/tunirate-backend/ReviewHood

if grep -q 'ignore_loaded_certs' Caddyfile; then
  echo "The option is already in the Caddyfile"
else
  OPTION=$(mktemp)
  printf '# The Origin certificate covers *.reviewhood.tech; without this, Caddy would use it for the API too\n{\n\tauto_https ignore_loaded_certs\n}\n\n' > "$OPTION"

  echo "==> Validating on a copy"
  cat "$OPTION" Caddyfile | docker exec -i "$CADDY" sh -c \
    'cat > /tmp/Caddyfile.test && caddy validate --config /tmp/Caddyfile.test --adapter caddyfile' >/dev/null 2>&1 \
    || { echo "Validation failed, nothing was changed"; exit 1; }

  cp Caddyfile Caddyfile.bak-before-global-option
  NEW=$(mktemp)
  cat "$OPTION" Caddyfile > "$NEW"
  # Write into the existing file: it is bind-mounted as a single file, so a new file wouldn't reach the container
  cat "$NEW" > Caddyfile
fi

echo "==> Reloading Caddy"
docker exec "$CADDY" caddy reload --force --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1
echo "reload exit: $?"

RECOVERED=no
for _ in 1 2 3 4 5 6 7 8 9 10; do
  sleep 2
  if curl -s -m 6 -o /dev/null https://api.reviewhood.tech/feed; then
    RECOVERED=yes
    break
  fi
done
echo "API trusted over HTTPS: $RECOVERED"

if [ "$RECOVERED" = no ] && [ -f Caddyfile.bak-before-global-option ]; then
  cat Caddyfile.bak-before-global-option > Caddyfile
  docker exec "$CADDY" caddy reload --force --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1
  echo "The API did not recover, so the previous config was restored"
fi

echo "==> Checks"
echo | openssl s_client -connect 127.0.0.1:443 -servername api.reviewhood.tech 2>/dev/null | openssl x509 -noout -issuer -enddate
echo | openssl s_client -connect 127.0.0.1:443 -servername reviewhood.tech 2>/dev/null | openssl x509 -noout -subject
curl -s -m 10 -o /dev/null -w "API: %{http_code}\n" https://api.reviewhood.tech/feed
docker exec reviewhood-frontend wget -qO /dev/null -T 8 https://api.reviewhood.tech/feed && echo "Frontend to API: ok" || echo "Frontend to API: FAILED"
docker logs --since 2m "$CADDY" 2>&1 | grep '"level":"error"' | tail -3
docker ps --format '{{.Names}} {{.Status}}'
