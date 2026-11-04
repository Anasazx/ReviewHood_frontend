export interface ReviewRequest {
  rating: number;
  content: string | null;
  productId: number;
  guestName?: string | null;
}
