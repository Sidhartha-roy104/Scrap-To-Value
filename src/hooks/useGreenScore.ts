import { useMemo } from 'react';
import { useTransactions } from './useTransactions';
import { useWasteListings } from './useWasteListings';
import { GreenScoreData, LeaderboardEntry, generateLeaderboard } from '@/data/mockData';

interface UseGreenScoreReturn {
  scoreData: GreenScoreData | null;
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  updateScore: (updates: Partial<GreenScoreData>) => void;
}

export function useGreenScore(): UseGreenScoreReturn {
  const { transactions, stats, isLoading: txLoading } = useTransactions();
  const { listings, isLoading: listingsLoading } = useWasteListings();

  const isLoading = txLoading || listingsLoading;

  const scoreData = useMemo((): GreenScoreData | null => {
    if (isLoading) return null;

    // Recycling rate: based on total waste sold (max 40 pts, 1 pt per 100kg, capped)
    const recyclingScore = Math.min(40, Math.floor(stats.totalWasteSold / 100));

    // Transaction activity: based on completed deals (max 30 pts, 3 pts per deal, capped)
    const activityScore = Math.min(30, stats.completedDeals * 3);

    // Waste variety: based on unique waste types listed (max 15 pts, ~2.5 pts per type)
    const uniqueTypes = new Set(listings.map(l => l.waste_type));
    const varietyScore = Math.min(15, Math.floor(uniqueTypes.size * 2.5));

    // Buyer ratings placeholder (max 15 pts) - default 5 since we don't have ratings yet
    const ratingsScore = stats.completedDeals > 0 ? Math.min(15, 5 + Math.floor(stats.completedDeals / 2)) : 0;

    const totalScore = recyclingScore + activityScore + varietyScore + ratingsScore;

    let badge: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    if (totalScore >= 85) badge = 'Platinum';
    else if (totalScore >= 70) badge = 'Gold';
    else if (totalScore >= 50) badge = 'Silver';
    else badge = 'Bronze';

    return {
      totalScore,
      maxScore: 100,
      badge,
      breakdown: {
        recyclingRate: { current: recyclingScore, max: 40 },
        transactionActivity: { current: activityScore, max: 30 },
        wasteVariety: { current: varietyScore, max: 15 },
        buyerRatings: { current: ratingsScore, max: 15 },
      },
      recommendations: [
        {
          id: '1',
          title: 'Increase Waste Diversity',
          description: `List at least 4 different waste types to maximize your variety score (${uniqueTypes.size}/4)`,
          icon: 'Boxes',
          status: uniqueTypes.size >= 4 ? 'Complete' : 'In Progress',
          points: 5,
        },
        {
          id: '2',
          title: 'Complete 10 Transactions',
          description: `Reach 10 completed transactions for bonus points (${stats.completedDeals}/10)`,
          icon: 'TrendingUp',
          status: stats.completedDeals >= 10 ? 'Complete' : 'In Progress',
          points: 8,
        },
        {
          id: '3',
          title: 'Post 5 Listings',
          description: `Have at least 5 active listings on the marketplace (${listings.length}/5)`,
          icon: 'BadgeCheck',
          status: listings.length >= 5 ? 'Complete' : 'Pending',
          points: 10,
        },
        {
          id: '4',
          title: 'Sell 1,000 kg of Waste',
          description: `Reach 1,000 kg of total waste sold (${Math.round(stats.totalWasteSold)}/1000)`,
          icon: 'Star',
          status: stats.totalWasteSold >= 1000 ? 'Complete' : 'In Progress',
          points: 5,
        },
      ],
    };
  }, [isLoading, stats, listings, transactions]);

  // Leaderboard stays mock for now (multi-user feature)
  const leaderboard = useMemo(() => generateLeaderboard(), []);

  return {
    scoreData,
    leaderboard,
    isLoading,
    updateScore: () => {}, // no-op, score is computed
  };
}
