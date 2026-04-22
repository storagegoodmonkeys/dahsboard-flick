'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { ImageLightbox } from '@/components/image-lightbox';
import { UserEditForm } from '@/components/user-edit-form';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { supabase } from '@/lib/supabase';
import { formatNumber, formatDate, formatFullTimestamp, timeAgo } from '@/lib/utils';
import { useToast } from '@/components/toast-provider';
import {
  Users,
  UserPlus,
  UserX,
  Shield,
  Search,
  Flame,
  FileText,
  Heart,
  Star,
  Plus,
  Pencil,
  Trash2,
  Ban,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react';

interface User {
  user_id: number;
  uuid: string;
  full_name: string;
  username: string;
  email: string;
  gender: string;
  profile_picture_url: string;
  user_level: string;
  user_status: string;
  total_points: number;
  last_login_at: string;
  email_verified_at: string;
  created_at: string;
}

interface UserDetail extends User {
  bio: string;
  date_of_birth: string;
  lightersOwned: number;
  postsCount: number;
  friendsCount: number;
}

interface UserReport {
  report_id: number;
  reporter_id: number;
  reported_id: number;
  reason: string;
  created_at: string;
  reporter_name?: string;
  reported_name?: string;
}

interface UserBlock {
  block_id: number;
  blocker_id: number;
  blocked_id: number;
  reason: string;
  created_at: string;
  blocker_name?: string;
  blocked_name?: string;
}

const PAGE_SIZE = 20;

function getDatePresetRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const today = fmt(now);

  switch (preset) {
    case 'today': {
      return { from: today, to: today };
    }
    case 'last_week': {
      const start = new Date(now); start.setDate(start.getDate() - 7);
      return { from: fmt(start), to: today };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(start), to: today };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(start), to: fmt(end) };
    }
    case 'last_year': {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return { from: fmt(start), to: fmt(end) };
    }
    default:
      return { from: '', to: '' };
  }
}

function isValidLoginDate(date: string | null): boolean {
  if (!date) return false;
  const d = new Date(date);
  return !isNaN(d.getTime()) && d.getFullYear() > 2020;
}

export default function UsersPage() {
  const searchParams = useSearchParams();
  const toast = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [userBlocks, setUserBlocks] = useState<UserBlock[]>([]);
  const [authSignInMap, setAuthSignInMap] = useState<Record<string, string | null>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePreset, setDatePreset] = useState('');

  // New user form
  const [newUser, setNewUser] = useState({ first_name: '', last_name: '', email: '', password: '', username: '', user_level: 'user' });
  const [creating, setCreating] = useState(false);

  // Stats
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [suspendedUsers, setSuspendedUsers] = useState(0);
  const [admins, setAdmins] = useState(0);

  const handleStatusChange = async (userId: number, newStatus: string) => {
    const { error } = await supabase
      .from('users')
      .update({ user_status: newStatus })
      .eq('user_id', userId);
    if (error) {
      toast.error('Status Update Failed', error.message);
    } else {
      toast.success(`User status changed to ${newStatus}`);
      if (selectedUser && selectedUser.user_id === userId) {
        setSelectedUser({ ...selectedUser, user_status: newStatus });
      }
      fetchUsers();
      fetchStats();
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const filter = searchParams.get('filter');
    let query = supabase
      .from('users')
      .select('user_id, uuid, full_name, username, email, gender, profile_picture_url, user_level, user_status, total_points, last_login_at, email_verified_at, created_at', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== 'all') {
      query = query.eq('user_status', statusFilter);
    }
    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }
    // Date filters: URL params take priority, then manual date range
    if (filter === 'today') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      query = query.gte('created_at', today.toISOString());
    } else if (filter === 'week') {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('created_at', weekAgo.toISOString());
    } else {
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }
    }

    const { data, count } = await query;
    setUsers((data as User[]) || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [page, statusFilter, searchQuery, searchParams, dateFrom, dateTo]);

  const fetchStats = useCallback(async () => {
    const [total, active, suspended, admin] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('user_status', 'active').is('deleted_at', null),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('user_status', 'suspended').is('deleted_at', null),
      supabase.from('users').select('*', { count: 'exact', head: true }).in('user_level', ['admin', 'subadmin']).is('deleted_at', null),
    ]);
    setTotalUsers(total.count || 0);
    setActiveUsers(active.count || 0);
    setSuspendedUsers(suspended.count || 0);
    setAdmins(admin.count || 0);
  }, []);

  const fetchUserDetail = async (user: User) => {
    setDetailLoading(true);
    setEditing(false);
    const [lighters, posts, friends, fullUser, reportsBy, reportsAgainst, blocksBy, blocksOf] = await Promise.all([
      supabase.from('lighter_ownership').select('*', { count: 'exact', head: true }).eq('user_id', user.user_id).eq('is_current_owner', true),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.user_id).is('deleted_at', null),
      supabase.from('friendships').select('*', { count: 'exact', head: true }).or(`user_id.eq.${user.user_id},friend_id.eq.${user.user_id}`).eq('status', 'accepted'),
      supabase.from('users').select('bio, date_of_birth').eq('user_id', user.user_id).single(),
      supabase.from('reports').select('report_id, reporter_id, reported_id, reason, created_at').eq('reporter_id', user.user_id).order('created_at', { ascending: false }).limit(5),
      supabase.from('reports').select('report_id, reporter_id, reported_id, reason, created_at').eq('reported_id', user.user_id).order('created_at', { ascending: false }).limit(5),
      supabase.from('blocks').select('block_id, blocker_id, blocked_id, reason, created_at').eq('blocker_id', user.user_id).order('created_at', { ascending: false }).limit(5),
      supabase.from('blocks').select('block_id, blocker_id, blocked_id, reason, created_at').eq('blocked_id', user.user_id).order('created_at', { ascending: false }).limit(5),
    ]);

    // Merge reports and blocks
    const allReports = [
      ...((reportsBy.data || []) as UserReport[]).map(r => ({ ...r, reporter_name: 'This user' })),
      ...((reportsAgainst.data || []) as UserReport[]).map(r => ({ ...r, reported_name: 'This user' })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

    const allBlocks = [
      ...((blocksBy.data || []) as UserBlock[]).map(b => ({ ...b, blocker_name: 'This user' })),
      ...((blocksOf.data || []) as UserBlock[]).map(b => ({ ...b, blocked_name: 'This user' })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

    // Enrich "other user" names in reports & blocks
    const otherUserIds = new Set<number>();
    allReports.forEach((r) => {
      if (r.reporter_name === 'This user') otherUserIds.add(r.reported_id);
      else otherUserIds.add(r.reporter_id);
    });
    allBlocks.forEach((b) => {
      if (b.blocker_name === 'This user') otherUserIds.add(b.blocked_id);
      else otherUserIds.add(b.blocker_id);
    });
    const otherIds = [...otherUserIds].filter(Boolean);
    let otherUserMap = new Map<number, string>();
    if (otherIds.length > 0) {
      const { data: otherUsers } = await supabase.from('users').select('user_id, full_name, username').in('user_id', otherIds);
      otherUserMap = new Map((otherUsers || []).map((u: { user_id: number; full_name: string; username: string }) => [u.user_id, u.full_name || u.username || `User #${u.user_id}`]));
    }
    allReports.forEach((r) => {
      if (r.reporter_name === 'This user') r.reported_name = otherUserMap.get(r.reported_id) || `User #${r.reported_id}`;
      else r.reporter_name = otherUserMap.get(r.reporter_id) || `User #${r.reporter_id}`;
    });
    allBlocks.forEach((b) => {
      if (b.blocker_name === 'This user') b.blocked_name = otherUserMap.get(b.blocked_id) || `User #${b.blocked_id}`;
      else b.blocker_name = otherUserMap.get(b.blocker_id) || `User #${b.blocker_id}`;
    });

    setUserReports(allReports);
    setUserBlocks(allBlocks);

    setSelectedUser({
      ...user,
      bio: fullUser.data?.bio || '',
      date_of_birth: fullUser.data?.date_of_birth || '',
      lightersOwned: lighters.count || 0,
      postsCount: posts.count || 0,
      friendsCount: friends.count || 0,
    });
    setDetailLoading(false);
  };

  const handleCreateUser = async () => {
    if (!newUser.first_name || !newUser.email || !newUser.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    setCreating(true);
    try {
      const payload = {
        full_name: `${newUser.first_name} ${newUser.last_name}`.trim(),
        email: newUser.email,
        password: newUser.password,
        username: newUser.username,
        user_level: newUser.user_level,
      };
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) {
        toast.error('Create Failed', data.error);
      } else {
        toast.success('User created successfully');
        setShowNewUser(false);
        setNewUser({ first_name: '', last_name: '', email: '', password: '', username: '', user_level: 'user' });
        fetchUsers();
        fetchStats();
      }
    } catch {
      toast.error('Failed to create user');
    }
    setCreating(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: deleteTarget.user_id, uuid: deleteTarget.uuid }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error('Delete Failed', data.error);
      } else {
        toast.success('User deleted');
        setSelectedUser(null);
        fetchUsers();
        fetchStats();
      }
    } catch {
      toast.error('Failed to delete user');
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const fetchAuthInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth-info');
      const data = await res.json();
      if (!data.error) setAuthSignInMap(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchAuthInfo(); }, [fetchAuthInfo]);

  const columns = [
    {
      key: 'user_id',
      label: 'ID',
      render: (user: User) => <span className="text-muted-foreground font-mono">#{user.user_id}</span>,
    },
    {
      key: 'full_name',
      label: 'User',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            {user.profile_picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.profile_picture_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-accent">
                {(user.full_name || user.username || '?')[0].toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-foreground font-medium">{user.full_name || 'No name'}</p>
            <p className="text-xs text-muted-foreground">@{user.username || 'unknown'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (user: User) => <span className="text-muted-foreground">{user.email}</span>,
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (user: User) => <span className="text-muted-foreground text-xs capitalize">{user.gender || '-'}</span>,
    },
    {
      key: 'user_status',
      label: 'Status',
      render: (user: User) => <StatusBadge status={user.user_status} />,
    },
    {
      key: 'user_level',
      label: 'Role',
      render: (user: User) => <span className="text-xs text-muted-foreground capitalize">{user.user_level}</span>,
    },
    {
      key: 'total_points',
      label: 'Points',
      render: (user: User) => <span className="text-accent font-medium">{formatNumber(user.total_points)}</span>,
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (user: User) => <span className="text-muted-foreground text-xs">{formatDate(user.created_at)}</span>,
    },
    {
      key: 'last_login_at',
      label: 'Last Active',
      render: (user: User) => {
        const authDate = authSignInMap[user.uuid];
        const loginDate = isValidLoginDate(user.last_login_at) ? user.last_login_at : authDate;
        return (
          <span className="text-muted-foreground text-xs">
            {isValidLoginDate(loginDate) ? timeAgo(loginDate!) : '-'}
          </span>
        );
      },
    },
  ];


  const inputClass = 'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50';

  return (
    <>
      <Header title="Users" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={formatNumber(totalUsers)} icon={Users} color="accent" />
          <StatCard title="Active Users" value={formatNumber(activeUsers)} icon={UserPlus} color="success" />
          <StatCard title="Suspended" value={formatNumber(suspendedUsers)} icon={UserX} color="warning" />
          <StatCard title="Admin Users" value={formatNumber(admins)} icon={Shield} color="info" />
        </div>

        {/* Filters + New User */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, username, or email..."
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
          <button
            onClick={() => setShowNewUser(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New User
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <select
            value={datePreset}
            onChange={(e) => {
              const val = e.target.value;
              setDatePreset(val);
              if (val) {
                const range = getDatePresetRange(val);
                setDateFrom(range.from);
                setDateTo(range.to);
              } else {
                setDateFrom('');
                setDateTo('');
              }
              setPage(0);
            }}
            className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="last_week">Last Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_year">Last Year</option>
          </select>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setDatePreset(''); setPage(0); }}
              className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setDatePreset(''); setPage(0); }}
              className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setDatePreset(''); setPage(0); }}
                className="px-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Date range summary */}
        {(dateFrom || dateTo) && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-accent/5 border border-accent/10 rounded-lg">
            <CalendarDays className="w-4 h-4 text-accent" />
            <span className="text-sm text-foreground font-medium">
              {totalCount} user{totalCount !== 1 ? 's' : ''} found
            </span>
            <span className="text-xs text-muted-foreground">
              {dateFrom && dateTo ? `from ${dateFrom} to ${dateTo}` : dateFrom ? `from ${dateFrom}` : `until ${dateTo}`}
            </span>
          </div>
        )}

        {/* Table */}
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage="No users found"
          onRowClick={(item) => fetchUserDetail(item as unknown as User)}
          actions={[
            { label: 'Edit', icon: <Pencil className="w-3.5 h-3.5" />, onClick: (item: User) => fetchUserDetail(item) },
          ]}
        />

        {/* Pagination */}
        <Pagination page={page} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {/* User Detail Modal */}
      <Modal
        open={!!selectedUser}
        onClose={() => { setSelectedUser(null); setEditing(false); }}
        title={selectedUser?.full_name || 'User Details'}
        subtitle={selectedUser ? `@${selectedUser.username || 'unknown'}` : ''}
        headerRight={selectedUser && !editing ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => selectedUser && setDeleteTarget(selectedUser)}
              className="p-1.5 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              title="Delete user"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : undefined}
      >
        {detailLoading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : selectedUser && editing ? (
          <UserEditForm
            user={selectedUser}
            onSave={() => {
              setEditing(false);
              fetchUserDetail(selectedUser);
              fetchUsers();
            }}
            onClose={() => setEditing(false)}
          />
        ) : selectedUser ? (
          <div className="space-y-4">
            {/* Profile Photo */}
            <div className="flex justify-center mb-4">
              <div
                className={`w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center ${selectedUser.profile_picture_url ? 'cursor-pointer' : ''}`}
                onClick={() => selectedUser.profile_picture_url && setShowLightbox(true)}
              >
                {selectedUser.profile_picture_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedUser.profile_picture_url} alt="" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-accent">
                    {(selectedUser.full_name || selectedUser.username || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Clickable Stat Boxes */}
            <div className="grid grid-cols-4 gap-3">
              <Link href={`/dashboard/lighters?user_id=${selectedUser.user_id}`} className="bg-muted rounded-lg p-3 text-center hover:bg-card-hover transition-colors">
                <Flame className="w-4 h-4 text-accent mx-auto mb-1" />
                <p className="text-lg font-bold text-accent">{selectedUser.lightersOwned}</p>
                <p className="text-xs text-muted-foreground">Lighters</p>
              </Link>
              <Link href={`/dashboard/users/${selectedUser.user_id}/posts`} className="bg-muted rounded-lg p-3 text-center hover:bg-card-hover transition-colors">
                <FileText className="w-4 h-4 text-info mx-auto mb-1" />
                <p className="text-lg font-bold text-info">{selectedUser.postsCount}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </Link>
              <Link href={`/dashboard/users/${selectedUser.user_id}/friends`} className="bg-muted rounded-lg p-3 text-center hover:bg-card-hover transition-colors">
                <Heart className="w-4 h-4 text-success mx-auto mb-1" />
                <p className="text-lg font-bold text-success">{selectedUser.friendsCount}</p>
                <p className="text-xs text-muted-foreground">Friends</p>
              </Link>
              <Link href={`/dashboard/users/${selectedUser.user_id}/points`} className="bg-muted rounded-lg p-3 text-center hover:bg-card-hover transition-colors">
                <Star className="w-4 h-4 text-warning mx-auto mb-1" />
                <p className="text-lg font-bold text-warning">{formatNumber(selectedUser.total_points)}</p>
                <p className="text-xs text-muted-foreground">Points</p>
              </Link>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Status</span>
                <select
                  value={selectedUser.user_status}
                  onChange={(e) => handleStatusChange(selectedUser.user_id, e.target.value)}
                  className="px-2 py-1 bg-input border border-input-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Role</span>
                <span className="text-foreground capitalize">{selectedUser.user_level}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Points</span>
                <span className="text-accent font-medium">{formatNumber(selectedUser.total_points)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Gender</span>
                <span className="text-foreground capitalize">{selectedUser.gender || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Joined</span>
                <span className="text-foreground">{formatFullTimestamp(selectedUser.created_at)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Last Login</span>
                <span className="text-foreground">
                  {(() => {
                    const authDate = authSignInMap[selectedUser.uuid];
                    const loginDate = isValidLoginDate(selectedUser.last_login_at) ? selectedUser.last_login_at : authDate;
                    return isValidLoginDate(loginDate) ? timeAgo(loginDate!) : '-';
                  })()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Email Verified</span>
                <span className="text-foreground">
                  {selectedUser.email_verified_at ? formatDate(selectedUser.email_verified_at) : 'No'}
                </span>
              </div>
              {selectedUser.bio && (
                <div className="py-2">
                  <span className="text-muted-foreground block mb-1">Bio</span>
                  <span className="text-foreground">{selectedUser.bio}</span>
                </div>
              )}
            </div>

            {/* Reports & Blocks */}
            {(userReports.length > 0 || userBlocks.length > 0) && (
              <div className="space-y-3 pt-2">
                <div className="border-t border-border/50 pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reports & Blocks</h4>
                </div>
                {userReports.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                      <span className="text-xs font-medium text-foreground">Reports ({userReports.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {userReports.map((r) => (
                        <div key={r.report_id} className="flex items-center justify-between py-1.5 px-2.5 bg-muted/50 rounded-lg text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {r.reporter_name === 'This user' ? (
                                <><span className="text-warning">Filed</span> against {r.reported_name || `User #${r.reported_id}`}</>
                              ) : (
                                <><span className="text-destructive">Received</span> from {r.reporter_name}</>
                              )}
                            </span>
                          </div>
                          <span className="text-muted-foreground/60">{formatDate(r.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {userBlocks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Ban className="w-3.5 h-3.5 text-destructive" />
                      <span className="text-xs font-medium text-foreground">Blocks ({userBlocks.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {userBlocks.map((b) => (
                        <div key={b.block_id} className="flex items-center justify-between py-1.5 px-2.5 bg-muted/50 rounded-lg text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {b.blocker_name === 'This user' ? (
                                <><span className="text-warning">Blocked</span> {b.blocked_name || `User #${b.blocked_id}`}</>
                              ) : (
                                <><span className="text-destructive">Blocked by</span> {b.blocker_name}</>
                              )}
                            </span>
                          </div>
                          <span className="text-muted-foreground/60">{formatDate(b.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Image Lightbox */}
      <ImageLightbox
        src={selectedUser?.profile_picture_url || ''}
        open={showLightbox}
        onClose={() => setShowLightbox(false)}
      />

      {/* New User Modal */}
      <Modal open={showNewUser} onClose={() => setShowNewUser(false)} title="Create New User" subtitle="Add a new user to the platform">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">First Name *</label>
              <input type="text" value={newUser.first_name} onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })} className={inputClass} placeholder="John" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Last Name</label>
              <input type="text" value={newUser.last_name} onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })} className={inputClass} placeholder="Doe" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Email *</label>
            <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className={inputClass} placeholder="john@example.com" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Password *</label>
            <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className={inputClass} placeholder="Min. 6 characters" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Username</label>
              <input type="text" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className={inputClass} placeholder="johndoe" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Role</label>
              <select value={newUser.user_level} onChange={(e) => setNewUser({ ...newUser, user_level: e.target.value })} className={inputClass}>
                <option value="user">User</option>
                <option value="subadmin">Sub-admin</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-end pt-2">
            <button onClick={() => setShowNewUser(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg transition-colors">Cancel</button>
            <button onClick={handleCreateUser} disabled={creating} className="px-4 py-2 text-sm font-medium text-accent-foreground bg-accent hover:bg-accent/90 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
              {creating && <div className="w-3.5 h-3.5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />}
              Create User
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteTarget?.full_name || 'this user'}? This will soft-delete the account and ban the user.`}
        confirmLabel="Delete User"
        loading={deleting}
      />
    </>
  );
}
