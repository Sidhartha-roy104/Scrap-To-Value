import { Star } from 'lucide-react';
import { useSellerRating, type SellerRating } from '@/hooks/useRatings';

interface SellerRatingBadgeProps {
  sellerId: string;
  initialRating?: {
    avg_rating: number;
    total_ratings: number;
  };
  size?: 'sm' | 'md';
  showEmpty?: boolean;
  className?: string;
}

export function SellerRatingBadge({
  sellerId,
  initialRating,
  size = 'sm',
  showEmpty = true,
  className = '',
}: SellerRatingBadgeProps) {
  // Only trigger network query if initial rating is not provided
  const { data: fetchedData, isLoading } = useSellerRating(
    initialRating ? undefined : sellerId
  );

  const data: SellerRating = initialRating || fetchedData || { avg_rating: 0, total_ratings: 0 };

  if (isLoading && !initialRating) {
    return (
      <span className={`${size === 'sm' ? 'text-[11px]' : 'text-xs'} text-muted-foreground/60 animate-pulse ${className}`}>
        Loading rating...
      </span>
    );
  }

  if (data.total_ratings === 0) {
    if (!showEmpty) return null;
    return (
      <div className={`inline-flex items-center gap-1 text-muted-foreground ${className}`}>
        <Star className={`${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-muted-foreground/30 flex-shrink-0`} />
        <span className={`${size === 'sm' ? 'text-[11px]' : 'text-xs'} italic`}>
          No reviews yet
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={`Seller Rating: ${data.avg_rating.toFixed(1)} out of 5 (${data.total_ratings} verified reviews)`}
    >
      <Star className={`${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} fill-amber-400 text-amber-400 flex-shrink-0`} />
      <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} font-semibold text-foreground`}>
        {data.avg_rating.toFixed(1)}
      </span>
      <span className={`${size === 'sm' ? 'text-[11px]' : 'text-xs'} text-muted-foreground`}>
        · {data.total_ratings} {data.total_ratings === 1 ? 'review' : 'reviews'}
      </span>
    </div>
  );
}
