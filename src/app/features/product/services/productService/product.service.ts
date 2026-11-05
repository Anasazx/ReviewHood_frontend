import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { SharedService } from '../../../../core/services/sharedService/shared.service';
import { Observable } from 'rxjs';
import { ProductResponse } from '../../models/productDTO/productResponse.model';
import { DetailedProduct } from '../../models/detailedProduct.model';
import {PageResponse} from '../../../../core/models/page.model';


@Injectable({
  providedIn: 'root'
})

export class ProductService {

  readonly productUrl: string;

  constructor(private sharedService: SharedService, private http: HttpClient) {
    this.productUrl = this.sharedService.publicUrl + "/product"
  }

  getProducts(
    page: number = 0,
    size: number = 20,
    categoryId?: number,
    subcategoryId?: number,
    sort?: string
  ): Observable<PageResponse<ProductResponse>> {

    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (categoryId) { params = params.set('categoryId', categoryId); }
    if (subcategoryId) { params = params.set('subcategoryId', subcategoryId); }
    if (sort) { params = params.set('sort', sort); }

    return this.http.get<PageResponse<ProductResponse>>(this.productUrl, { params });
  }

  getDetailedProductById(productId: number): Observable<DetailedProduct> {
    return this.http.get<DetailedProduct>(`${this.productUrl.toString()}/${productId}/details`);
  }

  getCompanyProducts(companyId: number, page: number = 0, size: number = 20, name?: string, categoryId?: number, subcategoryId?: number): Observable<PageResponse<ProductResponse>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (name) {params = params.set('name', name);}
    if (categoryId != null) {params = params.set('categoryId', categoryId);}
    if (subcategoryId != null) {params = params.set('subcategoryId', subcategoryId);}
    return this.http.get<PageResponse<ProductResponse>>(`${this.productUrl}/company/${companyId}`, { params });
  }



}
