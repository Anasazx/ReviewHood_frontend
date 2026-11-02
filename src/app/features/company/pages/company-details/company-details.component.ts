import { SocialLink } from '../../models/socialLink.model';
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, NgZone, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CompanyService } from '../../services/companyService/company.service';
import { SharedService } from '../../../../core/services/sharedService/shared.service';
import { CompanyDetailResponse } from '../../models/companyDTO/companyDetailResponse.model';
import { ProductResponse } from '../../../product/models/productDTO/productResponse.model';
import { SOCIAL_ICON_MAP } from '../../../../core/mapping/social-icon-map';
import { ProductService } from '../../../product/services/productService/product.service';
import { CompanyStatus } from '../../enums/companyStatus.enum.model';
import { ImageUrlPipe } from '../../../../core/pipes/image-url.pipe';
import { ProductCardComponent } from '../../../../core/sharedComponents/product-card/product-card.component';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../../../core/services/seoService/seo.service';
import { environment } from '../../../../../environments/environment';


@Component({
  selector: 'app-company-details',
  standalone: true,
  imports: [CommonModule, ImageUrlPipe, ProductCardComponent, FormsModule],
  templateUrl: './company-details.component.html',
  styleUrl: './company-details.component.css'
})
export class CompanyDetailsComponent implements OnInit, OnDestroy, AfterViewInit {

  company?: CompanyDetailResponse;

  products: ProductResponse[] = [];

  totalProducts = 0;

  companyId!: number;
  page = 0;
  size = 21;
  last = false;
  loading = false;

  socialIconMap = SOCIAL_ICON_MAP;

  // FILTERS
  searchTerm = '';
  selectedSubcategoryId: number | null = null;

  private searchSubject = new Subject<string>();

  // HEIGHT STABILIZATION (prevents footer jump on filter change)
  @ViewChild('productsContainer') productsContainer?: ElementRef<HTMLDivElement>;
  lastProductsHeight = 0;
  private productsResizeObserver?: ResizeObserver;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private productService: ProductService,
    private ngZone: NgZone,
    public sharedService: SharedService,
    private router: Router,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.resetAndLoadProducts());

    this.route.paramMap.subscribe(params => {

      const id = Number(params.get('id'));
      if (!Number.isInteger(id) || id <= 0) {
        this.router.navigate(['/not-found'], { skipLocationChange: true });
        return;
      }

      this.companyId = id;
      this.searchTerm = '';
      this.selectedSubcategoryId = null;

      this.loadCompany();
      this.resetAndLoadProducts();

    });
  }

  ngAfterViewInit(): void {
    if (this.isBrowser && this.productsContainer) {
      this.productsResizeObserver = new ResizeObserver(entries => {
        const h = entries[0].contentRect.height;
        if (h > 0) {
          this.ngZone.run(() => (this.lastProductsHeight = h));
        }
      });
      this.productsResizeObserver.observe(this.productsContainer.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
    this.productsResizeObserver?.disconnect();
  }

  loadCompany() {
    this.companyService.getCompanyInfoById(this.companyId)
      .subscribe({
        next: (res) => {
          this.company = res;
          this.updateSeo(res);
        },
        error: (err) => {
          if (err.status === 403 || err.status === 404) {
            this.router.navigate(['/not-found'], { skipLocationChange: true });
          } else {
            // Tell crawlers to retry instead of indexing an empty page
            this.seo.setStatus(503);
            console.error(err);
          }
        }
      });
  }

  private updateSeo(company: CompanyDetailResponse): void {
    const reviewCount = company.reviewCount ?? 0;
    const hasReviews = reviewCount > 0;
    const rating = (company.averageRating ?? 0).toFixed(1);
    const reviews = `${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`;

    this.seo.set({
      title: `${company.name}: customer reviews | ReviewHood`,
      description: hasReviews
        ? `${company.name} is rated ${rating} out of 5 from ${reviews} on ReviewHood. See what customers say about its products.`
        : `Read and write customer reviews of ${company.name} and its products on ReviewHood.`,
      image: company.logoUrl,
      type: 'profile',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: company.name,
        url: `${environment.siteUrl}/c/${company.id}`,
        ...(company.description ? { description: company.description } : {}),
        ...(company.logoUrl ? { logo: this.seo.absoluteImage(company.logoUrl) } : {}),
        ...(hasReviews ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating,
            reviewCount,
            bestRating: 5,
            worstRating: 1
          }
        } : {})
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  selectSubcategory(id: number | null): void {
    if (this.selectedSubcategoryId === id) return;
    this.selectedSubcategoryId = id;
    this.resetAndLoadProducts();
  }

  private resetAndLoadProducts(): void {
    this.products = [];
    this.page = 0;
    this.last = false;
    this.loadProducts();
  }

  loadProducts() {

    if (this.loading || this.last) return;

    this.loading = true;

    this.productService
      .getCompanyProducts(this.companyId, this.page, this.size, this.searchTerm || undefined, this.selectedSubcategoryId ?? undefined)
      .subscribe({
        next: res => {

          this.products = [
            ...this.products,
            ...res.content
          ];

          this.totalProducts = res.totalElements;

          this.page++;
          this.last = res.last;
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.loading = false;
        }
      });

  }

  formatUrl(url: string): string {
    if (!url) return '#';
    return url.startsWith('http://') || url.startsWith('https://')
      ? url
      : 'https://' + url;
  }

  // ── Header helpers ──

  descriptionExpanded = false;

  get websiteLink(): SocialLink | undefined {
    return this.company?.socialLinks?.find(l => l.platform === 'WEBSITE');
  }

  get otherLinks(): SocialLink[] {
    return (this.company?.socialLinks ?? []).filter(l => l.platform !== 'WEBSITE');
  }

  // "SAUDI_ARABIA" -> "Saudi arabia"
  label(value: string | null | undefined): string {
    if (!value) return '';
    const text = value.replace(/_/g, ' ').toLowerCase();
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  initials(name: string | null | undefined): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    return parts.length ? ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() : '?';
  }

  starIcon(star: number): string {
    const rating = this.company?.averageRating ?? 0;
    if (rating >= star) return 'fa-star';
    if (rating >= star - 0.5) return 'fa-star-half-stroke';
    return 'fa-star text-slate-200';
  }

  protected readonly CompanyStatus = CompanyStatus;
}
