import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {MinimizedReviewResponse} from '../../../../core/models/dto/reviewDTO/minimizedReviewResponse.model';
import {ReviewService} from '../../../../core/services/reviewService/review.service';
import {RouterLink} from '@angular/router';


@Component({
  selector: 'app-my-reviews',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './my-reviews.component.html',
  styleUrl: './my-reviews.component.css'
})
export class MyReviewsComponent implements OnInit, AfterViewInit, OnDestroy {

  reviews: MinimizedReviewResponse[] = [];

  page = 0;
  size = 10;
  last = false;
  loading = false;

  @ViewChild('loadMoreTrigger') loadMoreTrigger!: ElementRef;

  private observer!: IntersectionObserver;


  constructor(private reviewService: ReviewService) {}


  ngOnInit(): void {
    this.loadReviews();
  }


  ngAfterViewInit(): void {

    this.observer = new IntersectionObserver(entries => {

      const entry = entries[0];

      if (entry.isIntersecting) {
        this.loadReviews();
      }

    }, {
      rootMargin: '200px'
    });


    this.observer.observe(this.loadMoreTrigger.nativeElement);
  }


  loadReviews() {

    if (this.loading || this.last) return;

    this.loading = true;

    this.reviewService
      .getMyReviews(this.page, this.size)
      .subscribe({

        next: (res) => {

          this.reviews = [
            ...this.reviews,
            ...res.content
          ];

          this.page++;
          this.last = res.last;

          this.loading = false;
        },

        error: (err) => {
          console.error('Error loading reviews:', err);
          this.loading = false;
        }

      });
  }


  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

}
