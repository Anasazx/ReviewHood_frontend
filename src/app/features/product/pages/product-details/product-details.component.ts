import { AvatarComponent } from '../../../../core/sharedComponents/avatar/avatar.component';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import {Component, ElementRef, HostListener, OnInit, PLATFORM_ID, ViewChild, inject} from '@angular/core';
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
import {finalize} from 'rxjs';
import {ConfirmModalComponent} from '../../../../core/sharedComponents/confirm-modal/confirm-modal.component';
import {ToastService} from '../../../../core/services/toastService/toast.service';
import {ProductRatingOverviewComponent} from './components/product-rating-overview/product-rating-overview.component';
import {ProductImageGalleryComponent} from './components/product-image-gallery/product-image-gallery.component';
import {SeoService} from '../../../../core/services/seoService/seo.service';
import {environment} from '../../../../../environments/environment';
import {ProductCardComponent} from '../../../../core/sharedComponents/product-card/product-card.component';
import {ProductResponse} from '../../models/productDTO/productResponse.model';

// Longest first: SeoService.fitTitle keeps the longest one that fits. "prix" only when there is a price to show.
const TITLE_SUFFIXES_WITH_PRICE = [' – Avis, prix et notes en Tunisie | ReviewHood', ' – Avis, prix et notes en Tunisie', ' – Avis et prix en Tunisie', ' – Avis en Tunisie'];
const TITLE_SUFFIXES = [' – Avis et notes en Tunisie | ReviewHood', ' – Avis et notes en Tunisie', ' – Avis en Tunisie'];
const JSON_LD_REVIEWS = 5;


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
  imports: [AvatarComponent, CommonModule, FormsModule, RouterLink, ReviewFormComponent, AuthRequiredComponent, ConfirmModalComponent, ProductRatingOverviewComponent, ProductImageGalleryComponent, ProductCardComponent],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css',
})


export class ProductDetailsComponent implements OnInit {

  // ===================== STATE =====================
  product?: DetailedProduct;

  reviews: ReviewWithComments[] = [];

  relatedProducts: ProductResponse[] = [];

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

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

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
    private router: Router,
    private seo: SeoService
  ) {}

  ngOnInit() {
    const productId = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(productId) && productId > 0) {
      this.loadProduct(productId);
    } else {
      this.loadingProduct = false;
      this.router.navigate(['/not-found'], { skipLocationChange: true });
    }
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
        this.updateSeo(data);

        this.loadReviews();
        this.loadRelatedProducts(id);
      },
      error: (err) => {
        this.loadingProduct = false;
        if (err.status === 404) {
          this.router.navigate(['/not-found'], { skipLocationChange: true });
        } else {
          // Tell crawlers to retry instead of indexing an empty page
          this.seo.setStatus(503);
          console.error(err);
        }
      }
    });
  }


  private loadRelatedProducts(id: number) {
    this.productService.getRelatedProducts(id).subscribe({
      next: products => this.relatedProducts = products,
      error: err => console.error(err)
    });
  }

  // Runs again once the first reviews are in, so the server-rendered JSON-LD includes them
  private updateSeo(product: DetailedProduct) {
    const hasPrice = product.priceTnd != null;

    this.seo.set({
      title: this.seo.fitTitle(product.name, hasPrice ? TITLE_SUFFIXES_WITH_PRICE : TITLE_SUFFIXES),
      description: this.metaDescription(product),
      image: this.selectedImage,
      type: 'product',
      // Thin pages stay reachable but out of the index. A missing flag (older API) keeps the page indexed.
      noindex: product.indexable === false,
      jsonLd: this.jsonLd(product)
    });
  }

  private metaDescription(product: DetailedProduct): string {
    const count = product.reviewsCount;
    const rating = (product.averageRating ?? 0).toFixed(1).replace('.', ',');
    const name = product.companyName ? `${product.name} de ${product.companyName}` : product.name;

    const lead = count > 0
      ? `${name} : noté ${rating}/5 sur ${count} avis en Tunisie.`
      : `${name} : avis${product.priceTnd != null ? ', prix' : ''} et notes en Tunisie. Soyez le premier à donner votre avis.`;

    const topReview = [...this.reviews]
      .filter(review => review.content?.trim())
      .sort((a, b) => b.likeCount - a.likeCount || b.rating - a.rating)[0];
    const snippet = product.seoDescription || topReview?.content || product.description;

    // SeoService cuts it to length
    return snippet ? `${lead} ${snippet}` : lead;
  }

  private jsonLd(product: DetailedProduct): object {
    const url = `${environment.siteUrl}/p/${product.id}`;
    const hasReviews = product.reviewsCount > 0;
    const hasPrice = product.priceTnd != null;
    const graph: object[] = [];

    // Google rejects Product markup with no rating, review or offer, so a page with none of them gets none
    if (hasReviews || hasPrice) {
      const latestReviews = [...this.reviews]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, JSON_LD_REVIEWS);

      graph.push({
        '@type': 'Product',
        name: product.name,
        description: product.seoDescription || product.description,
        url,
        ...(this.selectedImage ? { image: this.seo.absoluteImage(this.selectedImage) } : {}),
        ...(product.companyName ? { brand: { '@type': 'Brand', name: product.companyName } } : {}),
        ...(product.subcategory || product.category ? { category: product.subcategory || product.category } : {}),
        // Only real ratings: no reviews, no aggregateRating
        ...(hasReviews ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: (product.averageRating ?? 0).toFixed(1),
            reviewCount: product.reviewsCount,
            bestRating: 5,
            worstRating: 1
          },
          review: latestReviews.map(review => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: review.user.name },
            datePublished: review.createdAt.slice(0, 10),
            reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5, worstRating: 1 },
            ...(review.content?.trim() ? { reviewBody: review.content } : {})
          }))
        } : {}),
        ...(hasPrice ? {
          offers: { '@type': 'Offer', price: product.priceTnd, priceCurrency: 'TND', url }
        } : {})
      });
    }

    if (product.faq?.length) {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: product.faq.map(item => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer }
        }))
      });
    }

    const crumbs = [
      { name: 'Produits', url: `${environment.siteUrl}/products` },
      ...(product.categoryId ? [{ name: product.category, url: `${environment.siteUrl}/products?categoryId=${product.categoryId}` }] : []),
      ...(product.subcategoryId ? [{ name: product.subcategory, url: `${environment.siteUrl}/products?subcategoryId=${product.subcategoryId}` }] : []),
      { name: product.name, url }
    ];
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, name: crumb.name, item: crumb.url }))
    });

    return { '@context': 'https://schema.org', '@graph': graph };
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
        this.toastService.show('Merci ! Votre avis est en ligne', 'success');
      },
      error: err => {
        console.error(err);
        this.submittingReview = false;
        this.toastService.show('Impossible d’enregistrer votre avis', 'error');
      }
    });

  }

  reviewIsMine(review: ReviewResponse): boolean {
    return review.id === this.myReview?.id;
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
        this.toastService.show('Avis supprimé', 'success');
        this.deletingReviewId = null;
      },
      error: err => {
        console.error(err);
        this.closeDeleteModal();
        this.deletingReviewId = null;
        this.toastService.show('Impossible de supprimer l’avis', 'error');
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
        this.toastService.show('Commentaire supprimé', 'success');
        this.deletingCommentId = null;
      },
      error: err => {
        console.error(err);
        this.closeDeleteModal();
        this.deletingCommentId = null;
        this.toastService.show('Impossible de supprimer le commentaire', 'error');
      }
    });
  }

  get deleteModalTitle(): string {
    return this.deleteTarget?.type === 'comment' ? 'Supprimer le commentaire ?' : 'Supprimer l’avis ?';
  }

  get deleteModalMessage(): string {
    return `Voulez-vous vraiment supprimer ${this.deleteTarget?.type === 'comment' ? 'ce commentaire' : 'cet avis'} ? Cette action est irréversible.`;
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

  // "Read more" only when the clamped description is actually cut off, measured on the rendered text
  descOverflows = false;
  private descEl?: HTMLElement;

  @ViewChild('descText') set descText(ref: ElementRef<HTMLElement> | undefined) {
    this.descEl = ref?.nativeElement;
    if (this.isBrowser) setTimeout(() => this.measureDescription());
  }

  @HostListener('window:resize')
  measureDescription() {
    if (!this.descEl || this.descExpanded) return;
    this.descOverflows = this.descEl.scrollHeight > this.descEl.clientHeight + 1;
  }

  scrollToReviewForm() {
    if (this.myReview) this.reviewForm?.startEdit();
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
        this.toastService.show('Impossible de publier votre commentaire', 'error');
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
          this.toastService.show('Impossible de publier votre réponse', 'error');
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
          if (this.page === 0) this.updateSeo(this.product!);

          // Guests: the server can't know this browser, so the review comes from its own request
          if (this.page === 0 && this.isBrowser && !this.myReview) {
            this.loadGuestReview();
          }

          this.page++;
          this.last = response.reviews.last;

        },
        error: (err) => {
          console.error(err);
        }
      });
  }


  private loadGuestReview() {
    this.reviewService.getGuestReview(this.productId).subscribe({
      next: (review) => {
        if (!review) return;

        const current = this.reviews.find(r => r.id === review.id);
        const others = this.reviews.filter(r => r.id !== review.id);

        this.myReview = review;
        this.reviews = [{ showComments: false, comments: [], commentsPage: 0, commentsTotal: review.commentsCount ?? 0, ...current, ...review }, ...others];
        this.product!.reviews = this.reviews;
      },
      error: err => console.error(err)
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

  @ViewChild(ReviewFormComponent) reviewForm?: ReviewFormComponent;

  // The trigger sits right after the reviews, so it only exists once the product is shown
  @ViewChild('loadMoreTrigger')
  set loadMoreTrigger(ref: ElementRef<HTMLElement> | undefined) {
    this.observer?.disconnect();
    if (!this.isBrowser || !ref) return;
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
    this.observer.observe(ref.nativeElement);
  }


  commentIsMine(comment: CommentResponse): boolean {
    return comment.actorType === 'USER' && comment.actorId === this.authService.getCurrentUser?.id;
  }

}
