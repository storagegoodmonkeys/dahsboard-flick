'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { supabase } from '@/lib/supabase';
import { formatFullTimestamp } from '@/lib/utils';
import { useToast } from '@/components/toast-provider';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface Post {
  post_id: number;
  content: string;
  media_url: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  deleted_at: string | null;
}

const PAGE_SIZE = 20;

export default function UserPostsPage() {
  const params = useParams();
  const userId = Number(params.userId);
  const toast = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data, count } = await supabase
      .from('posts')
      .select('post_id, content, media_url, like_count, comment_count, created_at, deleted_at', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setPosts((data as Post[]) || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [userId, page]);

  useEffect(() => {
    supabase.from('users').select('full_name, username').eq('user_id', userId).single()
      .then(({ data }) => setUserName(data?.full_name || data?.username || `User #${userId}`));
    fetchPosts();
  }, [userId, fetchPosts]);

  const handleSoftDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('post_id', deleteTarget.post_id);
    if (error) {
      toast.error('Delete Failed', error.message);
    } else {
      toast.success('Post made inactive');
      fetchPosts();
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const columns = [
    {
      key: 'post_id',
      label: 'ID',
      render: (p: Post) => <span className="text-muted-foreground font-mono">#{p.post_id}</span>,
    },
    {
      key: 'content',
      label: 'Content',
      render: (p: Post) => (
        <span className="text-foreground text-xs max-w-[300px] truncate block">{p.content || '-'}</span>
      ),
    },
    {
      key: 'media_url',
      label: 'Media',
      render: (p: Post) => p.media_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.media_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
      ) : <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'like_count',
      label: 'Likes',
      render: (p: Post) => <span className="text-foreground">{p.like_count || 0}</span>,
    },
    {
      key: 'comment_count',
      label: 'Comments',
      render: (p: Post) => <span className="text-foreground">{p.comment_count || 0}</span>,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (p: Post) => <span className="text-muted-foreground text-xs">{formatFullTimestamp(p.created_at)}</span>,
    },
  ];

  return (
    <>
      <Header title={`${userName}'s Posts`} subtitle={`${totalCount} posts total`} />
      <div className="p-6 space-y-6">
        <DataTable
          columns={columns}
          data={posts}
          loading={loading}
          emptyMessage="No posts found"
          actions={[
            {
              label: 'Make Inactive',
              icon: 'edit',
              onClick: (item: Post) => setDeleteTarget(item),
            },
          ]}
        />
        <Pagination
          page={page}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleSoftDelete}
        title="Make Post Inactive"
        message="This will soft-delete the post. It can be recovered later."
        confirmLabel="Make Inactive"
        loading={deleting}
      />
    </>
  );
}
