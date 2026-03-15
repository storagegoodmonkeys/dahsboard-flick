'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { supabase } from '@/lib/supabase';
import { formatNumber, formatDate, timeAgo } from '@/lib/utils';
import {
  Users,
  UserPlus,
  UserX,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
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

const PAGE_SIZE = 20;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Stats
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [suspendedUsers, setSuspendedUsers] = useState(0);
  const [admins, setAdmins] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
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

    const { data, count } = await query;
    setUsers((data as User[]) || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [page, statusFilter, searchQuery]);

  const fetchStats = async () => {
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
  };

  const fetchUserDetail = async (user: User) => {
    setDetailLoading(true);
    const [lighters, posts, friends, fullUser] = await Promise.all([
      supabase.from('lighter_ownership').select('*', { count: 'exact', head: true }).eq('user_id', user.user_id).eq('is_current_owner', true),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.user_id).is('deleted_at', null),
      supabase.from('friendships').select('*', { count: 'exact', head: true }).or(`user_id.eq.${user.user_id},friend_id.eq.${user.user_id}`).eq('status', 'accepted'),
      supabase.from('users').select('bio, date_of_birth').eq('user_id', user.user_id).single(),
    ]);

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

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const columns = [
    {
      key: 'full_name',
      label: 'User',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            {user.profile_picture_url ? (
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
      render: (user: User) => (
        <span className="text-muted-foreground">{user.email}</span>
      ),
    },
    {
      key: 'user_status',
      label: 'Status',
      render: (user: User) => <StatusBadge status={user.user_status} />,
    },
    {
      key: 'user_level',
      label: 'Role',
      render: (user: User) => (
        <span className="text-xs text-muted-foreground capitalize">{user.user_level}</span>
      ),
    },
    {
      key: 'total_points',
      label: 'Points',
      render: (user: User) => (
        <span className="text-accent font-medium">{formatNumber(user.total_points)}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (user: User) => (
        <span className="text-muted-foreground text-xs">{formatDate(user.created_at)}</span>
      ),
    },
    {
      key: 'last_login_at',
      label: 'Last Active',
      render: (user: User) => (
        <span className="text-muted-foreground text-xs">
          {user.last_login_at ? timeAgo(user.last_login_at) : 'Never'}
        </span>
      ),
    },
  ];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, username, or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage="No users found"
          onRowClick={(item) => fetchUserDetail(item as unknown as User)}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg bg-card border border-border text-foreground disabled:opacity-30 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground px-3">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg bg-card border border-border text-foreground disabled:opacity-30 hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
                    {selectedUser.profile_picture_url ? (
                      <img src={selectedUser.profile_picture_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-accent">
                        {(selectedUser.full_name || selectedUser.username || '?')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{selectedUser.full_name || 'No name'}</h2>
                    <p className="text-sm text-muted-foreground">@{selectedUser.username || 'unknown'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {detailLoading ? (
                <div className="py-8 text-center">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-accent">{selectedUser.lightersOwned}</p>
                      <p className="text-xs text-muted-foreground">Lighters</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-info">{selectedUser.postsCount}</p>
                      <p className="text-xs text-muted-foreground">Posts</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-success">{selectedUser.friendsCount}</p>
                      <p className="text-xs text-muted-foreground">Friends</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Email</span>
                      <span className="text-foreground">{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Status</span>
                      <StatusBadge status={selectedUser.user_status} />
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
                      <span className="text-foreground">{formatDate(selectedUser.created_at)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Last Login</span>
                      <span className="text-foreground">
                        {selectedUser.last_login_at ? timeAgo(selectedUser.last_login_at) : 'Never'}
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
