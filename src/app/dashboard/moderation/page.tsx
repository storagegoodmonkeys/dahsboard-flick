'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { supabase } from '@/lib/supabase';
import { formatNumber, timeAgo } from '@/lib/utils';
import {
  Shield,
  AlertTriangle,
  Flag,
  Ban,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

interface Report {
  report_id: number;
  reporter_user_id: number;
  content_type: string;
  content_id: number;
  report_reason: string;
  custom_reason: string;
  additional_info: string;
  status: string;
  priority: string;
  resolution_action: string;
  resolution_notes: string;
  created_at: string;
}

interface FlaggedItem {
  flag_id: number;
  content_type: string;
  content_id: number;
  flag_reason: string;
  flagged_text: string;
  confidence_score: number;
  status: string;
  created_at: string;
}

interface BannedUser {
  ban_id: number;
  user_id: number;
  ban_type: string;
  reason: string;
  duration_days: number;
  starts_at: string;
  expires_at: string;
  appeal_status: string;
  created_at: string;
}

const PAGE_SIZE = 15;

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState<'reports' | 'flagged' | 'bans'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [flaggedItems, setFlaggedItems] = useState<FlaggedItem[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Stats
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingFlags, setPendingFlags] = useState(0);
  const [activeBans, setActiveBans] = useState(0);
  const [urgentReports, setUrgentReports] = useState(0);

  const fetchStats = async () => {
    const [reports, flags, bans, urgent] = await Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true }).in('status', ['pending', 'under_review']),
      supabase.from('flagged_content').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('banned_users').select('*', { count: 'exact', head: true }).or('expires_at.is.null,expires_at.gt.now()'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('priority', 'urgent').in('status', ['pending', 'under_review']),
    ]);
    setPendingReports(reports.count || 0);
    setPendingFlags(flags.count || 0);
    setActiveBans(bans.count || 0);
    setUrgentReports(urgent.count || 0);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'reports') {
      const { data, count } = await supabase
        .from('reports')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      setReports((data as Report[]) || []);
      setTotalCount(count || 0);
    } else if (activeTab === 'flagged') {
      const { data, count } = await supabase
        .from('flagged_content')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      setFlaggedItems((data as FlaggedItem[]) || []);
      setTotalCount(count || 0);
    } else {
      const { data, count } = await supabase
        .from('banned_users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      setBannedUsers((data as BannedUser[]) || []);
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

  const reportColumns = [
    {
      key: 'report_id',
      label: 'ID',
      render: (r: Report) => <span className="text-muted-foreground font-mono">#{r.report_id}</span>,
    },
    {
      key: 'content_type',
      label: 'Type',
      render: (r: Report) => (
        <span className="text-foreground capitalize text-xs bg-muted px-2 py-1 rounded">{r.content_type}</span>
      ),
    },
    {
      key: 'report_reason',
      label: 'Reason',
      render: (r: Report) => (
        <span className="text-foreground capitalize text-xs">{r.report_reason.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (r: Report) => <StatusBadge status={r.priority} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (r: Report) => <StatusBadge status={r.status} />,
    },
    {
      key: 'reporter_user_id',
      label: 'Reporter',
      render: (r: Report) => <span className="text-muted-foreground">User #{r.reporter_user_id}</span>,
    },
    {
      key: 'created_at',
      label: 'Filed',
      render: (r: Report) => <span className="text-muted-foreground text-xs">{timeAgo(r.created_at)}</span>,
    },
  ];

  const flaggedColumns = [
    {
      key: 'flag_id',
      label: 'ID',
      render: (f: FlaggedItem) => <span className="text-muted-foreground font-mono">#{f.flag_id}</span>,
    },
    {
      key: 'content_type',
      label: 'Type',
      render: (f: FlaggedItem) => (
        <span className="text-foreground capitalize text-xs bg-muted px-2 py-1 rounded">{f.content_type}</span>
      ),
    },
    {
      key: 'flag_reason',
      label: 'Reason',
      render: (f: FlaggedItem) => (
        <span className="text-foreground capitalize text-xs">{f.flag_reason.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'flagged_text',
      label: 'Content',
      render: (f: FlaggedItem) => (
        <span className="text-foreground text-xs max-w-[200px] truncate block">{f.flagged_text || '-'}</span>
      ),
    },
    {
      key: 'confidence_score',
      label: 'Confidence',
      render: (f: FlaggedItem) => (
        <span className={`text-xs font-medium ${f.confidence_score > 80 ? 'text-destructive' : f.confidence_score > 50 ? 'text-warning' : 'text-muted-foreground'}`}>
          {f.confidence_score}%
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (f: FlaggedItem) => <StatusBadge status={f.status} />,
    },
    {
      key: 'created_at',
      label: 'Flagged',
      render: (f: FlaggedItem) => <span className="text-muted-foreground text-xs">{timeAgo(f.created_at)}</span>,
    },
  ];

  const banColumns = [
    {
      key: 'ban_id',
      label: 'ID',
      render: (b: BannedUser) => <span className="text-muted-foreground font-mono">#{b.ban_id}</span>,
    },
    {
      key: 'user_id',
      label: 'User',
      render: (b: BannedUser) => <span className="text-foreground">User #{b.user_id}</span>,
    },
    {
      key: 'ban_type',
      label: 'Type',
      render: (b: BannedUser) => (
        <StatusBadge status={b.ban_type === 'permanent' ? 'banned' : 'suspended'} />
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (b: BannedUser) => (
        <span className="text-foreground text-xs max-w-[200px] truncate block">{b.reason || '-'}</span>
      ),
    },
    {
      key: 'duration_days',
      label: 'Duration',
      render: (b: BannedUser) => (
        <span className="text-muted-foreground text-xs">
          {b.ban_type === 'permanent' ? 'Permanent' : `${b.duration_days} days`}
        </span>
      ),
    },
    {
      key: 'appeal_status',
      label: 'Appeal',
      render: (b: BannedUser) => <StatusBadge status={b.appeal_status || 'none'} />,
    },
    {
      key: 'created_at',
      label: 'Banned',
      render: (b: BannedUser) => <span className="text-muted-foreground text-xs">{timeAgo(b.created_at)}</span>,
    },
  ];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <>
      <Header title="Moderation" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Pending Reports" value={formatNumber(pendingReports)} icon={Shield} color="warning" />
          <StatCard title="Flagged Content" value={formatNumber(pendingFlags)} icon={Flag} color="destructive" />
          <StatCard title="Active Bans" value={formatNumber(activeBans)} icon={Ban} color="destructive" />
          <StatCard title="Urgent Reports" value={formatNumber(urgentReports)} icon={AlertTriangle} color="warning" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
          {(['reports', 'flagged', 'bans'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(0); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'flagged' ? 'Flagged Content' : tab === 'bans' ? 'Banned Users' : 'Reports'}
            </button>
          ))}
        </div>

        {/* Tables */}
        {activeTab === 'reports' && (
          <DataTable
            columns={reportColumns}
            data={reports}
            loading={loading}
            emptyMessage="No reports found"
            onRowClick={(item) => setSelectedReport(item as unknown as Report)}
          />
        )}
        {activeTab === 'flagged' && (
          <DataTable columns={flaggedColumns} data={flaggedItems} loading={loading} emptyMessage="No flagged content" />
        )}
        {activeTab === 'bans' && (
          <DataTable columns={banColumns} data={bannedUsers} loading={loading} emptyMessage="No banned users" />
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

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Report #{selectedReport.report_id}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Filed {timeAgo(selectedReport.created_at)}
                  </p>
                </div>
                <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Content Type</span>
                  <span className="text-foreground capitalize">{selectedReport.content_type}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Content ID</span>
                  <span className="text-foreground">#{selectedReport.content_id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Reason</span>
                  <span className="text-foreground capitalize">{selectedReport.report_reason.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Priority</span>
                  <StatusBadge status={selectedReport.priority} />
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={selectedReport.status} />
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Reporter</span>
                  <span className="text-foreground">User #{selectedReport.reporter_user_id}</span>
                </div>
                {selectedReport.custom_reason && (
                  <div className="py-2 border-b border-border/50">
                    <span className="text-muted-foreground block mb-1">Custom Reason</span>
                    <span className="text-foreground">{selectedReport.custom_reason}</span>
                  </div>
                )}
                {selectedReport.additional_info && (
                  <div className="py-2 border-b border-border/50">
                    <span className="text-muted-foreground block mb-1">Additional Info</span>
                    <span className="text-foreground">{selectedReport.additional_info}</span>
                  </div>
                )}
                {selectedReport.resolution_action && selectedReport.resolution_action !== 'none' && (
                  <div className="py-2 border-b border-border/50">
                    <span className="text-muted-foreground block mb-1">Resolution</span>
                    <span className="text-foreground capitalize">{selectedReport.resolution_action.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {selectedReport.resolution_notes && (
                  <div className="py-2">
                    <span className="text-muted-foreground block mb-1">Resolution Notes</span>
                    <span className="text-foreground">{selectedReport.resolution_notes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
