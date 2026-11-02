import { DOCUMENT } from '@angular/common';
import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let document: Document;
  let meta: Meta;

  const canonical = () => document.head.querySelector('link[rel="canonical"]');
  const jsonLd = () => document.getElementById('seo-json-ld');

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(SeoService);
    document = TestBed.inject(DOCUMENT);
    meta = TestBed.inject(Meta);
  });

  afterEach(() => service.set({ title: 'Karma' }));

  it('escapes "<" so a product name cannot close the JSON-LD script', () => {
    service.set({ title: 'x', jsonLd: { name: '</script><script>alert(1)</script>' } });

    expect(jsonLd()!.textContent).not.toContain('<');
    expect(JSON.parse(jsonLd()!.textContent!).name).toBe('</script><script>alert(1)</script>');
  });

  it('reuses its tags instead of adding duplicates', () => {
    service.set({ title: 'one', jsonLd: { name: 'one' } });
    service.set({ title: 'two', jsonLd: { name: 'two' } });

    expect(document.head.querySelectorAll('meta[property="og:title"]').length).toBe(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(document.querySelectorAll('#seo-json-ld').length).toBe(1);
    expect(meta.getTag('property="og:title"')!.content).toBe('two');
  });

  it('removes the canonical link and adds robots for noindex pages', () => {
    service.set({ title: 'indexable' });
    expect(canonical()).not.toBeNull();

    service.set({ title: 'hidden', noindex: true });
    expect(canonical()).toBeNull();
    expect(meta.getTag('name="robots"')!.content).toBe('noindex, follow');

    service.set({ title: 'indexable again' });
    expect(canonical()).not.toBeNull();
    expect(meta.getTag('name="robots"')).toBeNull();
  });

  it('removes JSON-LD when the next page has none', () => {
    service.set({ title: 'product', jsonLd: { name: 'product' } });
    service.set({ title: 'about' });

    expect(jsonLd()).toBeNull();
  });

  it('turns uploaded file names into absolute image URLs and keeps full URLs', () => {
    expect(service.absoluteImage('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg');
    expect(service.absoluteImage('a.jpg')).toMatch(/^https?:\/\/.+\/uploads\/a\.jpg$/);
    expect(service.absoluteImage(null)).toMatch(/\/assets\/og-default\.png$/);
  });

  it('shortens long descriptions for search results', () => {
    service.set({ title: 'x', description: 'a'.repeat(300) });

    expect(meta.getTag('name="description"')!.content.length).toBeLessThanOrEqual(160);
  });

  it('sets the response status when rendering on the server', () => {
    TestBed.resetTestingModule();
    const responseInit: ResponseInit = {};
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RESPONSE_INIT, useValue: responseInit }]
    });

    TestBed.inject(SeoService).setStatus(404);

    expect(responseInit.status).toBe(404);
  });
});
