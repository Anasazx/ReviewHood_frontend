import { DOCUMENT } from '@angular/common';
import { Injectable, RESPONSE_INIT, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, TitleStrategy } from '@angular/router';
import { environment } from '../../../../environments/environment';

export interface SeoData {
  title: string;
  description?: string;
  // Absolute URL or an uploaded file name; falls back to the default share image
  image?: string | null;
  type?: 'website' | 'product' | 'profile';
  noindex?: boolean;
  jsonLd?: object | null;
}

const SITE_NAME = 'ReviewHood';
const DEFAULT_TITLE = 'ReviewHood · Honest reviews from real customers';
const DEFAULT_DESCRIPTION = 'Read honest reviews and ratings of products and companies in Tunisia, written by real customers on ReviewHood.';
const DEFAULT_IMAGE = '/assets/og-default.png';
const LOCALE = 'en_US';
const MAX_DESCRIPTION_LENGTH = 160;

// Query params that change what a page shows; anything else (utm_*, sort, ...) stays out of the canonical URL
const CANONICAL_PARAMS = ['q', 'categoryId', 'subcategoryId'];

const JSON_LD_ID = 'seo-json-ld';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly titleStrategy = inject(TitleStrategy);
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  private lastPath: string | null = null;

  set(data: SeoData): void {
    const description = this.shorten(data.description ?? DEFAULT_DESCRIPTION);
    const image = this.absoluteImage(data.image);
    const url = this.canonicalUrl();

    this.title.setTitle(data.title);
    this.meta.updateTag({ name: 'description', content: description });

    this.meta.updateTag({ property: 'og:title', content: data.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: data.type ?? 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:locale', content: LOCALE });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: data.title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    if (data.noindex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, follow' });
    } else {
      this.meta.removeTag('name="robots"');
    }

    this.setCanonical(data.noindex ? null : url);
    this.setJsonLd(data.jsonLd ?? null);
  }

  // Each page starts from the defaults, so a product's tags never outlive it during in-app navigation.
  // Query-only changes keep the tags: the page itself (search) has already set them by then.
  resetForRoute(url: string): void {
    const path = url.split(/[?#]/)[0];
    if (path === this.lastPath) return;
    this.lastPath = path;

    this.set({ title: this.titleStrategy.buildTitle(this.router.routerState.snapshot) ?? DEFAULT_TITLE });
  }

  // Status of the server-rendered response; does nothing in the browser
  setStatus(status: number): void {
    if (this.responseInit) this.responseInit.status = status;
  }

  absoluteImage(image?: string | null): string {
    if (!image) return environment.siteUrl + DEFAULT_IMAGE;
    return /^https?:\/\//.test(image) ? image : `${environment.imageUrl}/${image}`;
  }

  private canonicalUrl(): string {
    const tree = this.router.parseUrl(this.router.url);
    const params = CANONICAL_PARAMS
      .filter(key => tree.queryParams[key])
      .map(key => `${key}=${encodeURIComponent(tree.queryParams[key])}`);

    const path = this.router.url.split(/[?#]/)[0];
    return environment.siteUrl + path + (params.length ? `?${params.join('&')}` : '');
  }

  private shorten(text: string): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > MAX_DESCRIPTION_LENGTH
      ? clean.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd() + '…'
      : clean;
  }

  private setCanonical(url: string | null): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!url) {
      link?.remove();
      return;
    }

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setJsonLd(data: object | null): void {
    let script = this.document.getElementById(JSON_LD_ID);

    if (!data) {
      script?.remove();
      return;
    }

    if (!script) {
      script = this.document.createElement('script');
      script.id = JSON_LD_ID;
      script.setAttribute('type', 'application/ld+json');
      this.document.head.appendChild(script);
    }
    // Names and descriptions come from users: "<" must not be able to close the script tag
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  }
}
