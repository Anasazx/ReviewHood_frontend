import { MyCommentResponse } from '../../models/dto/commentDTO/myCommentResponse.model';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SharedService } from '../sharedService/shared.service';
import { CommentRequest } from '../../models/dto/commentDTO/commentRequest.model';
import { CommentResponse } from '../../models/dto/commentDTO/commentResponse.model';
import {PageResponse} from '../../models/page.model';
import {LikeStatus} from '../../models/dto/like-status.model';

@Injectable({
  providedIn: 'root'
})

export class CommentService {

  private readonly commentUrl: string;

  constructor(
    private sharedService: SharedService,
    private http: HttpClient
  ) {
    this.commentUrl = this.sharedService.publicUrl + '/comments';
  }

  //Get all comments for a review
  // The signed-in user's own comments, newest first
  getMyComments(page = 0, size = 10): Observable<PageResponse<MyCommentResponse>> {
    return this.http.get<PageResponse<MyCommentResponse>>(`${this.commentUrl}/my`, { params: { page, size } });
  }

  getCommentsByReviewId(
    reviewId: number,
    page: number = 0,
    size: number = 4
  ): Observable<PageResponse<CommentResponse>> {
    return this.http.get<PageResponse<CommentResponse>>(
      `${this.commentUrl}/review/${reviewId}?page=${page}&size=${size}`
    );
  }

  //Create comment
  createComment(reviewId: number, request: CommentRequest): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(
      `${this.commentUrl}/review/${reviewId}`,
      request
    );
  }

  //Reply to comment
  replyToComment(parentCommentId: number, request: CommentRequest): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(
      `${this.commentUrl}/reply/${parentCommentId}`,
      request
    );
  }

  // Like comment
  addLike(commentId: number): Observable<LikeStatus> {
    return this.http.post<LikeStatus>(
      `${this.commentUrl}/${commentId}/likes`,
      {}
    );
  }

  // Remove like
  removeLike(commentId: number): Observable<LikeStatus> {
    return this.http.delete<LikeStatus>(
      `${this.commentUrl}/${commentId}/likes`
    );
  }

  // Delete comment
  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.commentUrl}/${commentId}`
    );
  }

}
