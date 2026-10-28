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
  // comment box and reply target are per review, so open threads don't share a draft
  draft?: string;
  replyTo?: CommentResponse | null;
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

  totalReviews: number = 0;

  page = 0;
  size = 10;
  last = false;
  loading = false;
  loadingProduct = true;

  productId!: number;

  currentImageIndex = 0;
  showAuthModal = false;

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
    else this.loadingProduct = false;
  }

  // ===================== LOAD PRODUCT =====================
  loadProduct(id: number) {
    this.productId = id;

    this.productService.getDetailedProductById(id).subscribe({
      next: (data) => {

        this.product = data;
        this.product.ratingDistribution ??= {};
        this.loadingProduct = false;
        const mainIndex = data.images?.findIndex(i => i.isMain) ?? -1;
        this.currentImageIndex = mainIndex >= 0 ? mainIndex : 0;
        this.selectedImage = data.images?.[this.currentImageIndex]?.url ?? null;

        this.loadReviews();
      },
      error: (err) => {
        this.loadingProduct = false;
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

        this.applyRatingChange(this.myReview?.rating ?? null, saved.rating);

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

        if (!this.myReview) this.totalReviews++;
        this.myReview = saved;
        this.product!.reviews = this.reviews;
        this.submittingReview = false;
        this.toastService.show('Thanks! Your review is live', 'success');
      },
      error: err => {
        console.error(err);
        this.submittingReview = false;
        this.toastService.show('Could not save your review', 'error');
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
        this.applyRatingChange(review.rating, null);
        this.totalReviews = Math.max(0, this.totalReviews - 1);
        if (this.myReview?.id === review.id) this.myReview = null;

        this.closeDeleteModal();
        this.toastService.show('Review deleted', 'success');
        this.deletingReviewId = null;
      },
      error: err => {
        console.error(err);
        this.closeDeleteModal();
        this.deletingReviewId = null;
        this.toastService.show('Could not delete review', 'error');
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

  get deleteModalTitle(): string {
    return this.deleteTarget?.type === 'comment' ? 'Delete comment?' : 'Delete review?';
  }

  get deleteModalMessage(): string {
    return `Are you sure you want to delete this ${this.deleteTarget?.type ?? 'review'}? This action cannot be undone.`;
  }

  get deleting(): boolean {
    return this.deletingReviewId !== null || this.deletingCommentId !== null;
  }

  // Keeps the average, the count and the star bars in sync without refetching the product.
  // oldRating null = new review, newRating null = deleted review.
  private applyRatingChange(oldRating: number | null, newRating: number | null) {
    const product = this.product;
    if (!product) return;

    const distribution = { ...(product.ratingDistribution ?? {}) };
    const count = product.reviewsCount;
    let total = (product.averageRating ?? 0) * count;

    if (oldRating !== null) {
      distribution[oldRating] = Math.max(0, (distribution[oldRating] ?? 0) - 1);
      total -= oldRating;
    }
    if (newRating !== null) {
      distribution[newRating] = (distribution[newRating] ?? 0) + 1;
      total += newRating;
    }

    const newCount = count + (oldRating === null ? 1 : 0) - (newRating === null ? 1 : 0);
    product.reviewsCount = Math.max(0, newCount);
    product.averageRating = product.reviewsCount ? total / product.reviewsCount : 0;
    product.ratingDistribution = distribution;
  }

  hasLongDescription(description?: string): boolean {
    return (description?.length ?? 0) > 280;
  }

  scrollToReviewForm() {
    document.getElementById('write-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  scrollToReviews() {
    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ===================== COMMENTS =====================
  addComment(review: ReviewWithComments) {

    if (this.showAuthModelIfNoAuthUser()) {
      return;
    }

    const content = review.draft?.trim();
    if (!content) return;

    this.commentService.createComment(review.id, {
      content
    }).subscribe({

      next: (comment) => {

        review.comments = [
          comment,
          ...(review.comments || [])
        ];

        review.commentsCount =
          (review.commentsCount || 0) + 1;
        review.commentsTotal = (review.commentsTotal || 0) + 1;

        review.draft = '';
      },

      error: err => {
        console.error(err);
        this.toastService.show('Could not post your comment', 'error');
      }
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
  starIcon(rating: number, star: number): string {
    if (rating >= star) return 'fa-star';
    if (rating >= star - 0.5) return 'fa-star-half-stroke';
    return 'fa-star text-slate-200';
  }

  initials(name: string | null | undefined): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    return parts.length ? ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() : '?';
  }


  goBack() {
    this.location.back();
  }

  startReply(review: ReviewWithComments, comment: CommentResponse) {
    if (this.showAuthModelIfNoAuthUser()) {
      return;
    }
    review.replyTo = comment;
    review.draft = '';
  }

  cancelReply(review: ReviewWithComments) {
    review.replyTo = null;
    review.draft = '';
  }

  submitComment(review: ReviewWithComments) {
    if (review.replyTo) this.sendReply(review);
    else this.addComment(review);
  }

  sendReply(review: ReviewWithComments) {

    const content = review.draft?.trim();
    if (!content || !review.replyTo) {
      return;
    }

    const request = {
      content,
      reviewId: review.id
    };

    this.commentService
      .replyToComment(review.replyTo.id, request)
      .subscribe({

        next: (newReply) => {

          review.comments = [
            ...(review.comments || []),
            newReply
          ];

          review.commentsCount =
            (review.commentsCount || 0) + 1;
          review.commentsTotal = (review.commentsTotal || 0) + 1;

          this.cancelReply(review);

        },

        error: err => {
          console.error(err);
          this.toastService.show('Could not post your reply', 'error');
        }

      });
  }


  private observer?: IntersectionObserver;

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private requestInProgress = false;


  // ===================== LOAD REVIEWS =====================

  private loadReviews() {

    if (!this.product || this.requestInProgress || this.last) return;

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
    if (this.showAuthModelIfNoAuthUser()) return;
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
    if (this.showAuthModelIfNoAuthUser()) return;
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
