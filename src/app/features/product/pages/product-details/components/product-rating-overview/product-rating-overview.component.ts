import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';

@Component({
  selector: 'app-product-rating-overview',
  standalone: true,
  imports: [
    DecimalPipe,
    NgClass
  ],
  templateUrl: './product-rating-overview.component.html',
  styleUrl: './product-rating-overview.component.css'
})
export class ProductRatingOverviewComponent {

  @Input() averageRating = 0;
  @Input() reviewsCount = 0;
  @Input() ratingDistribution: Record<number, number> = {};

  @Output() writeReview = new EventEmitter<void>();

  starIcon(star: number): string {
    if (this.averageRating >= star) return 'fa-star';
    if (this.averageRating >= star - 0.5) return 'fa-star-half-stroke';
    return 'fa-star text-slate-200';
  }

  getStarPercent(star: number): number {
    if (this.reviewsCount === 0) {
      return 0;
    }

    const count = this.ratingDistribution[star] ?? 0;

    return (count / this.reviewsCount) * 100;
  }
}
