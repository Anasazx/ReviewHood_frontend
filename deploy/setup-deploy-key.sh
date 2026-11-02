#!/usr/bin/env bash
# Creates the key GitHub Actions deploys with, locked to ~/bin/deploy-frontend.sh on the VPS, and stores it as a
# GitHub secret. The private key is never printed and is deleted from this machine afterwards.
# Run from the frontend repo on your laptop, logged in with gh: bash deploy/setup-deploy-key.sh
set -euo pipefail

VPS_IP=20.199.121.198
DIR=$(mktemp -d)
trap 'rm -rf "$DIR"' EXIT
KEY="$DIR/frontend_deploy"

ssh-keygen -q -t ed25519 -N '' -C reviewhood-frontend-deploy -f "$KEY"
LINE="restrict,command=\"/home/azureuser/bin/deploy-frontend.sh\" $(cat "$KEY.pub")"

echo "==> Installing the public key on the VPS"
ssh tunirate "sed -i '/reviewhood-frontend-deploy/d' ~/.ssh/authorized_keys && echo '$LINE' >> ~/.ssh/authorized_keys"

echo "==> Checking the key is locked: this asks it to run whoami, and the deploy script must refuse"
OUTPUT=$(ssh -i "$KEY" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new \
  "azureuser@$VPS_IP" whoami </dev/null 2>&1 || true)
if echo "$OUTPUT" | grep -qx azureuser; then
  ssh tunirate "sed -i '/reviewhood-frontend-deploy/d' ~/.ssh/authorized_keys"
  echo "The key is NOT locked, so it was removed again"
  exit 1
fi
echo "Locked: the key could not run whoami"
# The refused run leaves an empty release folder behind
ssh tunirate 'find /opt/reviewhood-frontend/releases -mindepth 1 -maxdepth 1 -type d -empty -delete'

echo "==> Storing the GitHub secrets"
gh secret set FRONTEND_DEPLOY_KEY < "$KEY"
gh secret set VPS_HOST --body "$VPS_IP"

echo "==> Done"
gh secret list
ssh tunirate 'grep -c reviewhood-frontend-deploy ~/.ssh/authorized_keys; readlink /opt/reviewhood-frontend/current'
curl -s -m 15 -o /dev/null -w 'Live site: %{http_code}\n' https://reviewhood.tech/p/49
