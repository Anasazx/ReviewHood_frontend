import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgClass } from '@angular/common';
import { ImageUrlPipe } from '../../../../../../core/pipes/image-url.pipe';
import { ProductImageResponse } from '../../../../models/productDTO/productImageResponse.model';

@Component({
  selector: 'app-product-image-gallery',
  standalone: true,
  imports: [
    NgClass,
    ImageUrlPipe
  ],
  templateUrl: './product-image-gallery.component.html',
  styleUrl: './product-image-gallery.component.css'
})
export class ProductImageGalleryComponent implements OnChanges {

  @Input() images: ProductImageResponse[] = [];
  @Input() name = '';

  currentImageIndex = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['images']) {
      this.setInitialImage();
    }
  }

  get selectedImage(): string | null {
    return this.images[this.currentImageIndex]?.url ?? null;
  }

  nextImage(): void {
    if (this.images.length <= 1) return;

    this.currentImageIndex =
      (this.currentImageIndex + 1) % this.images.length;
  }

  prevImage(): void {
    if (this.images.length <= 1) return;

    this.currentImageIndex =
      (this.currentImageIndex - 1 + this.images.length) % this.images.length;
  }

  private setInitialImage(): void {
    if (!this.images.length) {
      this.currentImageIndex = 0;
      return;
    }

    const mainIndex = this.images.findIndex(image => image.isMain);

    this.currentImageIndex = mainIndex >= 0 ? mainIndex : 0;
  }
}
