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

  readonly stars = [1, 2, 3, 4, 5];
  readonly ratingLabels = ['', 'Très mauvais', 'Mauvais', 'Moyen', 'Bien', 'Excellent'];

  reviewContent = '';
  guestName = '';
  selectedRating = 0;
  hoveredRating = 0;

  editing = false;

  private originalContent = '';

  private originalGuestName = '';

  private originalRating = 0;

  constructor() {}

  ngOnChanges() {
    if (this.myReview) {
      this.reviewContent = this.myReview.content ?? '';
      this.selectedRating = this.myReview.rating ?? 0;
      this.originalContent = this.reviewContent;
      this.guestName = !this.myReview.user.id && !['Guest', 'Invité'].includes(this.myReview.user.name) ? this.myReview.user.name : '';
      this.originalGuestName = this.guestName;
      this.originalRating = this.selectedRating;
      this.editing = false;
    } else {
      this.reviewContent = '';
      this.guestName = '';
      this.originalGuestName = '';
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
      content: this.reviewContent || null,
      guestName: this.loggedIn ? null : this.guestName || null
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
    if (this.selectedRating <= 2) return 'Qu’est-ce qui n’a pas été ?';
    if (this.selectedRating === 3) return 'Qu’est-ce qui pourrait être mieux ?';
    return 'Qu’avez-vous le plus apprécié ?';
  }

  get contentPlaceholder(): string {
    if (this.selectedRating <= 2) return 'Qualité, livraison, conforme à la description…';
    if (this.selectedRating === 3) return 'Ce qui allait, et ce qui vous a déçu…';
    return 'Qualité, rapport qualité-prix, depuis combien de temps vous l’utilisez…';
  }

  startEdit() {
    this.editing = true;
  }

  cancelEdit() {
    this.reviewContent = this.originalContent;
    this.guestName = this.originalGuestName;
    this.selectedRating = this.originalRating;
    this.editing = false;
  }

  get hasChanges(): boolean {
    return this.reviewContent !== this.originalContent
      || this.guestName !== this.originalGuestName
      || this.selectedRating !== this.originalRating;
  }

}
