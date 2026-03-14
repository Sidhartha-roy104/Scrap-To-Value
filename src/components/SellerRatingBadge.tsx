import { Star } from 'lucide-react';
import { useSellerRating } from '@/hooks/useRatings';

interface SellerRatingBadgeProps {
  sellerId: string;
  size?: 'sm' | 'md';
}

export function SellerRatingBadge({ sellerId, size = 'sm' }: SellerRatingBadgeProps) {
  const { data } = useSellerRating(sellerId);

  if (!data || data.total_ratings === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <Star className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} fill-amber-400 text-amber-400`} />
      <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>
        {data.avg_rating}
      </span>
      <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
        ({data.total_ratings})
      </span>
    </div>
  );
}
