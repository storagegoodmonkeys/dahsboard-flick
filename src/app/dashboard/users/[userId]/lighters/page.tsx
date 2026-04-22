'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { StatusBadge } from '@/components/status-badge';
import { supabase } from '@/lib/supabase';
import { formatFullTimestamp } from '@/lib/utils';
import { Flame } from 'lucide-react';

interface LighterOwnership {
  ownership_id: number;
  lighter_id: number;
  acquisition_type: string;
  acquisition_date: string;
  acquisition_location_name: string;
  is_current_owner: boolean;
  lighter_nickname: string;
  lighter_status: number;
  total_distance_km: number;
}

const STATUS_MAP: Record<number, string> = {
  0: 'unregistered', 1: 'registered', 2: 'lost', 3: 'discarded', 4: 'found',
};

const PAGE_SIZE = 20;

export default function UserLightersPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [lighters, setLighters] = useState<LighterOwnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [userName, setUserName] = useState('');

  const fetchLighters = useCallback(async () => {
    setLoading(true);
    const { data, count } = await supabase
      .from('lighter_ownership')
      .select('ownership_id, lighter_id, acquisition_type, acquisition_date, acquisition_location_name, is_current_owner', { count: 'exact' })
      .eq('user_id', userId)
      .order('acquisition_date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (data && data.length > 0) {
      const lighterIds = data.map((o: { lighter_id: number }) => o.lighter_id);
      const { data: lighterData } = await supabase
        .from('lighters')
        .select('lighter_id, nickname, lighter_status, total_distance_km')
        .in('lighter_id', lighterIds);

      const lighterMap = new Map((lighterData || []).map((l: { lighter_id: number; nickname: string; lighter_status: number; total_distance_km: number }) => [l.lighter_id, l]));

      const enriched: LighterOwnership[] = data.map((o: { ownership_id: number; lighter_id: number; acquisition_type: string; acquisition_date: string; acquisition_location_name: string; is_current_owner: boolean }) => {
        const l = lighterMap.get(o.lighter_id);
        return {
          ...o,
          lighter_nickname: l?.nickname || `Lighter #${o.lighter_id}`,
          lighter_status: l?.lighter_status ?? 0,
          total_distance_km: l?.total_distance_km ?? 0,
        };
      });
      setLighters(enriched);
    } else {
      setLighters([]);
    }
    setTotalCount(count || 0);
    setLoading(false);
  }, [userId, page]);

  useEffect(() => {
    supabase.from('users').select('full_name').eq('user_id', userId).single()
      .then(({ data }) => setUserName(data?.full_name || `User #${userId}`));
    fetchLighters();
  }, [fetchLighters, userId]);

  const columns = [
    {
      key: 'lighter_nickname',
      label: 'Lighter',
      render: (l: LighterOwnership) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <Flame className="w-4 h-4 text-warning" />
          </div>
          <div>
            <p className="text-foreground font-medium">{l.lighter_nickname}</p>
            <p className="text-xs text-muted-foreground font-mono">#{l.lighter_id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'lighter_status',
      label: 'Status',
      render: (l: LighterOwnership) => <StatusBadge status={STATUS_MAP[l.lighter_status] || 'unknown'} />,
    },
    {
      key: 'acquisition_type',
      label: 'How Acquired',
      render: (l: LighterOwnership) => (
        <span className="text-foreground text-xs capitalize bg-muted px-2 py-1 rounded">{l.acquisition_type}</span>
      ),
    },
    {
      key: 'total_distance_km',
      label: 'Distance',
      render: (l: LighterOwnership) => (
        <span className="text-info">{l.total_distance_km > 0 ? `${l.total_distance_km} km` : '-'}</span>
      ),
    },
    {
      key: 'is_current_owner',
      label: 'Current',
      render: (l: LighterOwnership) => (
        <span className={`text-xs font-medium ${l.is_current_owner ? 'text-success' : 'text-muted-foreground'}`}>
          {l.is_current_owner ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'acquisition_date',
      label: 'Acquired',
      render: (l: LighterOwnership) => <span className="text-muted-foreground text-xs">{formatFullTimestamp(l.acquisition_date)}</span>,
    },
  ];

  return (
    <>
      <Header title={`${userName}'s Lighters`} subtitle={`${totalCount} lighters`} />
      <div className="p-6 space-y-6">
        <DataTable columns={columns} data={lighters} loading={loading} emptyMessage="No lighters found" />
        <Pagination page={page} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </>
  );
}
