'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { Pagination } from '@/components/pagination';
import { LighterHistoryModal } from '@/components/lighter-history-modal';
import { supabase } from '@/lib/supabase';
import { formatNumber, formatFullTimestamp } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, HandHeart, Clock, MapPin } from 'lucide-react';

const PAGE_SIZE = 15;

// Helper to batch-fetch user names
async function fetchUserNames(userIds: number[]): Promise<Map<number, string>> {
  if (userIds.length === 0) return new Map();
  const { data } = await supabase
    .from('users')
    .select('user_id, full_name, username')
    .in('user_id', userIds);
  return new Map((data || []).map((u: { user_id: number; full_name: string; username: string }) => [
    u.user_id,
    u.full_name || u.username || `User #${u.user_id}`,
  ]));
}

// Helper to batch-fetch lighter names
async function fetchLighterNames(lighterIds: number[]): Promise<Map<number, string>> {
  if (lighterIds.length === 0) return new Map();
  const { data } = await supabase
    .from('lighters')
    .select('lighter_id, nickname, model_name')
    .in('lighter_id', lighterIds);
  return new Map((data || []).map((l: { lighter_id: number; nickname: string; model_name: string }) => [
    l.lighter_id,
    l.nickname || l.model_name || `Lighter #${l.lighter_id}`,
  ]));
}

export default function LostFoundPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('lost');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);

  // Name lookup maps
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());
  const [lighterNames, setLighterNames] = useState<Map<number, string>>(new Map());

  // Stats
  const [activeLost, setActiveLost] = useState(0);
  const [totalFound, setTotalFound] = useState(0);
  const [reunions, setReunions] = useState(0);
  const [pendingClaims, setPendingClaims] = useState(0);

  // History modal
  const [historyLighter, setHistoryLighter] = useState<{ id: number; name: string } | null>(null);

  // Apply URL params on mount
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'lost' || tab === 'found' || tab === 'claims') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const fetchStats = async () => {
    const [lost, found, returned, pending] = await Promise.all([
      supabase.from('lost_reports').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('found_reports').select('*', { count: 'exact', head: true }),
      supabase.from('found_reports').select('*', { count: 'exact', head: true }).eq('resolution_status', 'returned'),
      supabase.from('ownership_claims').select('*', { count: 'exact', head: true }).eq('claim_status', 'pending'),
    ]);
    setActiveLost(lost.count || 0);
    setTotalFound(found.count || 0);
    setReunions(returned.count || 0);
    setPendingClaims(pending.count || 0);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const filter = searchParams.get('filter');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows: any[] = [];
    let count = 0;

    if (activeTab === 'lost') {
      let query = supabase
        .from('lost_reports')
        .select('lost_id, lighter_id, user_id, last_known_location_name, is_active, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (filter === 'active') query = query.eq('is_active', true);
      const result = await query;
      rows = result.data || [];
      count = result.count || 0;
    } else if (activeTab === 'found') {
      let query = supabase
        .from('found_reports')
        .select('found_id, lighter_id, finder_user_id, found_location_name, resolution_status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (filter === 'returned') query = query.eq('resolution_status', 'returned');
      const result = await query;
      rows = result.data || [];
      count = result.count || 0;
    } else {
      let query = supabase
        .from('ownership_claims')
        .select('claim_id, lighter_id, claimant_user_id, claim_reason, claim_status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (filter === 'pending') query = query.eq('claim_status', 'pending');
      const result = await query;
      rows = result.data || [];
      count = result.count || 0;
    }

    // Enrich with user & lighter names
    if (rows.length > 0) {
      const uIds = [...new Set(rows.map((r) => r.user_id || r.finder_user_id || r.claimant_user_id).filter(Boolean))];
      const lIds = [...new Set(rows.map((r) => r.lighter_id).filter(Boolean))];
      const [uMap, lMap] = await Promise.all([
        fetchUserNames(uIds),
        fetchLighterNames(lIds),
      ]);
      setUserNames(uMap);
      setLighterNames(lMap);
    } else {
      setUserNames(new Map());
      setLighterNames(new Map());
    }

    setData(rows);
    setTotalCount(count);
    setLoading(false);
  }, [activeTab, page, searchParams]);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const reunionRate = totalFound > 0 ? Math.round((reunions / totalFound) * 100) : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lostColumns: any[] = [
    {
      key: 'lost_id',
      label: 'Report',
      render: (r: { lost_id: number }) => <span className="text-muted-foreground font-mono">#{r.lost_id}</span>,
    },
    {
      key: 'lighter_id',
      label: 'Lighter',
      render: (r: { lighter_id: number }) => (
        <div>
          <span className="text-foreground text-sm">{lighterNames.get(r.lighter_id) || `Lighter #${r.lighter_id}`}</span>
          <span className="text-muted-foreground text-[10px] block font-mono">#{r.lighter_id}</span>
        </div>
      ),
    },
    {
      key: 'user_id',
      label: 'Reported By',
      render: (r: { user_id: number }) => (
        <div>
          <span className="text-foreground text-sm">{userNames.get(r.user_id) || `User #${r.user_id}`}</span>
          <span className="text-muted-foreground text-[10px] block font-mono">#{r.user_id}</span>
        </div>
      ),
    },
    {
      key: 'last_known_location_name',
      label: 'Last Known Location',
      render: (r: { last_known_location_name: string }) => (
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground text-xs">{r.last_known_location_name || '-'}</span>
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (r: { is_active: boolean }) => <StatusBadge status={r.is_active ? 'active' : 'resolved'} />,
    },
    {
      key: 'created_at',
      label: 'Lost Date',
      render: (r: { created_at: string }) => <span className="text-muted-foreground text-xs">{formatFullTimestamp(r.created_at)}</span>,
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const foundColumns: any[] = [
    {
      key: 'found_id',
      label: 'Report',
      render: (r: { found_id: number }) => <span className="text-muted-foreground font-mono">#{r.found_id}</span>,
    },
    {
      key: 'lighter_id',
      label: 'Lighter',
      render: (r: { lighter_id: number }) => (
        <div>
          <span className="text-foreground text-sm">{lighterNames.get(r.lighter_id) || `Lighter #${r.lighter_id}`}</span>
          <span className="text-muted-foreground text-[10px] block font-mono">#{r.lighter_id}</span>
        </div>
      ),
    },
    {
      key: 'finder_user_id',
      label: 'Found By',
      render: (r: { finder_user_id: number }) => (
        <div>
          <span className="text-foreground text-sm">{userNames.get(r.finder_user_id) || `User #${r.finder_user_id}`}</span>
          <span className="text-muted-foreground text-[10px] block font-mono">#{r.finder_user_id}</span>
        </div>
      ),
    },
    {
      key: 'found_location_name',
      label: 'Found Location',
      render: (r: { found_location_name: string }) => (
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground text-xs">{r.found_location_name || '-'}</span>
        </div>
      ),
    },
    {
      key: 'resolution_status',
      label: 'Resolution',
      render: (r: { resolution_status: string }) => <StatusBadge status={r.resolution_status} />,
    },
    {
      key: 'created_at',
      label: 'Found Date',
      render: (r: { created_at: string }) => <span className="text-muted-foreground text-xs">{formatFullTimestamp(r.created_at)}</span>,
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const claimsColumns: any[] = [
    {
      key: 'claim_id',
      label: 'Claim',
      render: (r: { claim_id: number }) => <span className="text-muted-foreground font-mono">#{r.claim_id}</span>,
    },
    {
      key: 'lighter_id',
      label: 'Lighter',
      render: (r: { lighter_id: number }) => (
        <div>
          <span className="text-foreground text-sm">{lighterNames.get(r.lighter_id) || `Lighter #${r.lighter_id}`}</span>
          <span className="text-muted-foreground text-[10px] block font-mono">#{r.lighter_id}</span>
        </div>
      ),
    },
    {
      key: 'claimant_user_id',
      label: 'Claimant',
      render: (r: { claimant_user_id: number }) => (
        <div>
          <span className="text-foreground text-sm">{userNames.get(r.claimant_user_id) || `User #${r.claimant_user_id}`}</span>
          <span className="text-muted-foreground text-[10px] block font-mono">#{r.claimant_user_id}</span>
        </div>
      ),
    },
    {
      key: 'claim_reason',
      label: 'Reason',
      render: (r: { claim_reason: string }) => <span className="text-muted-foreground text-xs">{r.claim_reason || '-'}</span>,
    },
    {
      key: 'claim_status',
      label: 'Status',
      render: (r: { claim_status: string }) => <StatusBadge status={r.claim_status} />,
    },
    {
      key: 'created_at',
      label: 'Filed',
      render: (r: { created_at: string }) => <span className="text-muted-foreground text-xs">{formatFullTimestamp(r.created_at)}</span>,
    },
  ];

  const columns = activeTab === 'lost' ? lostColumns : activeTab === 'found' ? foundColumns : claimsColumns;

  const tabs = [
    { key: 'lost', label: 'Lost Reports' },
    { key: 'found', label: 'Found Reports' },
    { key: 'claims', label: 'Ownership Claims' },
  ];

  return (
    <>
      <Header title="Lost & Found" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Lost Reports" value={formatNumber(activeLost)} icon={AlertTriangle} color="destructive" href="/dashboard/lost-found?tab=lost&filter=active" />
          <StatCard title="Total Found Reports" value={formatNumber(totalFound)} icon={CheckCircle2} color="info" href="/dashboard/lost-found?tab=found" />
          <StatCard title="Reunions" value={formatNumber(reunions)} icon={HandHeart} color="success" href="/dashboard/lost-found?tab=found&filter=returned" />
          <StatCard title="Pending Claims" value={formatNumber(pendingClaims)} icon={Clock} color="warning" href="/dashboard/lost-found?tab=claims&filter=pending" />
        </div>

        {/* Reunion Rate */}
        <div className="bg-card rounded-2xl border border-border p-5 card-shine">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Reunion Rate</h3>
              <p className="text-xs text-muted-foreground">{reunions} of {totalFound} found lighters returned</p>
            </div>
            <span className="text-2xl font-bold text-success">{reunionRate}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-success h-2 rounded-full transition-all duration-500" style={{ width: `${reunionRate}%` }} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-card rounded-xl p-1 border border-border w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(0); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          emptyMessage={`No ${activeTab} reports found`}
          actions={activeTab !== 'claims' ? [
            {
              label: 'View History',
              icon: 'view',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick: (item: any) => {
                setHistoryLighter({
                  id: item.lighter_id,
                  name: lighterNames.get(item.lighter_id) || `Lighter #${item.lighter_id}`,
                });
              },
            },
          ] : undefined}
        />

        {/* Pagination */}
        <Pagination page={page} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {/* Lighter History Modal */}
      <LighterHistoryModal
        open={!!historyLighter}
        onClose={() => setHistoryLighter(null)}
        lighterId={historyLighter?.id || 0}
        lighterName={historyLighter?.name || ''}
      />
    </>
  );
}
