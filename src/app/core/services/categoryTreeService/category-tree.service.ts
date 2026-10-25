import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { SharedService } from '../sharedService/shared.service';

export interface SubcategoryNode {
  id: number;
  name: string;
  productCount: number;
}

export interface CategoryNode {
  id: number;
  name: string;
  productCount: number;
  subcategories: SubcategoryNode[];
}

// Every category with its subcategories and live product counts, loaded once and shared by all pages
@Injectable({ providedIn: 'root' })
export class CategoryTreeService {
  private http = inject(HttpClient);
  private url = inject(SharedService).publicUrl + '/categories/tree';

  private readonly all$ = this.http.get<CategoryNode[]>(this.url).pipe(
    catchError(() => of([] as CategoryNode[])),
    shareReplay(1)
  );

  // Only what customers can actually browse: categories and subcategories with live products
  readonly tree$: Observable<CategoryNode[]> = this.all$.pipe(
    map(categories => categories
      .map(c => ({ ...c, subcategories: c.subcategories.filter(s => s.productCount > 0) }))
      .filter(c => c.productCount > 0)
      .sort((a, b) => b.productCount - a.productCount))
  );
}
