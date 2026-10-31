import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgClass} from '@angular/common';
import {ReviewResponse} from '../../../../../../core/models/dto/reviewDTO/reviewResponse.model';
import {ReviewRequest} from '../../../../../../core/models/dto/reviewDTO/reviewRequest.model';

@Component({
  selector: 'app-review-form',
  imports: [
    FormsModule,
    NgClass
  ],
  templateUrl: './review-form.component.html',
  styleUrl: './review-form.component.css'
})
export class ReviewFormComponent implements OnChanges{

  @Input() productId?: number;
  @Input() myReview: ReviewResponse | null = null;
  @Input() submittingReview = false;
  @Input() loggedIn = false;

  @Output() reviewSubmitted = new EventEmitter<ReviewRequest>();
  @Output() loginRequested = new EventEmitter<void>();

  readonly stars = [1, 2, 3, 4, 5];
  readonly ratingLabels = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];

  reviewContent = '';
  selectedRating = 0;
  hoveredRating = 0;

  editing = false;

  private originalContent = '';

  private originalRating = 0;

  constructor() {}

  ngOnChanges() {
    if (this.myReview) {
      this.reviewContent = this.myReview.content ?? '';
      this.selectedRating = this.myReview.rating ?? 0;
      this.originalContent = this.reviewContent;
      this.originalRating = this.selectedRating;
      this.editing = false;
    } else {
      this.reviewContent = '';
      this.selectedRating = 0;
      this.editing = true;
    }
  }

  submit() {
    if (!this.productId || this.selectedRating === 0) {
      return;
    }
    const request: ReviewRequest = {
      productId: this.productId,
      rating: this.selectedRating,
      content: this.reviewContent || null
    };
    this.reviewSubmitted.emit(request);
  }

  rate(star: number) {
    this.selectedRating = star;
  }

  get displayRating(): number {
    return this.hoveredRating || this.selectedRating;
  }

  // The writing prompt follows the rating, so people know what's worth saying
  get contentPrompt(): string {
    if (this.selectedRating <= 2) return 'What went wrong?';
    if (this.selectedRating === 3) return 'What could be better?';
    return 'What did you like most?';
  }

  get contentPlaceholder(): string {
    if (this.selectedRating <= 2) return 'Quality, delivery, did it match the description...';
    if (this.selectedRating === 3) return 'What was fine, and what let you down?';
    return 'Quality, value for money, how long you have used it...';
  }

  startEdit() {
    this.editing = true;
  }

  cancelEdit() {
    this.reviewContent = this.originalContent;
    this.selectedRating = this.originalRating;
    this.editing = false;
  }

  get hasChanges(): boolean {
    return this.reviewContent !== this.originalContent || this.selectedRating !== this.originalRating;
  }

}
