# Deploying ReviewHood with SSR

The site now needs a running Node process. It runs on the VPS next to Spring Boot, managed by pm2,
behind nginx, with Cloudflare in front.

```
Cloudflare -> nginx :443 -> static file if one exists, otherwise Node :4000 -> api.reviewhood.tech
```

## Don't merge to `main` yet

An SSR build makes `browser/index.html` the prerendered home page. A static host with an SPA
fallback (Cloudflare Pages, or the current nginx setup) would then serve the home page for every
URL. Follow the order below so `main` only changes after the site has moved.

## 1. Prepare the VPS (once)

Needs Node 18.19 or newer (22 recommended). `server.mjs` is fully bundled, so there is no
`npm install` on the VPS.

```bash
sudo npm install -g pm2
sudo mkdir -p /var/www/tunirate-ssr
sudo chown ubuntu:ubuntu /var/www/tunirate-ssr
```

This new directory leaves `/var/www/tunirate/browser` in place as a rollback.

## 2. Build and upload

Run from this repo, on the `feat/ssr-seo` branch. The build needs `https://api.reviewhood.tech` to
be up, because the home page is prerendered from it.

```bash
npm ci
npm run build:ssr

rsync -az --delete dist/tunirate/ ubuntu@VPS_IP:/var/www/tunirate-ssr/dist/tunirate/
scp ecosystem.config.cjs ubuntu@VPS_IP:/var/www/tunirate-ssr/
```

## 3. Start the server

```bash
ssh ubuntu@VPS_IP
cd /var/www/tunirate-ssr
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
pm2 startup     # first time only: run the command it prints

curl -s localhost:4000/p/49 -H 'Host: reviewhood.tech' | grep -o '<title>[^<]*'
```

## 4. Configure nginx

Create a Cloudflare Origin Certificate (SSL/TLS -> Origin Server) and save it as
`/etc/ssl/cloudflare/reviewhood.tech.pem` and `.key`.

Copy `deploy/nginx-reviewhood.conf.example` to `/etc/nginx/sites-available/reviewhood.tech`. If a
server block for `reviewhood.tech` already exists, back it up and disable it first. Leave the
`api.reviewhood.tech` block alone.

```bash
sudo ln -s /etc/nginx/sites-available/reviewhood.tech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Test the VPS directly, before any DNS change:

```bash
curl -sk --resolve reviewhood.tech:443:VPS_IP https://reviewhood.tech/p/49 | grep og:title
curl -skI --resolve reviewhood.tech:443:VPS_IP https://reviewhood.tech/p/999999 | head -1   # 404
```

## 5. Stop the old deployments

**Cloudflare Pages.** The live site's headers look like Pages, but the repo has no Pages config, so
confirm this in the dashboard. If so, in Workers & Pages -> your project:

- Settings -> Builds: pause automatic deployments. Do this before merging, otherwise the merge
  publishes the broken SPA fallback described above.
- Keep the project; it is your rollback.

**GitHub Actions.** `.github/workflows/deploy-frontend.yml` runs on every push to `main` and only
copies the browser files. In the PR, replace its build and deploy steps with:

```yaml
      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build:ssr

      - name: Copy build to VPS
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ubuntu
          key: ${{ secrets.VPS_SSH_KEY }}
          source: dist/tunirate,ecosystem.config.cjs
          target: /var/www/tunirate-ssr

      - name: Reload SSR server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ubuntu
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/tunirate-ssr
            pm2 startOrReload ecosystem.config.cjs --update-env
            pm2 save
```

This workflow change has not been run. Watch the first deploy.

## 6. Switch Cloudflare

1. In the Pages project, remove the `reviewhood.tech` and `www` custom domains.
2. DNS: point `reviewhood.tech` (A) and `www` (A or CNAME) at the VPS, with the proxy on.
3. SSL/TLS mode: **Full (strict)**.
4. Turn these off, because they rewrite HTML and can break hydration:
   - Speed -> Rocket Loader
   - Scrape Shield -> Email Address Obfuscation
5. Caching: Cloudflare doesn't cache HTML by default, and that is fine. If you add a Cache Rule for
   HTML, keep the Edge TTL at 5 minutes or less.
6. If the Facebook debugger gets blocked, check Security -> Bots. Bot Fight Mode can challenge link
   preview crawlers.

Then merge the PR.

## 7. Check it

```bash
curl -s https://reviewhood.tech/p/49 | grep og:title
curl -sI https://reviewhood.tech/p/999999 | head -1
curl -s https://reviewhood.tech/sitemap.xml | head -5
curl -s https://reviewhood.tech/robots.txt
pm2 logs reviewhood-ssr --lines 50
```

- Facebook Sharing Debugger: scrape a product URL.
- Google Search Console: URL Inspection on a product page, then submit `sitemap.xml`.

## Good to know

- **Replace `public/assets/og-default.png`.** It is a placeholder (the logo on white, 1200x630).
- **New domains** must be added to `security.allowedHosts` in `angular.json`. Other hosts get a 400.
- **The prerendered home page** is as fresh as the last deploy for crawlers. Browsers refresh the
  feed after loading, but the category counts stay at their build-time values. If the API is down
  during the build, the home page is prerendered without its data, so redeploy once it is back.
- **The sitemap** is cached in memory for 6 hours. `pm2 reload reviewhood-ssr` clears it.

## Rollback

Point DNS back at Pages (or re-enable the old nginx block), resume Pages deployments, and revert the
merge. `pm2 delete reviewhood-ssr` stops the server.
