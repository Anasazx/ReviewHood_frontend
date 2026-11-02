import { environment } from './environments/environment';

interface SitemapEntry {
  type: 'PRODUCT' | 'COMPANY';
  id: number;
  updatedAt?: string | null;
}

interface Page<T> {
  content: T[];
  last: boolean;
}

const CACHE_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;
// The backend caps page sizes at spring.data.web.pageable.max-page-size
const PAGE_SIZE = 30;
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

async function getAllIds(url: string): Promise<number[]> {
  const ids: number[] = [];
  for (let page = 0; ; page++) {
    const result = await getJson<Page<{ id: number }>>(`${url}?page=${page}&size=${PAGE_SIZE}&sort=id,asc`);
    ids.push(...result.content.map(item => item.id));
    if (result.last) return ids;
  }
}

// Uses the lightweight endpoint from BACKEND_TODO.md once it exists, the public list endpoints until then
async function getEntries(): Promise<SitemapEntry[]> {
  try {
    return await getJson<SitemapEntry[]>(`${environment.publicUrl}/public/sitemap`);
  } catch {
    const products = await getAllIds(`${environment.publicUrl}/product`);
    const companies = await getAllIds(`${environment.publicUrl}/company/all`);
    return [
      ...products.map((id): SitemapEntry => ({ type: 'PRODUCT', id })),
      ...companies.map((id): SitemapEntry => ({ type: 'COMPANY', id }))
    ];
  }
}

function urlTag(path: string, updatedAt?: string | null): string {
  const lastmod = updatedAt ? `<lastmod>${updatedAt.slice(0, 10)}</lastmod>` : '';
  return `  <url><loc>${environment.siteUrl}${path}</loc>${lastmod}</url>`;
}

async function buildXml(): Promise<string> {
  const entries = await getEntries();
  const urls = [
    ...STATIC_PATHS.map(path => urlTag(path)),
    ...entries.map(entry => urlTag(`/${entry.type === 'PRODUCT' ? 'p' : 'c'}/${entry.id}`, entry.updatedAt))
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
