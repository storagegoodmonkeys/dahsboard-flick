'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { supabase } from '@/lib/supabase';
import { formatNumber, formatDate, timeAgo } from '@/lib/utils';
import {
  Search,
  MapPin,
  HandHeart,
  AlertTriangle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface LostReport {
  lost_id: number;
  lighter_id: number;
  reported_by_user_id: number;
  lost_date: string;
  last_known_location_name: string;
  is_active: boolean;
  resolved_at: string | null;
  created_at: string;
}

interface FoundReport {
  found_id: number;
  lighter_id: number;
  finder_user_id: number;
  found_date: string;
  found_location_name: string;
  resolution_status: string;
  created_at: string;
}

interface OwnershipClaim {
  claim_id: number;
  lighter_id: number;
  claimant_user_id: number;
  claim_reason: string;
  claim_status: string;
  created_at: string;
}

const PAGE_SIZE = 15;

export default function LostFoundPage() {
  const [activeTab, setActiveTab] = useState<'lost' | 'found' | 'claims'>('lost');
  const [lostReports, setLostReports] = useState<LostReport[]>([]);
  const [foundReports, setFoundReports] = useState<FoundReport[]>([]);
  const [claims, setClaims] = useState<OwnershipClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Stats
  const [activeLost, setActiveLost] = useState(0);
  const [totalFound, setTotalFound] = useState(0);
  const [totalReunions, setTotalReunions] = useState(0);
  const [pendingClaims, setPendingClaims] = useState(0);

  const fetchStats = async () => {
    const [lost, found, reunions, claimsCount] = await Promise.all([
      supabase.from('lost_reports').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('found_reports').select('*', { count: 'exact', head: true }),
      supabase.from('found_reports').select('*', { count: 'exact', head: true }).eq('resolution_status', 'returned'),
      supabase.from('ownership_claims').select('*', { count: 'exact', head: true }).eq('claim_status', 'pending'),
    ]);
    setActiveLost(lost.count || 0);
    setTotalFound(found.count || 0);
    setTotalReunions(reunions.count || 0);
    setPendingClaims(claimsCount.count || 0);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'lost') {
      const { data, count } = await supabase
        .from('lost_reports')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      setLostReports((data as LostReport[]) || []);
      setTotalCount(count || 0);
    } else if (activeTab === 'found') {
      const { data, count } = await supabase
        .from('found_reports')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      setFoundReports((data as FoundReport[]) || []);
      setTotalCount(count || 0);
    } else {
      const { data, count } = await supabase
        .from('ownership_claims')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      setClaims((data as OwnershipClaim[]) || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [activeTab, page]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const lostColumns = [
    {
      key: 'lost_id',
      label: 'ID',
      render: (r: LostReport) => <span className="text-muted-foreground font-mono">#{r.lost_id}</span>,
    },
    {
      key: 'lighter_id',
      label: 'Lighter',
      render: (r: LostReport) => <span className="text-foreground">Lighter #{r.lighter_id}</span>,
    },
    {
      key: 'reported_by_user_id',
      label: 'Reported By',
      render: (r: LostReport) => <span className="text-muted-foreground">User #{r.reported_by_user_id}</span>,
    },
    {
      key: 'last_known_location_name',
      label: 'Last Known Location',
      render: (r: LostReport) => (
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-destructive" />
          <span className="text-foreground text-xs">{r.last_known_location_name || 'Unknown'}</span>
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (r: LostReport) => (
        <StatusBadge status={r.is_active ? 'active' : 'resolved'} />
      ),
    },
    {
      key: 'lost_date',
      label: 'Lost Date',
      render: (r: LostReport) => <span className="text-muted-foreground text-xs">{formatDate(r.lost_date)}</span>,
    },
  ];

  const foundColumns = [
    {
      key: 'found_id',
      label: 'ID',
      render: (r: FoundReport) => <span className="text-muted-foreground font-mono">#{r.found_id}</span>,
    },
    {
      key: 'lighter_id',
      label: 'Lighter',
      render: (r: FoundReport) => <span className="text-foreground">Lighter #{r.lighter_id}</span>,
    },
    {
      key: 'finder_user_id',
      label: 'Found By',
      render: (r: FoundReport) => <span className="text-muted-foreground">User #{r.finder_user_id}</span>,
    },
    {
      key: 'found_location_name',
      label: 'Found Location',
      render: (r: FoundReport) => (
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-success" />
          <span className="text-foreground text-xs">{r.found_location_name || 'Unknown'}</span>
        </div>
      ),
    },
    {
      key: 'resolution_status',
      label: 'Resolution',
      render: (r: FoundReport) => <StatusBadge status={r.resolution_status} />,
    },
    {
      key: 'found_date',
      label: 'Found Date',
      render: (r: FoundReport) => <span className="text-muted-foreground text-xs">{formatDate(r.found_date)}</span>,
    },
  ];

  const claimColumns = [
    {
      key: 'claim_id',
      label: 'ID',
      render: (c: OwnershipClaim) => <span className="text-muted-foreground font-mono">#{c.claim_id}</span>,
    },
    {
      key: 'lighter_id',
      label: 'Lighter',
      render: (c: OwnershipClaim) => <span className="text-foreground">Lighter #{c.lighter_id}</span>,
    },
    {
      key: 'claimant_user_id',
      label: 'Claimant',
      render: (c: OwnershipClaim) => <span className="text-muted-foreground">User #{c.claimant_user_id}</span>,
    },
    {
      key: 'claim_reason',
      label: 'Reason',
      render: (c: OwnershipClaim) => (
        <span className="text-foreground text-xs max-w-[200px] truncate block">{c.claim_reason || '-'}</span>
      ),
    },
    {
      key: 'claim_status',
      label: 'Status',
      render: (c: OwnershipClaim) => <StatusBadge status={c.claim_status} />,
    },
    {
      key: 'created_at',
      label: 'Filed',
      render: (c: OwnershipClaim) => <span className="text-muted-foreground text-xs">{timeAgo(c.created_at)}</span>,
    },
  ];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <>
      <Header title="Lost & Found" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Lost Reports" value={formatNumber(activeLost)} icon={AlertTriangle} color="destructive" />
          <StatCard title="Total Found Reports" value={formatNumber(totalFound)} icon={Search} color="info" />
          <StatCard title="Reunions" value={formatNumber(totalReunions)} icon={HandHeart} color="success" />
          <StatCard title="Pending Claims" value={formatNumber(pendingClaims)} icon={Eye} color="warning" />
        </div>

        {/* Reunion Rate */}
        {totalFound > 0 && (
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Reunion Rate</h3>
                <p className="text-xs text-muted-foreground mt-1">Percentage of found lighters returned to owners</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-success">
                  {totalFound > 0 ? Math.round((totalReunions / totalFound) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">{totalReunions} of {totalFound} returned</p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all duration-500"
                style={{ width: `${totalFound > 0 ? (totalReunions / totalFound) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
          {(['lost', 'found', 'claims'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(0); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'claims' ? 'Ownership Claims' : `${tab} Reports`}
            </button>
          ))}
        </div>

        {/* Table */}
        {activeTab === 'lost' && (
          <DataTable columns={lostColumns} data={lostReports} loading={loading} emptyMessage="No lost reports" />
        )}
        {activeTab === 'found' && (
          <DataTable columns={foundColumns} data={foundReports} loading={loading} emptyMessage="No found reports" />
        )}
        {activeTab === 'claims' && (
          <DataTable columns={claimColumns} data={claims} loading={loading} emptyMessage="No ownership claims" />
        )}

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
    </>
  );
}
