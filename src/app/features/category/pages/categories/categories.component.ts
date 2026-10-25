import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CategoryNode, CategoryTreeService } from '../../../../core/services/categoryTreeService/category-tree.service';
import { categoryIcon } from '../../../../core/constants/category-icons';

// Every category and its subcategories, so people can browse the whole catalog
@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './categories.component.html',
})
export class CategoriesComponent implements OnInit {
  private categoryTreeService = inject(CategoryTreeService);
  private route = inject(ActivatedRoute);
  private scroller = inject(ViewportScroller);

  categories: CategoryNode[] | null = null;
  protected readonly categoryIcon = categoryIcon;

  scrollTo(categoryId: number) {
    this.scroller.scrollToAnchor('category-' + categoryId);
  }

  ngOnInit(): void {
    this.categoryTreeService.tree$.subscribe(tree => {
      this.categories = tree;
      // Links like /categories#category-2 scroll to that category once it is rendered
      const fragment = this.route.snapshot.fragment;
      if (fragment) setTimeout(() => this.scroller.scrollToAnchor(fragment));
    });
  }
}
