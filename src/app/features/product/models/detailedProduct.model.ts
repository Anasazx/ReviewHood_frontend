import { ProductImageResponse } from "./productDTO/productImageResponse.model";
import { ReviewResponse } from "../../../core/models/dto/reviewDTO/reviewResponse.model";

export interface DetailedProduct {
  id: number;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  categoryId?: number | null;
  subcategoryId?: number | null;
  companyId?: number;
  companyName: string;
  companyIsVerified: boolean;
  companyLogoUrl: string;
  averageRating: number | null;
  reviewsCount: number;
  reviews: ReviewResponse[];
  images: ProductImageResponse[];
  ratingDistribution?: Record<number, number>;

  // false for thin pages, which are noindexed
  indexable?: boolean;
  // Hand-written content for priority products; empty lists when there is none
  seoDescription?: string | null;
  pros?: string[];
  cons?: string[];
  faq?: FaqItem[];
  priceTnd?: number | null;
  whereToBuy?: string | null;
}

export interface FaqItem {
  question: string;
  answer: string;
}


