import { useMemo } from 'react';
import { 
  Leaf, 
  Recycle, 
  TrendingUp, 
  Boxes, 
  Star,
  BadgeCheck,
  ArrowUp,
  ArrowDown,
  Minus,
  Award,
  Target,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useGreenScore } from '@/hooks/useGreenScore';
import { ChartSkeleton, StatCardSkeleton } from '@/components/Skeleton';

const badgeColors = {
  'Bronze': { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-300' },
  'Silver': { bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-300' },
  'Gold': { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-400' },
  'Platinum': { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-400' }
};

const recommendationIcons: Record<string, React.ReactNode> = {
  'Boxes': <Boxes className="h-5 w-5" />,
  'TrendingUp': <TrendingUp className="h-5 w-5" />,
  'BadgeCheck': <BadgeCheck className="h-5 w-5" />,
  'Star': <Star className="h-5 w-5" />
};

export default function GreenScore() {
  const { scoreData, leaderboard, isLoading } = useGreenScore();

  const scorePercentage = useMemo(() => {
    if (!scoreData) return 0;
    return (scoreData.totalScore / scoreData.maxScore) * 100;
  }, [scoreData]);

  const circumference = 2 * Math.PI * 88; // radius = 88
  const strokeDashoffset = circumference - (scorePercentage / 100) * circumference;

  if (isLoading || !scoreData) {
    return (
      <div className="container-main py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Green Score</h1>
          <p className="text-muted-foreground mt-1">Your environmental impact rating</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartSkeleton />
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const badgeStyle = badgeColors[scoreData.badge];

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Green Score</h1>
        <p className="text-muted-foreground mt-1">Your environmental impact rating</p>
      </div>

      {/* Score Hero + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Circle */}
        <div className="card-base p-8 flex flex-col items-center justify-center">
          <p className="text-sm font-medium text-muted-foreground mb-4">Your Green Score</p>
          
          <div className="relative">
            {/* Background circle */}
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="hsl(var(--muted))"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="hsl(var(--primary))"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-foreground tabular-nums">
                {scoreData.totalScore}
              </span>
              <span className="text-sm text-muted-foreground">out of 100</span>
            </div>
          </div>

          {/* Badge */}
          <div className={`mt-6 flex items-center gap-2 px-4 py-2 rounded-full ring-2 ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.ring}`}>
            <Award className="h-5 w-5" />
            <span className="font-semibold">{scoreData.badge} Status</span>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="lg:col-span-2 card-base p-6">
          <h3 className="text-base font-semibold text-foreground mb-6">Score Breakdown</h3>
          
          <div className="space-y-6">
            {/* Recycling Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Recycle className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Recycling Rate</span>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {scoreData.breakdown.recyclingRate.current}/{scoreData.breakdown.recyclingRate.max} pts
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(scoreData.breakdown.recyclingRate.current / scoreData.breakdown.recyclingRate.max) * 100}%` }}
                />
              </div>
            </div>

            {/* Transaction Activity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Transaction Activity</span>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {scoreData.breakdown.transactionActivity.current}/{scoreData.breakdown.transactionActivity.max} pts
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill bg-accent"
                  style={{ width: `${(scoreData.breakdown.transactionActivity.current / scoreData.breakdown.transactionActivity.max) * 100}%` }}
                />
              </div>
            </div>

            {/* Waste Variety */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Boxes className="h-4 w-4 text-warning" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Waste Variety</span>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {scoreData.breakdown.wasteVariety.current}/{scoreData.breakdown.wasteVariety.max} pts
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill bg-warning"
                  style={{ width: `${(scoreData.breakdown.wasteVariety.current / scoreData.breakdown.wasteVariety.max) * 100}%` }}
                />
              </div>
            </div>

            {/* Buyer Ratings */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <Star className="h-4 w-4 text-success" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Buyer Ratings</span>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {scoreData.breakdown.buyerRatings.current}/{scoreData.breakdown.buyerRatings.max} pts
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill bg-success"
                  style={{ width: `${(scoreData.breakdown.buyerRatings.current / scoreData.breakdown.buyerRatings.max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommendations */}
        <div className="card-base p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Recommendations</h3>
          </div>
          
          <div className="space-y-3">
            {scoreData.recommendations.map(rec => (
              <div 
                key={rec.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  rec.status === 'Complete' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                }`}>
                  {recommendationIcons[rec.icon] || <Leaf className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{rec.title}</span>
                    <span className="text-xs font-medium text-primary">+{rec.points} pts</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                </div>
                <div className="flex-shrink-0">
                  {rec.status === 'Complete' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Complete
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {rec.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card-base p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-warning" />
            <h3 className="text-base font-semibold text-foreground">Leaderboard</h3>
          </div>
          
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Rank</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Business</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Score</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaderboard.map(entry => (
                  <tr 
                    key={entry.msmeId}
                    className={`${entry.isCurrentUser ? 'bg-primary/5' : 'hover:bg-secondary/50'} transition-colors`}
                  >
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                        entry.rank <= 3 
                          ? 'bg-warning/10 text-warning' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <img 
                          src={entry.avatar} 
                          alt={entry.msmeName}
                          className="h-7 w-7 rounded-full bg-muted"
                        />
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${entry.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                            {entry.msmeName}
                            {entry.isCurrentUser && <span className="ml-1 text-xs">(You)</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground tabular-nums">{entry.score}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeColors[entry.badge].bg} ${badgeColors[entry.badge].text}`}>
                          {entry.badge}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {entry.trend === 'up' && (
                        <ArrowUp className="h-4 w-4 text-success mx-auto" />
                      )}
                      {entry.trend === 'down' && (
                        <ArrowDown className="h-4 w-4 text-destructive mx-auto" />
                      )}
                      {entry.trend === 'stable' && (
                        <Minus className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
