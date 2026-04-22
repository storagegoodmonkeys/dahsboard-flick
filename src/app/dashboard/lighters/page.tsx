'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { LighterEditForm } from '@/components/lighter-edit-form';
import { supabase } from '@/lib/supabase';
import { formatNumber, formatFullTimestamp } from '@/lib/utils';
import { ImageLightbox } from '@/components/image-lightbox';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useToast } from '@/components/toast-provider';
import {
  Flame,
  QrCode,
  MapPin,
  Search,
  Pencil,
  Eye,
  Trash2,
  Image as ImageIcon,
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
  photo_url: string | null;
  created_at: string;
  // Dynamic counts
  _lost_count?: number;
  _found_count?: number;
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
  const searchParams = useSearchParams();
  const [lighters, setLighters] = useState<Lighter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLighter, setSelectedLighter] = useState<Lighter | null>(null);
  const [editing, setEditing] = useState(false);
  const [ownershipHistory, setOwnershipHistory] = useState<Array<{
    ownership_id: number;
    user_id: number;
    acquisition_type: string;
    acquisition_date: string;
    acquisition_location_name: string;
    is_current_owner: boolean;
    user_name?: string;
  }>>([]);

  // Photos
  const [lighterPhotos, setLighterPhotos] = useState<Array<{ id: string; url: string; type: 'main' | 'post'; post_id?: number }>>([]);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<{ id: string; type: 'main' | 'post'; post_id?: number } | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);

  const toast = useToast();

  // Stats
  const [totalLighters, setTotalLighters] = useState(0);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [lostCount, setLostCount] = useState(0);
  const [foundCount, setFoundCount] = useState(0);

  const fetchLighters = useCallback(async () => {
    setLoading(true);
    const userIdFilter = searchParams.get('user_id');
    let query = supabase
      .from('lighters')
      .select('lighter_id, qr_code, nickname, model_name, lighter_status, total_owners_count, total_distance_km, times_lost_count, times_found_count, photo_url, created_at', { count: 'exact' })
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

    // Filter by user_id (from user modal link)
    if (userIdFilter) {
      const { data: ownedLighterIds } = await supabase
        .from('lighter_ownership')
        .select('lighter_id')
        .eq('user_id', Number(userIdFilter))
        .eq('is_current_owner', true);
      const ids = (ownedLighterIds || []).map((o: { lighter_id: number }) => o.lighter_id);
      if (ids.length > 0) {
        query = query.in('lighter_id', ids);
      } else {
        setLighters([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }
    }

    const { data, count } = await query;
    const lightersList = (data as Lighter[]) || [];

    // Compute dynamic lost/found counts from reports tables
    if (lightersList.length > 0) {
      const lighterIds = lightersList.map((l) => l.lighter_id);
      const [lostReports, foundReports] = await Promise.all([
        supabase.from('lost_reports').select('lighter_id').in('lighter_id', lighterIds),
        supabase.from('found_reports').select('lighter_id').in('lighter_id', lighterIds),
      ]);
      const lostMap: Record<number, number> = {};
      const foundMap: Record<number, number> = {};
      (lostReports.data || []).forEach((r: { lighter_id: number }) => {
        lostMap[r.lighter_id] = (lostMap[r.lighter_id] || 0) + 1;
      });
      (foundReports.data || []).forEach((r: { lighter_id: number }) => {
        foundMap[r.lighter_id] = (foundMap[r.lighter_id] || 0) + 1;
      });
      lightersList.forEach((l) => {
        l._lost_count = lostMap[l.lighter_id] || 0;
        l._found_count = foundMap[l.lighter_id] || 0;
      });
    }

    setLighters(lightersList);
    setTotalCount(count || 0);
    setLoading(false);
  }, [page, statusFilter, searchQuery, searchParams]);

  const fetchStats = async () => {
    const [total, registered, lost, found] = await Promise.all([
      supabase.from('lighters').select('*', { count: 'exact', head: true }),
      supabase.from('lighters').select('*', { count: 'exact', head: true }).eq('lighter_status', 1),
      supabase.from('lighters').select('*', { count: 'exact', head: true }).eq('lighter_status', 2),
      supabase.from('lighters').select('*', { count: 'exact', head: true }).eq('lighter_status', 4),
    ]);
    setTotalLighters(total.count || 0);
    setRegisteredCount(registered.count || 0);
    setLostCount(lost.count || 0);
    setFoundCount(found.count || 0);
  };

  const fetchLighterDetail = async (lighter: Lighter) => {
    setSelectedLighter(lighter);
    setEditing(false);
    setLighterPhotos([]);
    const [ownership, linkedPosts] = await Promise.all([
      supabase
        .from('lighter_ownership')
        .select('ownership_id, user_id, acquisition_type, acquisition_date, acquisition_location_name, is_current_owner')
        .eq('lighter_id', lighter.lighter_id)
        .order('acquisition_date', { ascending: false }),
      supabase
        .from('lighter_posts')
        .select('post_id')
        .eq('lighter_id', lighter.lighter_id),
    ]);
    // Enrich ownership with user names
    const ownershipData = ownership.data || [];
    if (ownershipData.length > 0) {
      const userIds = [...new Set(ownershipData.map((o: { user_id: number }) => o.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('user_id, full_name, username').in('user_id', userIds);
        const userMap = new Map((users || []).map((u: { user_id: number; full_name: string; username: string }) => [u.user_id, u.full_name || u.username]));
        ownershipData.forEach((o: { user_id: number; user_name?: string }) => {
          o.user_name = userMap.get(o.user_id) || `User #${o.user_id}`;
        });
      }
    }
    setOwnershipHistory(ownershipData);

    // Build photos array: main photo + post photos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const photos: Array<{ id: string; url: string; type: 'main' | 'post'; post_id?: number }> = [];
    if (lighter.photo_url) {
      photos.push({ id: 'main', url: lighter.photo_url, type: 'main' });
    }

    // Fetch post media for linked posts
    const postIds = (linkedPosts.data || []).map((p: { post_id: number }) => p.post_id);
    if (postIds.length > 0) {
      const { data: posts } = await supabase
        .from('posts')
        .select('post_id, media_url')
        .in('post_id', postIds)
        .not('media_url', 'is', null);
      (posts || []).forEach((p: { post_id: number; media_url: string }) => {
        if (p.media_url) {
          photos.push({ id: `post-${p.post_id}`, url: p.media_url, type: 'post', post_id: p.post_id });
        }
      });
    }
    setLighterPhotos(photos);
  };

  const handleDeletePhoto = async () => {
    if (!deletePhotoTarget || !selectedLighter) return;
    setDeletingPhoto(true);
    let error;
    if (deletePhotoTarget.type === 'main') {
      // Remove main photo_url from lighter
      const res = await supabase.from('lighters').update({ photo_url: null }).eq('lighter_id', selectedLighter.lighter_id);
      error = res.error;
    } else if (deletePhotoTarget.post_id) {
      // Remove media from the post
      const res = await supabase.from('posts').update({ media_url: null }).eq('post_id', deletePhotoTarget.post_id);
      error = res.error;
    }
    if (error) {
      toast.error('Failed to delete photo', error.message);
    } else {
      toast.success('Photo removed');
      setLighterPhotos((prev) => prev.filter((p) => p.id !== deletePhotoTarget.id));
      if (deletePhotoTarget.type === 'main') {
        setSelectedLighter({ ...selectedLighter, photo_url: null });
      }
    }
    setDeletingPhoto(false);
    setDeletePhotoTarget(null);
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchLighters(); }, [fetchLighters]);

  const columns = [
    {
      key: 'nickname',
      label: 'Lighter',
      render: (l: Lighter) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0 overflow-hidden">
            {l.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.photo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <Flame className="w-4 h-4 text-warning" />
            )}
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
      render: (l: Lighter) => <span className="text-muted-foreground">{l.model_name || '-'}</span>,
    },
    {
      key: 'lighter_status',
      label: 'Status',
      render: (l: Lighter) => <StatusBadge status={STATUS_MAP[l.lighter_status] || 'unknown'} />,
    },
    {
      key: 'total_owners_count',
      label: 'Owners',
      render: (l: Lighter) => <span className="text-foreground">{l.total_owners_count}</span>,
    },
    {
      key: 'total_distance_km',
      label: 'Distance',
      render: (l: Lighter) => (
        <span className="text-info">{l.total_distance_km > 0 ? `${l.total_distance_km} km` : '-'}</span>
      ),
    },
    {
      key: 'times_lost_count',
      label: 'Lost/Found',
      render: (l: Lighter) => (
        <span className="text-muted-foreground">
          <span className="text-destructive">{l._lost_count ?? l.times_lost_count}</span>
          {' / '}
          <span className="text-success">{l._found_count ?? l.times_found_count}</span>
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Registered',
      render: (l: Lighter) => <span className="text-muted-foreground text-xs">{formatFullTimestamp(l.created_at)}</span>,
    },
  ];



  return (
    <>
      <Header title="Lighters" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Lighters" value={formatNumber(totalLighters)} icon={Flame} color="warning" />
          <StatCard title="Registered" value={formatNumber(registeredCount)} icon={QrCode} color="success" />
          <StatCard title="Currently Lost" value={formatNumber(lostCount)} icon={MapPin} color="destructive" />
          <StatCard title="Lighters Found" value={formatNumber(foundCount)} icon={Eye} color="info" />
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
          actions={[
            { label: 'View', icon: 'view', onClick: (item: Lighter) => fetchLighterDetail(item) },
          ]}
        />

        {/* Pagination */}
        <Pagination page={page} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {/* Lighter Detail Modal */}
      <Modal
        open={!!selectedLighter}
        onClose={() => { setSelectedLighter(null); setEditing(false); }}
        title={selectedLighter?.nickname || `Lighter #${selectedLighter?.lighter_id}`}
        subtitle={selectedLighter?.qr_code}
        headerRight={selectedLighter && !editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        ) : undefined}
      >
        {selectedLighter && editing ? (
          <LighterEditForm
            lighter={selectedLighter}
            onSave={() => {
              setEditing(false);
              fetchLighterDetail(selectedLighter);
              fetchLighters();
            }}
            onClose={() => setEditing(false)}
          />
        ) : selectedLighter ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-foreground">{selectedLighter.total_owners_count}</p>
                <p className="text-xs text-muted-foreground">Owners</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-info">
                  {selectedLighter.total_distance_km > 0 ? `${selectedLighter.total_distance_km} km` : '-'}
                </p>
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
                <span className="text-destructive">{selectedLighter._lost_count ?? selectedLighter.times_lost_count}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Times Found</span>
                <span className="text-success">{selectedLighter._found_count ?? selectedLighter.times_found_count}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Registered</span>
                <span className="text-foreground">{formatFullTimestamp(selectedLighter.created_at)}</span>
              </div>
            </div>

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
                        {o.user_name || `User #${o.user_id}`} <span className="text-muted-foreground font-mono">#{o.user_id}</span> &middot; <span className="capitalize">{o.acquisition_type}</span>
                        {o.is_current_owner && <span className="text-success ml-2">(Current)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {o.acquisition_location_name || 'Unknown location'} &middot; {formatFullTimestamp(o.acquisition_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Photos */}
            {lighterPhotos.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-foreground mb-3 mt-6 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  Photos ({lighterPhotos.length})
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {lighterPhotos.map((photo, idx) => (
                    <div key={photo.id} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt=""
                        className="w-full aspect-square rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => { setLightboxIndex(idx); setShowLightbox(true); }}
                      />
                      {photo.type === 'main' && (
                        <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-accent/80 text-accent-foreground px-1.5 py-0.5 rounded">Main</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeletePhotoTarget(photo); }}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-destructive rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : null}
      </Modal>

      {/* Photo Lightbox */}
      <ImageLightbox
        open={showLightbox}
        onClose={() => setShowLightbox(false)}
        src={lighterPhotos[lightboxIndex]?.url || ''}
        images={lighterPhotos.map((p) => p.url)}
        currentIndex={lightboxIndex}
        onNavigate={setLightboxIndex}
      />

      {/* Delete Photo Confirmation */}
      <ConfirmDialog
        open={!!deletePhotoTarget}
        onClose={() => setDeletePhotoTarget(null)}
        onConfirm={handleDeletePhoto}
        title="Delete Photo"
        message="Are you sure you want to delete this photo? This action cannot be undone."
        confirmLabel="Delete"
        loading={deletingPhoto}
      />
    </>
  );
}
