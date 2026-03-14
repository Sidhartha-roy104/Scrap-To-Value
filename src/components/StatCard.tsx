import { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  change?: {
    value: string;
    positive: boolean;
  };
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
}

export function StatCard({ label, value, change, icon: Icon, iconColor, iconBgColor }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`h-12 w-12 rounded-xl ${iconBgColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="metric-label">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="metric-value text-foreground">{value}</span>
          {change && (
            <span className={change.positive ? 'metric-change-positive' : 'metric-change-negative'}>
              {change.positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {change.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
