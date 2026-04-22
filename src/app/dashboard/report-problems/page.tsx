'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { formatNumber, timeAgo, formatFullTimestamp } from '@/lib/utils';
import { Bug, AlertCircle, Search } from 'lucide-react';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];

interface ReportProblem {
  id: number;
  user_id: string | null;
  name: string;
  email: string;
  problem_type: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_user_id?: number;
  resolved_user_name?: string;
  resolved_user_email?: string;
}

const PAGE_SIZE = 15;

export default function ReportProblemsPage() {
  const [data, setData] = useState<ReportProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReportProblem | null>(null);
  const [total, setTotal] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdating(true);
    await fetch('/api/admin/table', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'report_problems', id, status: newStatus }),
    });
    setData((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
    if (selected?.id === id) {
      setSelected((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
    setUpdating(false);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ table: 'report_problems', page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/table?${params}`);
    const { data: rows, count } = await res.json();
    const items = (rows || []) as ReportProblem[];
    setData(items);
    setTotalCount(count || 0);
    setTotal(count || 0);
    setOpenCount(items.filter((p) => p.status === 'open' || !p.status).length);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { key: 'id', label: 'ID', render: (p: ReportProblem) => <span className="text-muted-foreground font-mono">#{p.id}</span> },
    {
      key: 'name', label: 'Reporter',
      render: (p: ReportProblem) => (
        <div>
          <span className="text-foreground text-sm">{p.name || 'Anonymous'}</span>
        </div>
      ),
    },
    { key: 'problem_type', label: 'Type', render: (p: ReportProblem) => <span className="text-foreground capitalize text-xs bg-muted px-2 py-1 rounded">{(p.problem_type || '-').replace(/_/g, ' ')}</span> },
    { key: 'description', label: 'Description', render: (p: ReportProblem) => <span className="text-muted-foreground text-xs max-w-[300px] truncate block">{p.description}</span> },
    { key: 'status', label: 'Status', render: (p: ReportProblem) => <StatusBadge status={p.status || 'open'} /> },
    { key: 'created_at', label: 'Date', render: (p: ReportProblem) => <span className="text-muted-foreground text-xs">{timeAgo(p.created_at)}</span> },
  ];

  return (
    <>
      <Header title="Report Problems" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard title="Total Problems" value={formatNumber(total)} icon={Bug} color="destructive" />
          <StatCard title="Open" value={formatNumber(openCount)} icon={AlertCircle} color="warning" />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search by name, email, type..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <DataTable columns={columns} data={data} loading={loading} emptyMessage="No problem reports" onRowClick={(item) => setSelected(item as unknown as ReportProblem)} />
        <Pagination page={page} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Problem #${selected?.id}`} subtitle={selected ? timeAgo(selected.created_at) : undefined}>
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Reporter</p>
              <p className="text-foreground font-medium">{selected.resolved_user_name || selected.name || 'Anonymous'} {selected.resolved_user_id && <span className="text-muted-foreground font-mono text-xs">#{selected.resolved_user_id}</span>}</p>
              <p className="text-muted-foreground text-xs">{selected.resolved_user_email || selected.email}</p>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Problem Type</span>
              <span className="text-foreground capitalize">{(selected.problem_type || '-').replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Status</span>
              <select
                value={selected.status || 'open'}
                onChange={(e) => handleStatusChange(selected.id, e.target.value)}
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
              <span className="text-foreground text-xs">{formatFullTimestamp(selected.created_at)}</span>
            </div>
            <div className="pt-1">
              <span className="text-muted-foreground block mb-1.5">Description</span>
              <div className="bg-muted/50 rounded-lg p-3 text-foreground whitespace-pre-wrap">{selected.description}</div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
