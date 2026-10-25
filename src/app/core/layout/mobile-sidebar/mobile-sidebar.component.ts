import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CategoryNode, CategoryTreeService } from '../../services/categoryTreeService/category-tree.service';
import { categoryIcon } from '../../constants/category-icons';

// Mobile drawer: main pages, then categories that expand into their subcategories
@Component({
  selector: 'app-mobile-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mobile-sidebar.component.html',
})
export class MobileSidebarComponent implements OnInit {
  @Input() open = false;
  @Output() close = new EventEmitter<void>();

  private categoryTreeService = inject(CategoryTreeService);
  private route = inject(ActivatedRoute);

  categories: CategoryNode[] = [];
  expanded: number | null = null;
  currentCategoryId: number | null = null;
  currentSubcategoryId: number | null = null;
  protected readonly categoryIcon = categoryIcon;

  ngOnInit(): void {
    this.categoryTreeService.tree$.subscribe(tree => {
      this.categories = tree;
      this.expandCurrent();
    });
    this.route.queryParamMap.subscribe(params => {
      this.currentCategoryId = params.get('categoryId') ? Number(params.get('categoryId')) : null;
      this.currentSubcategoryId = params.get('subcategoryId') ? Number(params.get('subcategoryId')) : null;
      this.expandCurrent();
    });
  }

  toggle(categoryId: number) {
    this.expanded = this.expanded === categoryId ? null : categoryId;
  }

  // Open the category the user is currently browsing
  private expandCurrent() {
    const current = this.categories.find(c => c.id === this.currentCategoryId
      || c.subcategories.some(s => s.id === this.currentSubcategoryId));
    if (current) this.expanded = current.id;
  }
}
