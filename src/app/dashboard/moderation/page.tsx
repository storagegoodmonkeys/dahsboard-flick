'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { formatNumber, timeAgo, formatFullTimestamp } from '@/lib/utils';
import { Shield, AlertTriangle, Search } from 'lucide-react';

const STATUS_OPTIONS = ['pending', 'reviewed', 'resolved', 'email_sent', 'dismissed'];

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
  reporter_name?: string;
  reporter_email?: string;
  reported_name?: string;
  reported_email?: string;
}

const PAGE_SIZE = 15;

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [totalReports, setTotalReports] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);

  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ table: 'reports', page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/table?${params}`);
    const { data, count } = await res.json();
    setReports((data || []) as Report[]);
    setTotalCount(count || 0);
    setTotalReports(count || 0);
    setPendingReports((data || []).filter((r: Report) => r.status === 'pending').length);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (reportId: number, newStatus: string) => {
    setUpdating(true);
    await fetch('/api/admin/table', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'reports', id: reportId, status: newStatus }),
    });
    // Update local state
    setReports((prev) => prev.map((r) => r.report_id === reportId ? { ...r, status: newStatus } : r));
    if (selectedReport?.report_id === reportId) {
      setSelectedReport((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
    setUpdating(false);
  };

  const columns = [
    { key: 'report_id', label: 'ID', render: (r: Report) => <span className="text-muted-foreground font-mono">#{r.report_id}</span> },
    {
      key: 'reporter_name', label: 'Reporter',
      render: (r: Report) => (
        <div>
          <span className="text-foreground text-sm">{r.reporter_name}</span>
          <span className="text-muted-foreground text-[10px] block font-mono">#{r.reporter_user_id}</span>
        </div>
      ),
    },
    {
      key: 'reported_name', label: 'Reported User',
      render: (r: Report) => (
        <div>
          <span className="text-foreground text-sm">{r.reported_name}</span>
          <span className="text-muted-foreground text-[10px] block font-mono">#{r.content_id}</span>
        </div>
      ),
    },
    { key: 'report_reason', label: 'Reason', render: (r: Report) => <span className="text-foreground capitalize text-xs bg-muted px-2 py-1 rounded">{r.report_reason?.replace(/_/g, ' ')}</span> },
    { key: 'priority', label: 'Priority', render: (r: Report) => <StatusBadge status={r.priority || 'medium'} /> },
    { key: 'status', label: 'Status', render: (r: Report) => <StatusBadge status={r.status} /> },
    { key: 'created_at', label: 'Date', render: (r: Report) => <span className="text-muted-foreground text-xs">{timeAgo(r.created_at)}</span> },
  ];

  return (
    <>
      <Header title="Reports" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          <StatCard title="Total Reports" value={formatNumber(totalReports)} icon={Shield} color="warning" />
          <StatCard title="Pending" value={formatNumber(pendingReports)} icon={AlertTriangle} color="destructive" />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search by reason..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <DataTable columns={columns} data={reports} loading={loading} emptyMessage="No reports" onRowClick={(item) => setSelectedReport(item as unknown as Report)} />
        <Pagination page={page} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      <Modal
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={`Report #${selectedReport?.report_id}`}
        subtitle={selectedReport ? `Filed ${timeAgo(selectedReport.created_at)}` : undefined}
      >
        {selectedReport && (
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Reporter</p>
              <p className="text-foreground font-medium">{selectedReport.reporter_name} <span className="text-muted-foreground font-mono text-xs">#{selectedReport.reporter_user_id}</span></p>
              {selectedReport.reporter_email && <p className="text-muted-foreground text-xs">{selectedReport.reporter_email}</p>}
            </div>
            <div className="p-3 bg-destructive/5 border border-destructive/10 rounded-lg space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Reported User</p>
              <p className="text-foreground font-medium">{selectedReport.reported_name} <span className="text-muted-foreground font-mono text-xs">#{selectedReport.content_id}</span></p>
              {selectedReport.reported_email && <p className="text-muted-foreground text-xs">{selectedReport.reported_email}</p>}
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Content Type</span>
              <span className="text-foreground capitalize">{selectedReport.content_type}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Reason</span>
              <span className="text-foreground capitalize">{selectedReport.report_reason?.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Priority</span>
              <StatusBadge status={selectedReport.priority} />
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Status</span>
              <select
                value={selectedReport.status}
                onChange={(e) => handleStatusChange(selectedReport.report_id, e.target.value)}
                disabled={updating}
                className="bg-card border border-border rounded-lg px-2 py-1 text-xs text-foreground capitalize cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Date</span>
              <span className="text-foreground text-xs">{formatFullTimestamp(selectedReport.created_at)}</span>
            </div>
            {selectedReport.custom_reason && (
              <div className="pt-1">
                <span className="text-muted-foreground block mb-1.5">Custom Reason</span>
                <div className="bg-muted/50 rounded-lg p-3 text-foreground whitespace-pre-wrap">{selectedReport.custom_reason}</div>
              </div>
            )}
            {selectedReport.additional_info && (
              <div className="pt-1">
                <span className="text-muted-foreground block mb-1.5">Additional Info</span>
                <div className="bg-muted/50 rounded-lg p-3 text-foreground whitespace-pre-wrap">{selectedReport.additional_info}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
