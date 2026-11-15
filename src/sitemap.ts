import { environment } from './environments/environment';

// Only indexable pages: the backend leaves out thin products, inactive companies and empty categories
interface SitemapEntry {
  type: 'PRODUCT' | 'COMPANY' | 'CATEGORY';
  id: number;
  updatedAt?: string | null;
}

const CACHE_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;
const STATIC_PATHS = ['/', '/products', '/companies', '/categories', '/about'];

let cached: { xml: string; expiresAt: number } | null = null;
let pending: Promise<string> | null = null;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function pathOf(entry: SitemapEntry): string {
  switch (entry.type) {
    case 'PRODUCT': return `/p/${entry.id}`;
    case 'COMPANY': return `/c/${entry.id}`;
    case 'CATEGORY': return `/products?categoryId=${entry.id}`;
  }
}

function urlTag(path: string, updatedAt?: string | null): string {
  const lastmod = updatedAt ? `<lastmod>${updatedAt.slice(0, 10)}</lastmod>` : '';
  // "&" in query strings must be escaped in XML
  return `  <url><loc>${(environment.siteUrl + path).replace(/&/g, '&amp;')}</loc>${lastmod}</url>`;
}

// No fallback to the full catalog: listing every product would put the thin pages back in
async function buildXml(): Promise<string> {
  const entries = await getJson<SitemapEntry[]>(`${environment.publicUrl}/public/sitemap`);
  const urls = [
    ...STATIC_PATHS.map(path => urlTag(path)),
    ...entries.map(entry => urlTag(pathOf(entry), entry.updatedAt))
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

// Serves the last good sitemap if the API is down, and only rejects when there is nothing to serve
export async function getSitemapXml(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.xml;
  }

  pending ??= buildXml()
    .then(xml => {
      cached = { xml, expiresAt: Date.now() + CACHE_MS };
      return xml;
    })
    .catch(err => {
      if (cached) {
        console.error('Could not refresh the sitemap, serving the previous one', err);
        return cached.xml;
      }
      throw err;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}
