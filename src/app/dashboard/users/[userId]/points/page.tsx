'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { StatCard } from '@/components/stat-card';
import { Pagination } from '@/components/pagination';
import { supabase } from '@/lib/supabase';
import { formatFullTimestamp, formatNumber } from '@/lib/utils';
import { Star, TrendingUp, TrendingDown } from 'lucide-react';

interface PointTransaction {
  transaction_id: number;
  points_amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function UserPointsPage() {
  const params = useParams();
  const userId = Number(params.userId);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [totalPoints, setTotalPoints] = useState(0);
  const [earned, setEarned] = useState(0);
  const [spent, setSpent] = useState(0);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const { data, count } = await supabase
      .from('points_transactions')
      .select('transaction_id, points_amount, transaction_type, description, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setTransactions((data as PointTransaction[]) || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [userId, page]);

  useEffect(() => {
    const init = async () => {
      const [userRes, pointsRes] = await Promise.all([
        supabase.from('users').select('full_name, username, total_points').eq('user_id', userId).single(),
        supabase.from('points_transactions').select('points_amount').eq('user_id', userId),
      ]);
      setUserName(userRes.data?.full_name || userRes.data?.username || `User #${userId}`);
      setTotalPoints(userRes.data?.total_points || 0);

      let e = 0, s = 0;
      (pointsRes.data || []).forEach((t: { points_amount: number }) => {
        if (t.points_amount > 0) e += t.points_amount;
        else s += Math.abs(t.points_amount);
      });
      setEarned(e);
      setSpent(s);
    };
    init();
    fetchTransactions();
  }, [userId, fetchTransactions]);

  const columns = [
    {
      key: 'transaction_id',
      label: 'ID',
      render: (t: PointTransaction) => <span className="text-muted-foreground font-mono">#{t.transaction_id}</span>,
    },
    {
      key: 'points_amount',
      label: 'Points',
      render: (t: PointTransaction) => (
        <span className={t.points_amount > 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
          {t.points_amount > 0 ? '+' : ''}{t.points_amount}
        </span>
      ),
    },
    {
      key: 'transaction_type',
      label: 'Type',
      render: (t: PointTransaction) => (
        <span className="text-foreground capitalize text-xs bg-muted px-2 py-1 rounded">
          {(t.transaction_type || '').replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (t: PointTransaction) => (
        <span className="text-muted-foreground text-xs max-w-[250px] truncate block">{t.description || '-'}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (t: PointTransaction) => <span className="text-muted-foreground text-xs">{formatFullTimestamp(t.created_at)}</span>,
    },
  ];

  return (
    <>
      <Header title={`${userName}'s Points`} subtitle="Point transaction history" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total Points" value={formatNumber(totalPoints)} icon={Star} color="accent" />
          <StatCard title="Total Earned" value={formatNumber(earned)} icon={TrendingUp} color="success" />
          <StatCard title="Total Spent" value={formatNumber(spent)} icon={TrendingDown} color="warning" />
        </div>
        <DataTable
          columns={columns}
          data={transactions}
          loading={loading}
          emptyMessage="No point transactions"
        />
        <Pagination
          page={page}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
