# Deploying ReviewHood with SSR

The frontend moves from Cloudflare Pages to the VPS, as one more Docker container behind the Caddy
that already serves the API. Cloudflare stays in front as DNS and CDN.

```
Cloudflare -> Caddy :443 -> reviewhood-frontend:4000 -> https://api.reviewhood.tech
```

## Don't merge to `main` yet

An SSR build makes `browser/index.html` the prerendered home page, so Pages would serve the home page
for every URL. Merging also runs the GitHub workflow, which needs the VPS to be ready. Follow this
order so visitors only move once the VPS is proven.

## 1. Upload

From this repo, on the `feat/ssr-seo` branch. The build needs `https://api.reviewhood.tech` to be up,
because the home page is prerendered from it.

```bash
ssh azureuser@VPS_IP 'sudo mkdir -p /opt/reviewhood-frontend && sudo chown azureuser: /opt/reviewhood-frontend'

npm ci
npm run build:ssr

rsync -az --delete dist/tunirate/ azureuser@VPS_IP:/opt/reviewhood-frontend/dist/tunirate/
scp deploy/compose.yml deploy/Caddyfile.frontend deploy/VPS_SETUP.md azureuser@VPS_IP:/opt/reviewhood-frontend/
```

## 2. Set up the VPS

Follow `deploy/VPS_SETUP.md` on the server. It starts the container, installs a Cloudflare Origin
Certificate, adds the site to Caddy with a live reload, and tests it all before any DNS change.

Then commit the Caddyfile change to the backend repo, so a backend deploy can't overwrite it.

## 3. Pause Cloudflare Pages deployments

In Workers & Pages -> your project -> Settings -> Builds, pause automatic deployments. Do this before
merging, otherwise the merge publishes the broken fallback described above. Keep the project; it is
your rollback.

## 4. Switch Cloudflare

1. In the Pages project, remove the `reviewhood.tech` and `www` custom domains.
2. DNS: point `reviewhood.tech` (A) and `www` (A) at the VPS, with the proxy on. Leave
   `api.reviewhood.tech` as it is.
3. SSL/TLS mode: **Full (strict)**.
4. Turn these off, because they rewrite HTML and can break hydration:
   - Speed -> Rocket Loader
   - Scrape Shield -> Email Address Obfuscation
5. Caching: Cloudflare doesn't cache HTML by default, and that is fine. If you add a Cache Rule for
   HTML, keep the Edge TTL at 5 minutes or less.
6. If the Facebook debugger gets blocked, check Security -> Bots. Bot Fight Mode can challenge link
   preview crawlers.

## 5. Update the GitHub secrets, then merge

`.github/workflows/deploy-frontend.yml` now deploys to `/opt/reviewhood-frontend` as `azureuser`. In
the repo's Settings -> Secrets and variables -> Actions:

- `VPS_HOST`: this server's IP
- `VPS_SSH_KEY`: a private key whose public key is in `azureuser`'s `authorized_keys`

Check the live site, then merge. The merge runs the workflow for the first time, so watch it.

The backend repo's `deploy.yml` also still targets `ubuntu` and `systemd`, which this server doesn't
have. That is separate from this work, but check it.

## 6. Check it

```bash
curl -s https://reviewhood.tech/p/49 | grep og:title
curl -sI https://reviewhood.tech/p/999999 | head -1
curl -s https://reviewhood.tech/sitemap.xml | head -5
curl -s https://reviewhood.tech/robots.txt
ssh azureuser@VPS_IP 'docker stats --no-stream; docker logs --tail 50 reviewhood-frontend'
```

- Facebook Sharing Debugger: scrape a product URL.
- Google Search Console: URL Inspection on a product page, then submit `sitemap.xml`.

## Good to know

- **Replace `public/assets/og-default.png`.** It is a placeholder (the logo on white, 1200x630).
- **New domains** must be added to `security.allowedHosts` in `angular.json`. Other hosts get a 400.
- **Limits:** the container is capped at 1 CPU and 512 MB in `deploy/compose.yml`, to protect the API.
- **Certificate:** Cloudflare Origin Certificates last up to 15 years and don't renew through Caddy.
- **The prerendered home page** is as fresh as the last deploy for crawlers. Browsers refresh the
  feed after loading, but the category counts stay at their build-time values. If the API is down
  during the build, the home page is prerendered without its data, so redeploy once it is back.
- **The sitemap** is cached in memory for 6 hours. `docker compose restart frontend` clears it.

## Rollback

Add the custom domains back to the Pages project, resume its deployments, and revert the merge. To
remove the frontend from the VPS: restore `Caddyfile.bak-before-frontend` with `cat`, run
`caddy reload`, then `docker compose down` in `/opt/reviewhood-frontend`.
