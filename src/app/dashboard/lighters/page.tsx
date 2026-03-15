'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { supabase } from '@/lib/supabase';
import { formatNumber, formatDate } from '@/lib/utils';
import {
  Flame,
  QrCode,
  Search,
  MapPin,
  ChevronLeft,
  ChevronRight,
  X,
  Package,
} from 'lucide-react';

interface Lighter {
  lighter_id: number;
  qr_code: string;
  nickname: string;
  model_name: string;
  lighter_status: number;
  total_owners_count: number;
  total_distance_km: number;
  times_lost_count: number;
  times_found_count: number;
  created_at: string;
}

const STATUS_MAP: Record<number, string> = {
  0: 'unregistered',
  1: 'registered',
  2: 'lost',
  3: 'discarded',
  4: 'found',
};

const PAGE_SIZE = 20;

export default function LightersPage() {
  const [lighters, setLighters] = useState<Lighter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLighter, setSelectedLighter] = useState<Lighter | null>(null);
  const [ownershipHistory, setOwnershipHistory] = useState<Array<{
    ownership_id: number;
    user_id: number;
    acquisition_type: string;
    acquisition_date: string;
    acquisition_location_name: string;
    is_current_owner: boolean;
  }>>([]);

  // Stats
  const [totalLighters, setTotalLighters] = useState(0);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [lostCount, setLostCount] = useState(0);
  const [availableQRCodes, setAvailableQRCodes] = useState(0);

  const fetchLighters = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('lighters')
      .select('lighter_id, qr_code, nickname, model_name, lighter_status, total_owners_count, total_distance_km, times_lost_count, times_found_count, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== 'all') {
      const statusNum = Object.entries(STATUS_MAP).find(([, v]) => v === statusFilter)?.[0];
      if (statusNum !== undefined) {
        query = query.eq('lighter_status', Number(statusNum));
      }
    }
    if (searchQuery) {
      query = query.or(`nickname.ilike.%${searchQuery}%,qr_code.ilike.%${searchQuery}%,model_name.ilike.%${searchQuery}%`);
    }

    const { data, count } = await query;
    setLighters((data as Lighter[]) || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [page, statusFilter, searchQuery]);

  const fetchStats = async () => {
    const [total, registered, lost, qrCodes] = await Promise.all([
      supabase.from('lighters').select('*', { count: 'exact', head: true }),
      supabase.from('lighters').select('*', { count: 'exact', head: true }).eq('lighter_status', 1),
      supabase.from('lighters').select('*', { count: 'exact', head: true }).eq('lighter_status', 2),
      supabase.from('lighter_codes').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    ]);
    setTotalLighters(total.count || 0);
    setRegisteredCount(registered.count || 0);
    setLostCount(lost.count || 0);
    setAvailableQRCodes(qrCodes.count || 0);
  };

  const fetchLighterDetail = async (lighter: Lighter) => {
    setSelectedLighter(lighter);
    const { data } = await supabase
      .from('lighter_ownership')
      .select('ownership_id, user_id, acquisition_type, acquisition_date, acquisition_location_name, is_current_owner')
      .eq('lighter_id', lighter.lighter_id)
      .order('acquisition_date', { ascending: false });
    setOwnershipHistory(data || []);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLighters();
  }, [fetchLighters]);

  const columns = [
    {
      key: 'nickname',
      label: 'Lighter',
      render: (l: Lighter) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <Flame className="w-4 h-4 text-warning" />
          </div>
          <div>
            <p className="text-foreground font-medium">{l.nickname || `Lighter #${l.lighter_id}`}</p>
            <p className="text-xs text-muted-foreground font-mono">{l.qr_code?.slice(0, 12)}...</p>
          </div>
        </div>
      ),
    },
    {
      key: 'model_name',
      label: 'Model',
      render: (l: Lighter) => (
        <span className="text-muted-foreground">{l.model_name || '-'}</span>
      ),
    },
    {
      key: 'lighter_status',
      label: 'Status',
      render: (l: Lighter) => <StatusBadge status={STATUS_MAP[l.lighter_status] || 'unknown'} />,
    },
    {
      key: 'total_owners_count',
      label: 'Owners',
      render: (l: Lighter) => (
        <span className="text-foreground">{l.total_owners_count}</span>
      ),
    },
    {
      key: 'total_distance_km',
      label: 'Distance',
      render: (l: Lighter) => (
        <span className="text-info">{l.total_distance_km} km</span>
      ),
    },
    {
      key: 'times_lost_count',
      label: 'Lost/Found',
      render: (l: Lighter) => (
        <span className="text-muted-foreground">
          <span className="text-destructive">{l.times_lost_count}</span>
          {' / '}
          <span className="text-success">{l.times_found_count}</span>
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Registered',
      render: (l: Lighter) => (
        <span className="text-muted-foreground text-xs">{formatDate(l.created_at)}</span>
      ),
    },
  ];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <>
      <Header title="Lighters" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Lighters" value={formatNumber(totalLighters)} icon={Flame} color="warning" />
          <StatCard title="Registered" value={formatNumber(registeredCount)} icon={QrCode} color="success" />
          <StatCard title="Currently Lost" value={formatNumber(lostCount)} icon={MapPin} color="destructive" />
          <StatCard title="Available QR Codes" value={formatNumber(availableQRCodes)} icon={Package} color="info" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by nickname, QR code, or model..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="all">All Statuses</option>
            <option value="unregistered">Unregistered</option>
            <option value="registered">Registered</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
            <option value="discarded">Discarded</option>
          </select>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={lighters}
          loading={loading}
          emptyMessage="No lighters found"
          onRowClick={(item) => fetchLighterDetail(item as unknown as Lighter)}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-2 rounded-lg bg-card border border-border text-foreground disabled:opacity-30 hover:bg-muted transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground px-3">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="p-2 rounded-lg bg-card border border-border text-foreground disabled:opacity-30 hover:bg-muted transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lighter Detail Modal */}
      {selectedLighter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-warning/10 flex items-center justify-center">
                    <Flame className="w-7 h-7 text-warning" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {selectedLighter.nickname || `Lighter #${selectedLighter.lighter_id}`}
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono">{selectedLighter.qr_code}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedLighter(null)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{selectedLighter.total_owners_count}</p>
                  <p className="text-xs text-muted-foreground">Owners</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-info">{selectedLighter.total_distance_km} km</p>
                  <p className="text-xs text-muted-foreground">Distance</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <StatusBadge status={STATUS_MAP[selectedLighter.lighter_status] || 'unknown'} />
                  <p className="text-xs text-muted-foreground mt-1">Status</p>
                </div>
              </div>

              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Model</span>
                  <span className="text-foreground">{selectedLighter.model_name || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Times Lost</span>
                  <span className="text-destructive">{selectedLighter.times_lost_count}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Times Found</span>
                  <span className="text-success">{selectedLighter.times_found_count}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Registered</span>
                  <span className="text-foreground">{formatDate(selectedLighter.created_at)}</span>
                </div>
              </div>

              {/* Ownership History */}
              <h3 className="text-sm font-semibold text-foreground mb-3">Ownership History</h3>
              {ownershipHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No ownership records</p>
              ) : (
                <div className="space-y-2">
                  {ownershipHistory.map((o) => (
                    <div key={o.ownership_id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${o.is_current_owner ? 'bg-success' : 'bg-muted-foreground'}`} />
                      <div className="flex-1">
                        <p className="text-xs text-foreground">
                          User #{o.user_id} &middot; <span className="capitalize">{o.acquisition_type}</span>
                          {o.is_current_owner && <span className="text-success ml-2">(Current)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.acquisition_location_name || 'Unknown location'} &middot; {formatDate(o.acquisition_date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
