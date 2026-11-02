# VPS setup: add the ReviewHood frontend behind the existing Caddy

You are on the VPS. It already runs the backend in Docker: `reviewhood-caddy-1` (holds ports 80 and
443, config in `tunirate-backend/ReviewHood/Caddyfile`), `reviewhood-api-1` and Postgres. The login
user is `azureuser`.

Goal: `Cloudflare -> Caddy :443 -> reviewhood-frontend:4000 -> https://api.reviewhood.tech`

`/opt/reviewhood-frontend` already holds `dist/tunirate`, `compose.yml`, `Caddyfile.frontend` and this
file. Nothing is built or installed on the host. No nginx, pm2 or host Node.

## Rules

- Don't change the API's Caddy block, the backend's compose file, Spring Boot or Postgres.
- Never restart or recreate `reviewhood-caddy-1`, `reviewhood-api-1` or Postgres. Use `caddy reload`
  only. It is atomic: a bad config is rejected and the old one keeps running.
- Don't touch DNS or Cloudflare. Don't commit or push anything.
- Never print a private key or ask for one to be pasted into chat.
- If something doesn't match this file, stop and ask.
- Run these steps in order. Caddy refuses a config whose certificate file is missing, so the
  certificate must be in place before the config mentions it.

## 1. Check, changing nothing

- `curl -s ifconfig.me` and `getent hosts api.reviewhood.tech`: both should show the same IP. If not,
  this may be the wrong server, so stop.
- Docker access for `azureuser` without sudo (`docker ps`). GitHub Actions will rely on it.
- `nproc` and `free -h`.
- For `reviewhood-caddy-1`, using `docker inspect`, without printing environment variables:
  - its Docker network name
  - that `/data` is a named volume or bind mount, so it survives restarts
  - how the Caddyfile is mounted (single file or folder), and the path inside the container
- `curl -sI https://api.reviewhood.tech/feed | head -1` should answer 200. Save this as the baseline.

Tell me the results and wait for my OK.

## 2. Start the frontend

```bash
cd /opt/reviewhood-frontend
echo "BACKEND_NETWORK=<the network name from step 1>" > .env
docker compose up -d
sleep 3
docker exec reviewhood-caddy-1 wget -qO- --header='Host: reviewhood.tech' http://reviewhood-frontend:4000/p/49 | grep -o '<title>[^<]*'
```

Expected: `<title>Avocado Soap: reviews and rating | ReviewHood`. This also proves the container can
reach the API from this machine. If you get "Page not found" or an empty page, check
`docker logs reviewhood-frontend` and stop.

## 3. Certificate

Ask me to create a Cloudflare Origin Certificate covering `reviewhood.tech` and
`www.reviewhood.tech`, and give me these commands to save it myself:

```bash
sudo mkdir -p /opt/reviewhood-frontend/certs
sudo nano /opt/reviewhood-frontend/certs/reviewhood.tech.pem
sudo nano /opt/reviewhood-frontend/certs/reviewhood.tech.key
sudo chmod 600 /opt/reviewhood-frontend/certs/reviewhood.tech.key
```

Wait for me to confirm. Check it without printing the key:
`sudo openssl x509 -in /opt/reviewhood-frontend/certs/reviewhood.tech.pem -noout -subject -enddate -ext subjectAltName`

Then copy both files into Caddy's data folder:

```bash
docker exec reviewhood-caddy-1 mkdir -p /data/origin-certs
sudo docker cp /opt/reviewhood-frontend/certs/reviewhood.tech.pem reviewhood-caddy-1:/data/origin-certs/reviewhood.tech.pem
sudo docker cp /opt/reviewhood-frontend/certs/reviewhood.tech.key reviewhood-caddy-1:/data/origin-certs/reviewhood.tech.key
docker exec reviewhood-caddy-1 chmod 600 /data/origin-certs/reviewhood.tech.key
```

## 4. Add the site to Caddy

Back up the Caddyfile, then append the new blocks. Use `cat >>`, not an editor or `sed -i`: if the
Caddyfile is mounted as a single file, replacing the file would hide the change from the container.

```bash
cd ~/tunirate-backend/ReviewHood   # adjust if the path differs
cp Caddyfile Caddyfile.bak-before-frontend
cat /opt/reviewhood-frontend/Caddyfile.frontend >> Caddyfile
docker exec reviewhood-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Show me the `git diff` of the Caddyfile and the validate result, and wait for my OK. If validation
fails, restore with `cat Caddyfile.bak-before-frontend > Caddyfile` and stop.

After my OK:

```bash
docker exec reviewhood-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

## 5. Test

```bash
R='--resolve reviewhood.tech:443:127.0.0.1 --resolve www.reviewhood.tech:443:127.0.0.1'
curl -sk $R https://reviewhood.tech/p/49 | grep -o 'property="og:title" content="[^"]*"'
curl -skI $R https://reviewhood.tech/p/999999 | head -1             # 404
curl -sk $R https://reviewhood.tech/ | grep -o '<title>[^<]*'
curl -sk $R https://reviewhood.tech/robots.txt | head -3
curl -sk $R https://reviewhood.tech/sitemap.xml | grep -c '<loc>'   # 800 or more
curl -skI $R https://www.reviewhood.tech/p/49 | grep -iE '^(HTTP|location)'   # 301 to reviewhood.tech
curl -sI https://api.reviewhood.tech/feed | head -1                 # must still be 200
docker stats --no-stream reviewhood-frontend reviewhood-api-1
docker logs --tail 50 reviewhood-frontend 2>&1 | grep -iE 'error|not allowed|fatal'
docker logs --since 10m reviewhood-caddy-1 2>&1 | grep -iE '"level":"error"' | tail -5
```

## 6. Report and stop

Report what you changed, each check's result, the frontend's memory use, and anything risky. Say that
the Caddyfile now has an uncommitted change that I need to commit to the backend repo, or a future
deploy could overwrite it. Then stop.
