import { CommonModule } from '@angular/common';
import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductCardComponent } from '../../../../core/sharedComponents/product-card/product-card.component';
import { CategoryNode, CategoryTreeService } from '../../../../core/services/categoryTreeService/category-tree.service';
import { categoryIcon } from '../../../../core/constants/category-icons';
import {ProductService} from '../../services/productService/product.service';
import {ProductResponse} from '../../models/productDTO/productResponse.model';

type SortOption = 'relevance' | 'rating' | 'reviews' | 'newest';

@Component({
  selector: 'app-all-products',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent],
  templateUrl: './all-products.component.html',
  styleUrl: './all-products.component.css'
})
export class AllProductsComponent implements OnInit {

  constructor(
    private productService: ProductService,
    private categoryTreeService: CategoryTreeService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  products: ProductResponse[] = [];
  categories: CategoryNode[] = [];

  loading = true;
  loadingMore = false;
  showFilters = false; // mobile toggle

  protected readonly categoryIcon = categoryIcon;

  // Filter: a whole category, or one subcategory (which implies its category)
  selectedCategoryId?: number;
  selectedSubcategoryId?: number;
  sortBy: SortOption = 'relevance';

  currentPage = 0;
  pageSize = 12;
  totalElements = 0;
  isLastPage = false;

  ngOnInit(): void {
    this.categoryTreeService.tree$.subscribe(tree => this.categories = tree);

    this.route.queryParamMap.subscribe(params => {
      this.selectedSubcategoryId = params.get('subcategoryId') ? Number(params.get('subcategoryId')) : undefined;
      this.selectedCategoryId = params.get('categoryId') ? Number(params.get('categoryId')) : undefined;

      this.products = [];
      this.currentPage = 0;
      this.isLastPage = false;
      this.loading = true;
      this.loadProducts();
    });
  }

  // The category shown as open in the sidebar: the selected one, or the parent of the selected subcategory
  get activeCategory(): CategoryNode | undefined {
    if (this.selectedSubcategoryId) {
      return this.categories.find(c => c.subcategories.some(s => s.id === this.selectedSubcategoryId));
    }
    return this.categories.find(c => c.id === this.selectedCategoryId);
  }

  get activeSubcategoryName(): string | undefined {
    return this.activeCategory?.subcategories.find(s => s.id === this.selectedSubcategoryId)?.name;
  }

  get pageTitle(): string {
    return this.activeSubcategoryName ?? this.activeCategory?.name ?? 'All products';
  }

  get sortParam(): string | undefined {
    switch (this.sortBy) {
      case 'rating': return 'reviewsAvg,desc';
      case 'reviews': return 'reviewCount,desc';
      case 'newest': return 'createdAt,desc';
      default: return undefined; // relevance = no explicit sort
    }
  }

  loadProducts() {
    this.productService
      .getProducts(this.currentPage, this.pageSize, this.selectedSubcategoryId ? undefined : this.selectedCategoryId, this.selectedSubcategoryId, this.sortParam)
      .subscribe({
        next: (response) => {
          this.products.push(...response.content);
          this.totalElements = response.totalElements;
          this.isLastPage = response.last;
          this.loading = false;
          this.loadingMore = false;
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
          this.loadingMore = false;
        }
      });
  }

  loadMore() {
    if (this.isLastPage || this.loadingMore) return;
    this.loadingMore = true;
    this.currentPage++;
    this.loadProducts();
  }

  selectCategory(category: CategoryNode | null) {
    this.showFilters = false;
    this.router.navigate(['/products'], { queryParams: { categoryId: category?.id ?? null } });
  }

  selectSubcategory(subcategoryId: number) {
    this.showFilters = false;
    this.router.navigate(['/products'], { queryParams: { subcategoryId } });
  }

  setSortBy(option: SortOption) {
    this.sortBy = option;
    this.products = [];
    this.currentPage = 0;
    this.isLastPage = false;
    this.loading = true;
    this.loadProducts();
  }

  @ViewChild('resultsContainer') resultsContainer?: ElementRef<HTMLDivElement>;
  lastResultsHeight = 0;

  ngAfterViewInit() {
    if (this.resultsContainer) {
      const ro = new ResizeObserver(entries => {
        const h = entries[0].contentRect.height;
        if (h > 0) this.lastResultsHeight = h;
      });
      ro.observe(this.resultsContainer.nativeElement);
    }
  }

}
