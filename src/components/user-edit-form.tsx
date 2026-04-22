'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/toast-provider';
import { Trash2 } from 'lucide-react';

interface UserEditFormProps {
  user: {
    user_id: number;
    full_name: string;
    username: string;
    email: string;
    gender: string;
    user_status: string;
    user_level: string;
    bio: string;
    profile_picture_url?: string;
  };
  onSave: () => void;
  onClose: () => void;
}

export function UserEditForm({ user, onSave, onClose }: UserEditFormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    username: user.username || '',
    email: user.email || '',
    gender: user.gender || '',
    user_status: user.user_status || 'active',
    user_level: user.user_level || 'user',
    bio: user.bio || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        full_name: form.full_name,
        username: form.username,
        email: form.email,
        gender: form.gender,
        user_status: form.user_status,
        user_level: form.user_level,
        bio: form.bio,
      })
      .eq('user_id', user.user_id);

    if (error) {
      toast.error('Failed to save', error.message);
    } else {
      toast.success('User updated', `${form.full_name} has been updated successfully.`);
      onSave();
    }
    setSaving(false);
  };

  const handleRemovePhoto = async () => {
    setRemovingPhoto(true);
    const { error } = await supabase
      .from('users')
      .update({ profile_picture_url: null })
      .eq('user_id', user.user_id);
    if (error) {
      toast.error('Failed to remove photo', error.message);
    } else {
      toast.success('Profile photo removed');
      setPhotoRemoved(true);
    }
    setRemovingPhoto(false);
  };

  const inputClass = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50';
  const labelClass = 'text-xs font-medium text-muted-foreground mb-1.5 block';

  const showPhoto = user.profile_picture_url && !photoRemoved;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Profile Photo */}
      {showPhoto && (
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.profile_picture_url!}
            alt=""
            className="w-14 h-14 rounded-full object-cover shrink-0"
          />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Profile Photo</p>
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={removingPhoto}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {removingPhoto ? (
                <div className="w-3 h-3 border border-destructive border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              Remove Photo
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Full Name</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Username</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Gender</label>
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className={inputClass}
          >
            <option value="">Not set</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            value={form.user_status}
            onChange={(e) => setForm({ ...form, user_status: e.target.value })}
            className={inputClass}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Role</label>
          <select
            value={form.user_level}
            onChange={(e) => setForm({ ...form, user_level: e.target.value })}
            className={inputClass}
          >
            <option value="user">User</option>
            <option value="subadmin">Sub-admin</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Bio</label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          rows={3}
          className={inputClass}
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg transition-colors flex items-center gap-2"
        >
          {saving && (
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          Save Changes
        </button>
      </div>
    </form>
  );
}
