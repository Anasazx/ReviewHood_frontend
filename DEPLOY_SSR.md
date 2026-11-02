# Deploying ReviewHood with SSR

The frontend moves from Cloudflare Pages to the VPS, as one more Docker container behind the Caddy
that already serves the API. Cloudflare stays in front as DNS and CDN.

```
Cloudflare -> Caddy :443 -> reviewhood-frontend:4000 -> https://api.reviewhood.tech
```

On the server, `/opt/reviewhood-frontend` holds `compose.yml`, `.env` (`BACKEND_NETWORK`), `releases/`
and a `current` link to the live release. `~/bin/deploy-frontend.sh` deploys a build and rolls back if
it doesn't start.

## Don't merge to `main` yet

An SSR build makes `browser/index.html` the prerendered home page, so Pages would serve the home page
for every URL. Merging also runs the GitHub workflow, which needs its key set up. Follow this order so
visitors only move once the VPS is proven.

## 1. Add the site to Caddy

Run from this repo. It validates on a copy first, then reloads Caddy live without restarting the API:

```bash
scp deploy/Caddyfile.frontend tunirate:/tmp/ && ssh tunirate 'bash -s' < deploy/add-to-caddy.sh
```

Then commit the Caddyfile change to the backend repo. `deploy-tunirate.sh` uses `git merge --ff-only`,
which stops the deploy if a future commit touches the Caddyfile while this edit is uncommitted.

## 2. Install the real certificate

Create a Cloudflare Origin Certificate (SSL/TLS -> Origin Server) covering `reviewhood.tech` and
`www.reviewhood.tech`. Save it on the server, without pasting the key into any chat:

```bash
ssh tunirate
sudo mkdir -p /opt/reviewhood-frontend/certs
sudo nano /opt/reviewhood-frontend/certs/reviewhood.tech.pem
sudo nano /opt/reviewhood-frontend/certs/reviewhood.tech.key
sudo chmod 600 /opt/reviewhood-frontend/certs/reviewhood.tech.key
exit
```

Then run the command from step 1 again. It swaps the certificate and reloads.

## 3. Pause Cloudflare Pages deployments

In Workers & Pages -> your project -> Settings -> Builds, pause automatic deployments. Do this before
merging, otherwise the merge publishes the broken fallback described above. Keep the project; it is
your rollback.

## 4. Switch Cloudflare

1. In the Pages project, remove the `reviewhood.tech` and `www` custom domains.
2. DNS: point `reviewhood.tech` (A) and `www` (A) at `20.199.121.198`, with the proxy on. Leave
   `api.reviewhood.tech` as it is.
3. SSL/TLS mode: **Full (strict)**.
4. Turn these off, because they rewrite HTML and can break hydration:
   - Speed -> Rocket Loader
   - Scrape Shield -> Email Address Obfuscation
5. Caching: Cloudflare doesn't cache HTML by default, and that is fine. If you add a Cache Rule for
   HTML, keep the Edge TTL at 5 minutes or less.
6. If the Facebook debugger gets blocked, check Security -> Bots. Bot Fight Mode can challenge link
   preview crawlers.

## 5. Set up the GitHub deploy key, then merge

Create a key that can only run the deploy script. On your laptop:

```bash
ssh-keygen -t ed25519 -N '' -C reviewhood-frontend-deploy -f /tmp/frontend_deploy
ssh tunirate "echo 'restrict,command=\"/home/azureuser/bin/deploy-frontend.sh\" $(cat /tmp/frontend_deploy.pub)' >> ~/.ssh/authorized_keys"
pbcopy < /tmp/frontend_deploy   # paste into the FRONTEND_DEPLOY_KEY secret below
rm /tmp/frontend_deploy /tmp/frontend_deploy.pub
```

In the `tunirate-public` repo's Settings -> Secrets and variables -> Actions, set:

- `FRONTEND_DEPLOY_KEY`: the key you just copied
- `VPS_HOST`: `20.199.121.198`

Check the live site, then merge. The merge runs the workflow for the first time, so watch it.

## 6. Check it

```bash
curl -s https://reviewhood.tech/p/49 | grep og:title
curl -sI https://reviewhood.tech/p/999999 | head -1
curl -s https://reviewhood.tech/sitemap.xml | head -5
curl -s https://reviewhood.tech/robots.txt
ssh tunirate 'docker stats --no-stream; docker logs --tail 50 reviewhood-frontend'
```

- Facebook Sharing Debugger: scrape a product URL.
- Google Search Console: URL Inspection on a product page, then submit `sitemap.xml`.

## Deploying by hand

```bash
npm run build:ssr
COPYFILE_DISABLE=1 tar -C dist/tunirate -czf - . | ssh tunirate bin/deploy-frontend.sh
```

## Good to know

- **Replace `public/assets/og-default.png`.** It is a placeholder (the logo on white, 1200x630).
- **New domains** must be added to `security.allowedHosts` in `angular.json`. Other hosts get a 400.
- **Limits:** the container is capped at 1 CPU and 512 MB in `deploy/compose.yml`, to protect the API.
- **The prerendered home page** is as fresh as the last deploy for crawlers. Browsers refresh the
  feed after loading, but the category counts stay at their build-time values. If the API is down
  during the build, the home page is prerendered without its data, so redeploy once it is back.
- **The sitemap** is cached in memory for 6 hours. Restarting the container clears it.

## Rollback

Add the custom domains back to the Pages project, resume its deployments, and revert the merge.

To remove the frontend from the VPS:

```bash
ssh tunirate
cd ~/tunirate-backend/ReviewHood
cat Caddyfile.bak-before-frontend > Caddyfile
docker exec reviewhood-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
cd /opt/reviewhood-frontend && docker compose down
```
