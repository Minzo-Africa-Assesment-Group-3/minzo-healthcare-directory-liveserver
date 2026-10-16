interface PublicReviewRecord {
  id: string;
  businessId: string;
  stars: number;
  text: string;
  isAnonymous: boolean;
  submittedAt: Date;
  updatedAt: Date;
  author: {
    displayName: string;
  };
}

export function presentPublicReview(
  review: PublicReviewRecord,
  mine = false,
) {
  return {
    id: review.id,
    businessId: review.businessId,
    stars: review.stars,
    text: review.text,
    isAnonymous: review.isAnonymous,
    mine,
    author: review.isAnonymous
      ? null
      : { displayName: review.author.displayName },
    submittedAt: review.submittedAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}
