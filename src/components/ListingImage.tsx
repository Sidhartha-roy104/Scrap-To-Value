import { useState } from 'react';
import { Package } from 'lucide-react';
import { resolveImageUrl } from '@/services/listingService';

interface ListingImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackCategory?: string;
}

export function ListingImage({
  src,
  alt,
  className = 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-300',
  containerClassName = 'w-full h-40 overflow-hidden bg-muted relative',
  fallbackCategory,
}: ListingImageProps) {
  const [hasError, setHasError] = useState(false);
  const resolved = resolveImageUrl(src);

  if (!resolved || hasError) {
    return (
      <div className={`${containerClassName} bg-secondary/50 flex flex-col items-center justify-center text-muted-foreground/70 select-none`}>
        <Package className="h-8 w-8 opacity-40 mb-1" />
        <span className="text-xs font-medium opacity-60">
          {fallbackCategory ? `${fallbackCategory} Scrap` : 'No Image Available'}
        </span>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <img
        src={resolved}
        alt={alt}
        className={className}
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
