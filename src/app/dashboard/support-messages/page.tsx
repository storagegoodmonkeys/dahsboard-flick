'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { formatNumber, timeAgo, formatFullTimestamp } from '@/lib/utils';
import { MessageSquare, Clock, Search } from 'lucide-react';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];

interface SupportMessage {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_user_id?: number;
  resolved_user_name?: string;
  resolved_user_email?: string;
}

const PAGE_SIZE = 15;

export default function SupportMessagesPage() {
  const [data, setData] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SupportMessage | null>(null);
  const [total, setTotal] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdating(true);
    await fetch('/api/admin/table', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'support_messages', id, status: newStatus }),
    });
    setData((prev) => prev.map((m) => m.id === id ? { ...m, status: newStatus } : m));
    if (selected?.id === id) {
      setSelected((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
    setUpdating(false);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ table: 'support_messages', page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/table?${params}`);
    const { data: rows, count } = await res.json();
    const items = (rows || []) as SupportMessage[];
    setData(items);
    setTotalCount(count || 0);
    setTotal(count || 0);
    setOpenCount(items.filter((m) => m.status === 'open' || !m.status).length);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    {
      key: 'name', label: 'From',
      render: (m: SupportMessage) => (
        <div>
          <span className="text-foreground text-sm">{m.name}</span>
        </div>
      ),
    },
    { key: 'subject', label: 'Subject', render: (m: SupportMessage) => <span className="text-foreground text-sm max-w-[200px] truncate block">{m.subject || '-'}</span> },
    { key: 'message', label: 'Message', render: (m: SupportMessage) => <span className="text-muted-foreground text-xs max-w-[300px] truncate block">{m.message}</span> },
    { key: 'status', label: 'Status', render: (m: SupportMessage) => <StatusBadge status={m.status || 'open'} /> },
    { key: 'created_at', label: 'Date', render: (m: SupportMessage) => <span className="text-muted-foreground text-xs">{timeAgo(m.created_at)}</span> },
  ];

  return (
    <>
      <Header title="Support Messages" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard title="Total Messages" value={formatNumber(total)} icon={MessageSquare} color="info" />
          <StatCard title="Open" value={formatNumber(openCount)} icon={Clock} color="warning" />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search by name, email, subject..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <DataTable columns={columns} data={data} loading={loading} emptyMessage="No support messages" onRowClick={(item) => setSelected(item as unknown as SupportMessage)} />
        <Pagination page={page} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.subject || 'Message'} subtitle={selected ? `From ${selected.name}` : undefined}>
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Sender</p>
              <p className="text-foreground font-medium">{selected.resolved_user_name || selected.name} {selected.resolved_user_id && <span className="text-muted-foreground font-mono text-xs">#{selected.resolved_user_id}</span>}</p>
              <p className="text-muted-foreground text-xs">{selected.resolved_user_email || selected.email}</p>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Subject</span>
              <span className="text-foreground">{selected.subject || '-'}</span>
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
              <span className="text-muted-foreground block mb-1.5">Message</span>
              <div className="bg-muted/50 rounded-lg p-3 text-foreground whitespace-pre-wrap">{selected.message}</div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
