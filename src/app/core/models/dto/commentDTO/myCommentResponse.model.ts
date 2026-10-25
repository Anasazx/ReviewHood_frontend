// One of the signed-in user's comments (GET /comments/my)
export interface MyCommentResponse {
  id: number;
  content: string;
  createdAt: string;
  likeCount: number;
  reviewId: number;
  productId: number;
  productName: string;
  // who the comment answers, null when it answers the review itself
  repliedToName: string | null;
}
