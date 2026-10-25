import { AvatarComponent } from '../../../../core/sharedComponents/avatar/avatar.component';
import { CommonModule, Location } from '@angular/common';
import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import { ReviewResponse } from '../../../../core/models/dto/reviewDTO/reviewResponse.model';
import { DetailedProduct } from '../../models/detailedProduct.model';
import { CommentResponse } from '../../../../core/models/dto/commentDTO/commentResponse.model';
import { ProductService } from '../../services/productService/product.service';
import { SharedService } from '../../../../core/services/sharedService/shared.service';
import { ReviewService } from '../../../../core/services/reviewService/review.service';
import { CommentService } from '../../../../core/services/commentService/comment.service';
import { ReviewRequest } from '../../../../core/models/dto/reviewDTO/reviewRequest.model';
import {ReviewFormComponent} from './components/review-form/review-form.component';
import {AuthService} from '../../../auth/services/authService/auth.service';
import {AuthRequiredComponent} from '../../../../core/sharedComponents/auth-required/auth-required.component';
import {ImageUrlPipe} from '../../../../core/pipes/image-url.pipe';
import {finalize} from 'rxjs';
import {ConfirmModalComponent} from '../../../../core/sharedComponents/confirm-modal/confirm-modal.component';
import {ToastService} from '../../../../core/services/toastService/toast.service';
import {ProductRatingOverviewComponent} from './components/product-rating-overview/product-rating-overview.component';
import {ProductImageGalleryComponent} from './components/product-image-gallery/product-image-gallery.component';


type ReviewWithComments = ReviewResponse & {
  showComments?: boolean;
  comments?: CommentResponse[];
  newComment?: string;
  commentsPage?: number;
  commentsTotal?: number;
  commentsLoading?: boolean;
};

type DeleteTarget =
  | { type: 'review'; review: ReviewResponse }
  | { type: 'comment'; review: ReviewWithComments; comment: CommentResponse };

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [AvatarComponent, CommonModule, FormsModule, RouterLink, ReviewFormComponent, AuthRequiredComponent, ImageUrlPipe, ConfirmModalComponent, ProductRatingOverviewComponent, ProductImageGalleryComponent],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css',
})


export class ProductDetailsComponent implements OnInit {

  // ===================== STATE =====================
  product?: DetailedProduct;

  reviews: ReviewWithComments[] = [];

  myReview: ReviewResponse | null = null;

  reviewContent = '';
  selectedRating = 0;

  submittingReview = false;
  deletingReviewId: number | null = null;
  deletingCommentId: number | null = null;

  descExpanded = false;
  selectedImage: string | null = '';

  replyingToCommentId: number | null = null;
  replyingToActorName = '';

  totalReviews: number = 0;

  page = 0;
  size = 10;
  last = false;
  loading = false;

  productId!: number;

  currentImageIndex = 0;
  showAuthModal = false;
  commentText = '';

  // ===================== DELETE (shared for review + comment) =====================
  showDeleteModal = false;
  deleteTarget: DeleteTarget | null = null;

  // ===================== INIT =====================
  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    private location: Location,
    public sharedService: SharedService,
    private reviewService: ReviewService,
    private commentService: CommentService,
    protected authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) this.loadProduct(+productId);
  }

  // ===================== LOAD PRODUCT =====================
  loadProduct(id: number) {
    this.productId = id;

    this.productService.getDetailedProductById(id).subscribe({
      next: (data) => {

        this.product = data;
        const mainIndex = data.images?.findIndex(i => i.isMain) ?? -1;
        this.currentImageIndex = mainIndex >= 0 ? mainIndex : 0;
        this.selectedImage = data.images?.[this.currentImageIndex]?.url ?? null;

        this.loadReviews();
      },
      error: (err) => {
        if (err.status === 404) {
          this.router.navigate(['/not-found'], { skipLocationChange: true });
        } else {
          console.error(err);
        }
      }
    });
  }


  showAuthModelIfNoAuthUser(): boolean {
    if (!this.authService.getCurrentUser) {
      this.showAuthModal = true;
      return true;
    }
    return false;
  }

  // ===================== REVIEW CRUD =====================
  submitReview(request: ReviewRequest) {

    if (this.showAuthModelIfNoAuthUser()) {
      return;
    }

    this.submittingReview = true;

    const request$ = this.myReview
      ? this.reviewService.updateReview(this.myReview.id, request)
      : this.reviewService.createReview(request);

    request$.subscribe({
      next: (res) => {
        const saved = res as ReviewResponse;

        if (this.myReview) {
          this.reviews = this.reviews.map(r =>
            r.id === this.myReview!.id
              ? { ...saved, comments: r.comments, showComments: r.showComments }
              : r
          );
        } else {
          this.reviews = [
            { ...saved, comments: [], showComments: false },
            ...this.reviews
          ];
        }

        this.myReview = saved;
        this.product!.reviewsCount = this.reviews.length;
        this.product!.reviews = this.reviews;
        this.submittingReview = false;
      },
      error: err => {
        console.error(err);
        this.submittingReview = false;
      }
    });

  }

  reviewIsMine(id: number): boolean {
    return id === this.authService.getCurrentUser?.id;
  }

  // ===================== DELETE MODAL CONTROL =====================

  openDeleteModal(review: ReviewResponse) {
    this.deleteTarget = { type: 'review', review };
    this.showDeleteModal = true;
  }

  openDeleteCommentModal(review: ReviewWithComments, comment: CommentResponse) {
    this.deleteTarget = { type: 'comment', review, comment };
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.deleteTarget = null;
    this.showDeleteModal = false;
  }

  confirmDelete() {
    if (!this.deleteTarget) return;

    if (this.deleteTarget.type === 'review') {
      this.confirmDeleteReview(this.deleteTarget.review);
    } else {
      this.confirmDeleteComment(this.deleteTarget.review, this.deleteTarget.comment);
    }
  }

  private confirmDeleteReview(review: ReviewResponse) {
    this.deletingReviewId = review.id;

    this.reviewService.deleteReview(review.id).subscribe({
      next: () => {
        this.reviews = this.reviews.filter(r => r.id !== review.id);
        this.product!.reviews = this.reviews;

        this.closeDeleteModal();
        this.toastService.show('Review deleted', 'success');
        this.deletingReviewId = null;
      },
      error: err => {
        console.error(err);
        this.closeDeleteModal();
        this.deletingReviewId = null;
      }
    });
  }

  private confirmDeleteComment(review: ReviewWithComments, comment: CommentResponse) {
    this.deletingCommentId = comment.id;

    this.commentService.deleteComment(comment.id).subscribe({
      next: () => {
        const target = review.comments?.find(c => c.id === comment.id);
        if (target) {
          (target as any).deleted = true;
          target.content = '';
        }

        this.closeDeleteModal();
        this.toastService.show('Comment deleted', 'success');
        this.deletingCommentId = null;
      },
      error: err => {
        console.error(err);
        this.closeDeleteModal();
        this.deletingCommentId = null;
        this.toastService.show('Could not delete comment', 'error');
      }
    });
  }

  hasLongDescription(description?: string): boolean {
    return (description?.length ?? 0) > 280;
  }

  // ===================== COMMENTS =====================
  addComment(review: ReviewWithComments) {

    if (this.showAuthModelIfNoAuthUser()) {
      return;
    }

    if (!this.commentText.trim()) return;

    this.commentService.createComment(review.id, {
      content: this.commentText
    }).subscribe({

      next: (comment) => {

        review.comments = [
          comment,
          ...(review.comments || [])
        ];

        review.commentsCount =
          (review.commentsCount || 0) + 1;


        this.commentText = '';
      },

      error: console.error
    });
  }

  loadComments(review: ReviewResponse & any) {

    if (review.commentsLoading) return;

    review.commentsLoading = true;

    this.commentService
      .getCommentsByReviewId(review.id, review.commentsPage ?? 0, 4)
      .subscribe({

        next: (response) => {

          review.comments = [
            ...(review.comments || []),
            ...response.content
          ];

          review.commentsTotal = response.totalElements;

          review.commentsPage = (review.commentsPage ?? 0) + 1;

          review.commentsLoading = false;
          review.showComments = true;
        },

        error: err => {
          console.error(err);
          review.commentsLoading = false;
        }

      });
  }

  toggleComments(review: ReviewResponse & any) {
    if (!review.showComments && (!review.comments || review.comments.length === 0)) {
      this.loadComments(review);
    } else {
      review.showComments = !review.showComments;
    }
  }

  // ===================== UI HELPERS =====================
  getSolidStars(rating: number) {
    return Array(Math.floor(rating));
  }

  getOutlineStars(rating: number) {
    return Array(5 - Math.floor(rating));
  }


  goBack() {
    this.location.back();
  }

  startReply(comment: CommentResponse) {
    if (this.showAuthModelIfNoAuthUser()) {
      return;
    }
    this.replyingToCommentId = comment.id;
    this.replyingToActorName = comment.actorName;
    this.commentText = '';
  }

  cancelReply() {
    this.replyingToCommentId = null;
    this.replyingToActorName = '';
    this.commentText = '';
  }

  sendReply(review: ReviewWithComments) {

    if (!this.commentText.trim() || !this.replyingToCommentId) {
      return;
    }

    const request = {
      content: this.commentText,
      reviewId: review.id
    };

    this.commentService
      .replyToComment(this.replyingToCommentId, request)
      .subscribe({

        next: (newReply) => {

          review.comments = [
            ...(review.comments || []),
            newReply
          ];

          review.commentsCount =
            (review.commentsCount || 0) + 1;

          this.cancelReply();

        },

        error: console.error

      });
  }


  private observer?: IntersectionObserver;

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private requestInProgress = false;


  // ===================== LOAD REVIEWS =====================

  private loadReviews() {

    if (!this.productId || this.requestInProgress || this.last) return;

    this.requestInProgress = true;
    this.loading = true;

    this.reviewService
      .getReviewsByProductId(this.productId, this.page, this.size)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.requestInProgress = false;
        })
      )
      .subscribe({
        next: (response) => {

          this.totalReviews = response.reviews.totalElements;

          if (this.page === 0) {
            this.myReview = response.myReview;

            if (this.myReview) {
              this.reviewContent = this.myReview.content ?? '';
              this.selectedRating = this.myReview.rating ?? 0;
            }
          }

          const newReviews = response.reviews.content
            .filter(r => !this.myReview || r.id !== this.myReview.id)
            .map(r => ({
              ...r,
              showComments: false,
              comments: [],
              newComment: '',
              commentsPage: 0,
              commentsTotal: r.commentsCount ?? 0,
              commentsLoading: false
            }));

          if (this.page === 0 && this.myReview) {

            const myReviewWithState = {
              ...this.myReview,
              showComments: false,
              comments: [],
              newComment: '',
              commentsPage: 0,
              commentsTotal: this.myReview.commentsCount ?? 0,
              commentsLoading: false
            };

            this.reviews = [
              myReviewWithState,
              ...newReviews
            ];

          } else {

            this.reviews = [
              ...this.reviews,
              ...newReviews
            ];

          }

          this.product!.reviews = this.reviews;

          this.page++;
          this.last = response.reviews.last;

        },
        error: (err) => {
          console.error(err);
        }
      });
  }


  toggleReviewLike(review: ReviewResponse) {
    if (review.liked) {
      this.reviewService.removeLike(review.id).subscribe(() => {
        review.liked = false;
        review.likeCount--;
      });
    } else {
      this.reviewService.addLike(review.id).subscribe(() => {
        review.liked = true;
        review.likeCount++;
      });
    }
  }


  toggleCommentLike(comment: CommentResponse) {
    if (comment.liked) {
      this.commentService.removeLike(comment.id).subscribe(() => {
        comment.liked = false;
        comment.likeCount--;
      });
    } else {
      this.commentService.addLike(comment.id).subscribe(() => {
        comment.liked = true;
        comment.likeCount++;
      });
    }
  }

  @ViewChild('loadMoreTrigger')
  loadMoreTrigger?: ElementRef;

  ngAfterViewInit() {
    if (!this.loadMoreTrigger) return;
    this.observer = new IntersectionObserver(
      entries => {
        if (
          entries[0].isIntersecting &&
          !this.loading &&
          !this.last
        ) {
          this.loadReviews();
        }
      },
      {
        rootMargin: '100px'
      }
    );
    this.observer.observe(
      this.loadMoreTrigger.nativeElement
    );
  }


  commentIsMine(comment: CommentResponse): boolean {
    return comment.actorType === 'USER' && comment.actorId === this.authService.getCurrentUser?.id;
  }

}
