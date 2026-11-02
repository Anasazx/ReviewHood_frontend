import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductCardComponent } from '../../../../core/sharedComponents/product-card/product-card.component';
import { SearchService } from '../../../../core/services/searchService/search.service';
import { ProductResponse } from '../../../product/models/productDTO/productResponse.model';
import { CompanyResponse } from '../../../company/models/companyDTO/companyResponse.model';
import { CompanyStatus } from '../../../company/enums/companyStatus.enum.model';
import {ImageUrlPipe} from '../../../../core/pipes/image-url.pipe';
import {
  SuggestProductModalComponent
} from '../../../../core/sharedComponents/suggest-product-modal/suggest-product-modal.component';
import {SeoService} from '../../../../core/services/seoService/seo.service';

type SearchTab = 'all' | 'products' | 'companies';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent, ImageUrlPipe, SuggestProductModalComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private searchService: SearchService,
    private seo: SeoService
  ) {}

  query = '';
  loading = false;
  searched = false;

  activeTab: SearchTab = 'all';

  // RESULTS
  products: ProductResponse[] = [];
  companies: CompanyResponse[] = [];

  totalProducts = 0;
  totalCompanies = 0;

  // PRODUCT PAGINATION
  productPage = 0;
  productPageSize = 12;
  productsLast = false;
  loadingMoreProducts = false;

  // COMPANY PAGINATION
  companyPage = 0;
  companyPageSize = 12;
  companiesLast = false;
  loadingMoreCompanies = false;

  suggestProductOpen = false;

  ngOnInit(): void {
    console.log("component init")
    this.route.queryParamMap.subscribe(params => {
      this.query = params.get('q') || '';
      this.updateSeo();
      this.resetAndSearch();
    });
  }

  private updateSeo(): void {
    const query = this.query.trim();
    // Empty, one-letter, very long or symbol-only queries aren't pages worth indexing
    const indexable = query.length >= 2 && query.length <= 80 && /[\p{L}\p{N}]/u.test(query);

    this.seo.set(indexable ? {
      title: `${query}: search results | ReviewHood`,
      description: `Products and companies matching "${query}" on ReviewHood, with ratings and reviews from real customers.`
    } : {
      title: 'Search | ReviewHood',
      noindex: true
    });
  }

  resetAndSearch(): void {
    this.activeTab = 'all';

    this.products = [];
    this.companies = [];

    this.totalProducts = 0;
    this.totalCompanies = 0;

    this.productPage = 0;
    this.companyPage = 0;

    this.productsLast = false;
    this.companiesLast = false;

    this.searched = false;

    if (!this.query.trim()) {
      return;
    }

    this.loading = true;

    // Load first page of products
    this.searchService
      .searchProducts(this.query, 0, this.productPageSize)
      .subscribe({
        next: response => {
          console.log(response.content)
          this.products = response.content;
          this.totalProducts = response.totalElements;
          this.productsLast = response.last;

          this.checkInitialSearchFinished();
        },
        error: err => {
          console.error('Product search failed:', err);
          this.checkInitialSearchFinished();
        }
      });

    // Load first page of companies
    this.searchService
      .searchCompanies(this.query, 0, this.companyPageSize)
      .subscribe({
        next: response => {
          console.log(response.content)
          this.companies = response.content;
          this.totalCompanies = response.totalElements;
          this.companiesLast = response.last;

          this.checkInitialSearchFinished();
        },
        error: err => {
          console.error('Company search failed:', err);
          this.checkInitialSearchFinished();
        }
      });
  }

  private initialRequestsFinished = 0;

  private checkInitialSearchFinished(): void {
    this.initialRequestsFinished++;

    if (this.initialRequestsFinished >= 2) {
      this.loading = false;
      this.searched = true;
      this.initialRequestsFinished = 0;
    }
  }

  setTab(tab: SearchTab): void {
    this.activeTab = tab;

    /*
     * We already loaded page 0 for both in the All tab,
     * so switching tabs doesn't need another request.
     */
  }

  loadMoreProducts(): void {
    if (this.loadingMoreProducts || this.productsLast) {
      return;
    }

    this.loadingMoreProducts = true;

    const nextPage = this.productPage + 1;

    this.searchService
      .searchProducts(
        this.query,
        nextPage,
        this.productPageSize
      )
      .subscribe({
        next: response => {
          this.products.push(...response.content);

          this.productPage = nextPage;
          this.productsLast = response.last;

          this.loadingMoreProducts = false;
        },
        error: err => {
          console.error('Failed to load more products:', err);
          this.loadingMoreProducts = false;
        }
      });
  }

  loadMoreCompanies(): void {
    if (this.loadingMoreCompanies || this.companiesLast) {
      return;
    }

    this.loadingMoreCompanies = true;

    const nextPage = this.companyPage + 1;

    this.searchService
      .searchCompanies(
        this.query,
        nextPage,
        this.companyPageSize
      )
      .subscribe({
        next: response => {
          this.companies.push(...response.content);

          this.companyPage = nextPage;
          this.companiesLast = response.last;

          this.loadingMoreCompanies = false;
        },
        error: err => {
          console.error('Failed to load more companies:', err);
          this.loadingMoreCompanies = false;
        }
      });
  }

  onSearchSubmit(value: string): void {
    const searchValue = value.trim();

    if (!searchValue) {
      return;
    }

    this.router.navigate(['/search'], {
      queryParams: {
        q: searchValue
      }
    });
  }

  protected readonly CompanyStatus = CompanyStatus;
}
