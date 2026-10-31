import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductResponse } from '../../../product/models/productDTO/productResponse.model';
import { ProductCardComponent } from '../../../../core/sharedComponents/product-card/product-card.component';
import { AuthService } from '../../../auth/services/authService/auth.service';
import { MinimizedReviewResponse } from '../../../../core/models/dto/reviewDTO/minimizedReviewResponse.model';
import { categoryIcon } from '../../../../core/constants/category-icons';
import { CategoryNode, CategoryTreeService, SubcategoryNode } from '../../../../core/services/categoryTreeService/category-tree.service';
import { FeedService } from '../../../../core/services/feedService/feed.service';
import { SearchBarComponent } from '../../../../core/layout/search-bar/search-bar.component';
import { CompanyResponse } from '../../../company/models/companyDTO/companyResponse.model';
import { AvatarComponent } from '../../../../core/sharedComponents/avatar/avatar.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, RouterLink, SearchBarComponent, AvatarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {

  constructor(
    private feedService: FeedService,
    private categoryTreeService: CategoryTreeService,
    public authService: AuthService
  ) {}

  products: ProductResponse[] = [];
  reviews: MinimizedReviewResponse[] = [];
  companies: CompanyResponse[] = [];

  // false until the feed answers (or fails): sections show placeholders, then hide if they came back empty
  feedLoaded = false;

  protected readonly categoryIcon = categoryIcon;

  // Categories with their subcategories for the "Browse by category" row; null while loading
  categoryTree: CategoryNode[] | null = null;

  // Biggest subcategories across all categories, shown as quick links under the hero search
  popularSubcategories: SubcategoryNode[] = [];

  ngOnInit(): void {
    this.categoryTreeService.tree$.subscribe(tree => {
      this.categoryTree = tree;
      this.popularSubcategories = tree
        .flatMap(c => c.subcategories)
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, 5);
    });

    this.loadFeed();
  }

  // ========================== CAROUSELS (desktop pages of 6) ==========================
  private paginate<T>(items: T[], pageSize = 6): T[][] {
    const pages: T[][] = [];
    for (let i = 0; i < items.length; i += pageSize) {
      pages.push(items.slice(i, i + pageSize));
    }
    return pages;
  }

  reviewPages: MinimizedReviewResponse[][] = [];
  currentPage = 0;

  get canGoLeft(): boolean {
    return this.currentPage > 0;
  }

  get canGoRight(): boolean {
    return this.currentPage < this.reviewPages.length - 1;
  }

  scrollReviews(direction: 'left' | 'right') {
    if (direction === 'left' && this.canGoLeft) {
      this.currentPage--;
    } else if (direction === 'right' && this.canGoRight) {
      this.currentPage++;
    }
  }

  productPages: ProductResponse[][] = [];
  currentProductPage = 0;

  get canGoLeftProducts(): boolean {
    return this.currentProductPage > 0;
  }

  get canGoRightProducts(): boolean {
    return this.currentProductPage < this.productPages.length - 1;
  }

  scrollProducts(direction: 'left' | 'right') {
    if (direction === 'left' && this.canGoLeftProducts) {
      this.currentProductPage--;
    } else if (direction === 'right' && this.canGoRightProducts) {
      this.currentProductPage++;
    }
  }

  companyPages: CompanyResponse[][] = [];
  currentCompanyPage = 0;

  get canGoLeftCompanies(): boolean {
    return this.currentCompanyPage > 0;
  }

  get canGoRightCompanies(): boolean {
    return this.currentCompanyPage < this.companyPages.length - 1;
  }

  scrollCompanies(direction: 'left' | 'right') {
    if (direction === 'left' && this.canGoLeftCompanies) {
      this.currentCompanyPage--;
    } else if (direction === 'right' && this.canGoRightCompanies) {
      this.currentCompanyPage++;
    }
  }

  // ========================== DATA LOADING ==========================
  loadFeed() {
    this.feedService.getFeed().subscribe({
      next: (response) => {
        this.reviews = response.reviews;
        this.products = response.products;
        this.companies = response.companies;

        this.productPages = this.paginate(this.products);
        this.reviewPages = this.paginate(this.reviews);
        this.companyPages = this.paginate(this.companies);
        this.feedLoaded = true;
      },
      error: err => {
        this.feedLoaded = true;
        console.error(err);
      }
    });
  }
}
