'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/toast-provider';
import { Trash2, Image as ImageIcon } from 'lucide-react';

interface LighterEditFormProps {
  lighter: {
    lighter_id: number;
    nickname: string;
    model_name: string;
    lighter_status: number;
    photo_url?: string | null;
  };
  onSave: () => void;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: 0, label: 'Unregistered' },
  { value: 1, label: 'Registered' },
  { value: 2, label: 'Lost' },
  { value: 3, label: 'Discarded' },
  { value: 4, label: 'Found' },
];

export function LighterEditForm({ lighter, onSave, onClose }: LighterEditFormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nickname: lighter.nickname || '',
    model_name: lighter.model_name || '',
    lighter_status: lighter.lighter_status,
  });
  const [mainPhotoUrl, setMainPhotoUrl] = useState(lighter.photo_url || '');
  const [postPhotos, setPostPhotos] = useState<Array<{ post_id: number; media_url: string }>>([]);
  const [removingMain, setRemovingMain] = useState(false);
  const [removingPostId, setRemovingPostId] = useState<number | null>(null);

  useEffect(() => {
    // Fetch post photos linked to this lighter
    supabase
      .from('lighter_posts')
      .select('post_id')
      .eq('lighter_id', lighter.lighter_id)
      .then(async ({ data }) => {
        const postIds = (data || []).map((p: { post_id: number }) => p.post_id);
        if (postIds.length > 0) {
          const { data: posts } = await supabase
            .from('posts')
            .select('post_id, media_url')
            .in('post_id', postIds)
            .not('media_url', 'is', null);
          setPostPhotos((posts || []).filter((p: { media_url: string }) => p.media_url) as Array<{ post_id: number; media_url: string }>);
        }
      });
  }, [lighter.lighter_id]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('lighters')
      .update({
        nickname: form.nickname,
        model_name: form.model_name,
        lighter_status: form.lighter_status,
      })
      .eq('lighter_id', lighter.lighter_id);

    if (error) {
      toast.error('Update Failed', error.message);
    } else {
      toast.success('Lighter updated successfully');
      onSave();
    }
    setSaving(false);
  };

  const handleRemoveMainPhoto = async () => {
    setRemovingMain(true);
    const { error } = await supabase
      .from('lighters')
      .update({ photo_url: null })
      .eq('lighter_id', lighter.lighter_id);
    if (error) {
      toast.error('Failed to remove photo', error.message);
    } else {
      setMainPhotoUrl('');
      toast.success('Main photo removed');
    }
    setRemovingMain(false);
  };

  const handleRemovePostPhoto = async (postId: number) => {
    setRemovingPostId(postId);
    const { error } = await supabase
      .from('posts')
      .update({ media_url: null })
      .eq('post_id', postId);
    if (error) {
      toast.error('Failed to remove photo', error.message);
    } else {
      setPostPhotos((prev) => prev.filter((p) => p.post_id !== postId));
      toast.success('Post photo removed');
    }
    setRemovingPostId(null);
  };

  const inputClass = 'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50';
  const labelClass = 'text-xs text-muted-foreground font-medium mb-1.5 block';

  const allPhotos = [
    ...(mainPhotoUrl ? [{ url: mainPhotoUrl, type: 'main' as const }] : []),
    ...postPhotos.map((p) => ({ url: p.media_url, type: 'post' as const, post_id: p.post_id })),
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Nickname</label>
        <input
          type="text"
          value={form.nickname}
          onChange={(e) => setForm({ ...form, nickname: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Model Name</label>
        <input
          type="text"
          value={form.model_name}
          onChange={(e) => setForm({ ...form, model_name: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Status</label>
        <select
          value={form.lighter_status}
          onChange={(e) => setForm({ ...form, lighter_status: Number(e.target.value) })}
          className={inputClass}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Photo Management */}
      {allPhotos.length > 0 && (
        <div>
          <label className={labelClass}>
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Photos ({allPhotos.length})
            </span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {allPhotos.map((photo, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt=""
                  className="w-full aspect-square rounded-lg object-cover"
                />
                {photo.type === 'main' && (
                  <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-accent/80 text-accent-foreground px-1.5 py-0.5 rounded">Main</span>
                )}
                <button
                  onClick={() => photo.type === 'main' ? handleRemoveMainPhoto() : handleRemovePostPhoto(photo.post_id!)}
                  disabled={removingMain || removingPostId !== null}
                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-destructive rounded-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  {(photo.type === 'main' && removingMain) || (photo.type === 'post' && removingPostId === photo.post_id) ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 text-white" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 justify-end pt-2">
        <button
          onClick={onClose}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-accent-foreground bg-accent hover:bg-accent/90 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <div className="w-3.5 h-3.5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}
