#!/usr/bin/env bash
# Deploys a frontend build, read from stdin as a .tar.gz of dist/tunirate, and rolls back if it doesn't start.
# Run by GitHub Actions over SSH (its key is locked to this script in ~/.ssh/authorized_keys),
# or by hand: tar -C dist/tunirate -czf - . | ssh tunirate bin/deploy-frontend.sh
set -euo pipefail

cd /opt/reviewhood-frontend

# One deploy at a time
exec 9>/tmp/deploy-reviewhood-frontend.lock
flock -n 9 || { echo "Another deploy is running"; exit 1; }

RELEASE="releases/$(date +%Y%m%d%H%M%S)"
mkdir -p "$RELEASE"
tar -xzf - -C "$RELEASE" --no-same-owner
[ -f "$RELEASE/server/server.mjs" ] || { echo "Upload has no server/server.mjs"; rm -rf "$RELEASE"; exit 1; }
chmod -R a+rX "$RELEASE"

PREVIOUS=$(readlink current || true)

start_release() {
  ln -sfn "$1" current
  docker compose up -d --force-recreate frontend
}

wait_for_start() {
  for _ in $(seq 1 30); do
    if docker exec reviewhood-frontend wget -qO /dev/null http://localhost:4000/about 2>/dev/null; then
      return 0
    fi
    sleep 1
  done
  docker logs --tail 50 reviewhood-frontend 2>&1 || true
  return 1
}

echo "==> Starting $RELEASE"
start_release "$RELEASE"
if wait_for_start; then
  echo "==> Deploy OK"
  # Keep the last three releases for rollback
  ls -1dt releases/* | tail -n +4 | xargs -r rm -rf
  exit 0
fi

echo "==> New version failed to start, rolling back"
if [ -n "$PREVIOUS" ]; then
  start_release "$PREVIOUS"
  wait_for_start && echo "Rolled back to $PREVIOUS" || echo "Rollback also failed!"
fi
exit 1
