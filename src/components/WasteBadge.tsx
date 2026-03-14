import { WasteType } from '@/data/mockData';

interface WasteBadgeProps {
  type: WasteType;
  size?: 'sm' | 'md';
}

const badgeStyles: Record<WasteType, string> = {
  'Organic': 'bg-emerald-100 text-emerald-700',
  'Plastic': 'bg-blue-100 text-blue-700',
  'Metal': 'bg-gray-100 text-gray-700',
  'Paper': 'bg-amber-100 text-amber-700',
  'E-waste': 'bg-purple-100 text-purple-700',
  'Textile': 'bg-pink-100 text-pink-700'
};

export function WasteBadge({ type, size = 'md' }: WasteBadgeProps) {
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : 'px-3 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${badgeStyles[type]}`}>
      {type}
    </span>
  );
}
