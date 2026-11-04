import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { SharedService } from '../sharedService/shared.service';
import { ReviewResponse } from '../../models/dto/reviewDTO/reviewResponse.model';
import { ReviewRequest } from '../../models/dto/reviewDTO/reviewRequest.model';
import {MinimizedReviewResponse} from '../../models/dto/reviewDTO/minimizedReviewResponse.model';
import {ProductReviewsResponse} from '../../models/dto/reviewDTO/productReviewsResponse.model';
import {PageResponse} from '../../models/page.model';
import {LikeStatus} from '../../models/dto/like-status.model';
import {GuestDeviceService} from '../guestDeviceService/guest-device.service';
import {TokenService} from '../tokenService/token.service';


@Injectable({
  providedIn: 'root'
})

export class ReviewService {

  private readonly reviewUrl: string;

  constructor(
    private sharedService: SharedService,
    private http: HttpClient,
    private guestDevice: GuestDeviceService,
    private tokenService: TokenService
  ) {
    this.reviewUrl = `${this.sharedService.publicUrl}/reviews`;
  }

  getReviewsByProductId(
    productId: number,
    page = 0,
    size = 10
  ): Observable<ProductReviewsResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<ProductReviewsResponse>(
      `${this.reviewUrl}/product/${productId}`,
      { params }
    );
  }

  getMyReviews(
    page: number = 0,
    size: number = 10
  ): Observable<PageResponse<MinimizedReviewResponse>> {

    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http.get<PageResponse<MinimizedReviewResponse>>(
      `${this.reviewUrl}/my`,
      { params }
    );
  }

  createReview(request: ReviewRequest): Observable<ReviewResponse> {
    // The device id is only created when a guest actually writes something
    const deviceId = this.tokenService.getToken() ? null : this.guestDevice.getOrCreateDeviceId();
    return this.http.post<ReviewResponse>(this.reviewUrl, request, { headers: this.deviceHeaders(deviceId) });
  }

  updateReview(id: number, request: ReviewRequest): Observable<ReviewResponse> {
    return this.http.put<ReviewResponse>(`${this.reviewUrl}/${id}`, request, { headers: this.deviceHeaders() });
  }

  deleteReview(id: number): Observable<void> {
    return this.http.delete<void>(`${this.reviewUrl}/${id}`, { headers: this.deviceHeaders() });
  }

  // Null for logged-in visitors and for browsers that never wrote a guest review
  getGuestReview(productId: number): Observable<ReviewResponse | null> {
    const deviceId = this.guestDevice.getDeviceId();
    if (this.tokenService.getToken() || !deviceId) return of(null);

    return this.http.get<ReviewResponse | null>(
      `${this.reviewUrl}/product/${productId}/mine`,
      { headers: this.deviceHeaders(deviceId) }
    );
  }

  private deviceHeaders(deviceId = this.guestDevice.getDeviceId()): HttpHeaders {
    return deviceId ? new HttpHeaders({ 'X-Device-Id': deviceId }) : new HttpHeaders();
  }

  // Like review
  addLike(reviewId: number): Observable<LikeStatus> {
    return this.http.post<LikeStatus>(
      `${this.reviewUrl}/${reviewId}/likes`,
      {}
    );
  }

  // Remove like
  removeLike(reviewId: number): Observable<LikeStatus> {
    return this.http.delete<LikeStatus>(
      `${this.reviewUrl}/${reviewId}/likes`
    );
  }

}
