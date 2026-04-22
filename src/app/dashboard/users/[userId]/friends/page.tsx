'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { supabase } from '@/lib/supabase';
import { formatFullTimestamp } from '@/lib/utils';

interface Friendship {
  friendship_id: number;
  friend_user_id: number;
  friend_name: string;
  friend_username: string;
  friend_avatar: string;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function UserFriendsPage() {
  const params = useParams();
  const userId = Number(params.userId);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [userName, setUserName] = useState('');

  const fetchFriends = useCallback(async () => {
    setLoading(true);

    // Get friendships where user is either user_id or friend_id
    const { data: friendships, count } = await supabase
      .from('friendships')
      .select('friendship_id, user_id, friend_id, created_at', { count: 'exact' })
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (!friendships || friendships.length === 0) {
      setFriends([]);
      setTotalCount(count || 0);
      setLoading(false);
      return;
    }

    // Get the friend IDs (the other user in each friendship)
    const friendIds = friendships.map((f: { user_id: number; friend_id: number }) =>
      f.user_id === userId ? f.friend_id : f.user_id
    );

    const { data: users } = await supabase
      .from('users')
      .select('user_id, full_name, username, profile_picture_url')
      .in('user_id', friendIds);

    const userMap = new Map((users || []).map((u: { user_id: number; full_name: string; username: string; profile_picture_url: string }) => [u.user_id, u]));

    const mapped: Friendship[] = friendships.map((f: { friendship_id: number; user_id: number; friend_id: number; created_at: string }) => {
      const fId = f.user_id === userId ? f.friend_id : f.user_id;
      const u = userMap.get(fId) as { full_name: string; username: string; profile_picture_url: string } | undefined;
      return {
        friendship_id: f.friendship_id,
        friend_user_id: fId,
        friend_name: u?.full_name || '',
        friend_username: u?.username || '',
        friend_avatar: u?.profile_picture_url || '',
        created_at: f.created_at,
      };
    });

    setFriends(mapped);
    setTotalCount(count || 0);
    setLoading(false);
  }, [userId, page]);

  useEffect(() => {
    supabase.from('users').select('full_name, username').eq('user_id', userId).single()
      .then(({ data }) => setUserName(data?.full_name || data?.username || `User #${userId}`));
    fetchFriends();
  }, [userId, fetchFriends]);

  const columns = [
    {
      key: 'friend_name',
      label: 'Friend',
      render: (f: Friendship) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            {f.friend_avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.friend_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-accent">
                {(f.friend_name || f.friend_username || '?')[0].toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-foreground font-medium">{f.friend_name || 'No name'}</p>
            <p className="text-xs text-muted-foreground">@{f.friend_username || 'unknown'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'friend_user_id',
      label: 'User ID',
      render: (f: Friendship) => <span className="text-muted-foreground font-mono">#{f.friend_user_id}</span>,
    },
    {
      key: 'created_at',
      label: 'Friends Since',
      render: (f: Friendship) => <span className="text-muted-foreground text-xs">{formatFullTimestamp(f.created_at)}</span>,
    },
  ];

  return (
    <>
      <Header title={`${userName}'s Friends`} subtitle={`${totalCount} friends total`} />
      <div className="p-6 space-y-6">
        <DataTable
          columns={columns}
          data={friends}
          loading={loading}
          emptyMessage="No friends found"
        />
        <Pagination
          page={page}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
