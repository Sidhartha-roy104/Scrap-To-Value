import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

export type DbTransaction = Tables<'transactions'>;

interface TransactionStats {
  totalRevenue: number;
  totalWasteSold: number;
  completedDeals: number;
  averagePrice: number;
  carbonSaved: number;
}

async function fetchTransactions(userId: string): Promise<DbTransaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useTransactions() {
  const { user } = useAuth();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: () => fetchTransactions(user!.id),
    enabled: !!user,
  });

  const stats = useMemo((): TransactionStats => {
    const completed = transactions.filter(t => t.status === 'Completed');
    const totalRevenue = completed.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalWasteSold = completed.reduce((sum, t) => sum + Number(t.quantity), 0);
    const completedDeals = completed.length;
    const averagePrice = totalWasteSold > 0 ? totalRevenue / totalWasteSold : 0;
    const carbonSaved = totalWasteSold * 0.5;
    return { totalRevenue, totalWasteSold, completedDeals, averagePrice, carbonSaved };
  }, [transactions]);

  const recentTransactions = useMemo(() =>
    [...transactions].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 10),
    [transactions]
  );

  const getTransactionsByDateRange = (startDate: Date, endDate: Date): DbTransaction[] => {
    return transactions.filter(t => {
      const d = new Date(t.created_at);
      return d >= startDate && d <= endDate;
    });
  };

  return {
    transactions,
    isLoading,
    stats,
    recentTransactions,
    getTransactionsByDateRange,
  };
}
