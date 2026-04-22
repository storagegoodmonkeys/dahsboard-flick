'use client';

import { useEffect, useState } from 'react';
import { Modal } from './modal';
import { supabase } from '@/lib/supabase';
import { formatFullTimestamp } from '@/lib/utils';
import { MapPin, User, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'ownership' | 'lost' | 'found' | 'location';
  date: string;
  title: string;
  detail: string;
  icon: 'user' | 'lost' | 'found' | 'location';
}

const iconMap = {
  user: User,
  lost: AlertTriangle,
  found: CheckCircle2,
  location: MapPin,
};

const iconColorMap = {
  user: 'bg-accent/10 text-accent',
  lost: 'bg-destructive/10 text-destructive',
  found: 'bg-success/10 text-success',
  location: 'bg-info/10 text-info',
};

interface Props {
  open: boolean;
  onClose: () => void;
  lighterId: number;
  lighterName: string;
}

export function LighterHistoryModal({ open, onClose, lighterId, lighterName }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !lighterId) return;
    const fetchHistory = async () => {
      setLoading(true);
      const [ownership, locations, lost, found] = await Promise.all([
        supabase.from('lighter_ownership').select('ownership_id, user_id, acquisition_type, acquisition_date, acquisition_location_name').eq('lighter_id', lighterId),
        supabase.from('lighter_location_history').select('history_id, location_name, recorded_at').eq('lighter_id', lighterId),
        supabase.from('lost_reports').select('lost_id, user_id, last_known_location_name, created_at, is_active').eq('lighter_id', lighterId),
        supabase.from('found_reports').select('found_id, finder_user_id, found_location_name, created_at, resolution_status').eq('lighter_id', lighterId),
      ]);

      // Collect all user IDs and batch-fetch names
      const userIds = new Set<number>();
      (ownership.data || []).forEach((o: { user_id: number }) => userIds.add(o.user_id));
      (lost.data || []).forEach((r: { user_id: number }) => userIds.add(r.user_id));
      (found.data || []).forEach((r: { finder_user_id: number }) => userIds.add(r.finder_user_id));

      let userMap = new Map<number, string>();
      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('user_id, full_name, username')
          .in('user_id', [...userIds]);
        userMap = new Map((users || []).map((u: { user_id: number; full_name: string; username: string }) => [
          u.user_id,
          u.full_name || u.username || `User #${u.user_id}`,
        ]));
      }

      const getName = (id: number) => userMap.get(id) || `User #${id}`;

      const timeline: TimelineEvent[] = [];

      (ownership.data || []).forEach((o: { ownership_id: number; user_id: number; acquisition_type: string; acquisition_date: string; acquisition_location_name: string }) => {
        timeline.push({
          id: `own-${o.ownership_id}`,
          type: 'ownership',
          date: o.acquisition_date,
          title: `Acquired by ${getName(o.user_id)}`,
          detail: `${o.acquisition_type} at ${o.acquisition_location_name || 'Unknown'}`,
          icon: 'user',
        });
      });

      (locations.data || []).forEach((l: { history_id: number; location_name: string; recorded_at: string }) => {
        timeline.push({
          id: `loc-${l.history_id}`,
          type: 'location',
          date: l.recorded_at,
          title: 'Location recorded',
          detail: l.location_name || 'Unknown location',
          icon: 'location',
        });
      });

      (lost.data || []).forEach((r: { lost_id: number; user_id: number; last_known_location_name: string; created_at: string; is_active: boolean }) => {
        timeline.push({
          id: `lost-${r.lost_id}`,
          type: 'lost',
          date: r.created_at,
          title: `Reported lost by ${getName(r.user_id)}`,
          detail: `${r.last_known_location_name || 'Unknown location'}${r.is_active ? ' (Active)' : ' (Resolved)'}`,
          icon: 'lost',
        });
      });

      (found.data || []).forEach((r: { found_id: number; finder_user_id: number; found_location_name: string; created_at: string; resolution_status: string }) => {
        timeline.push({
          id: `found-${r.found_id}`,
          type: 'found',
          date: r.created_at,
          title: `Found by ${getName(r.finder_user_id)}`,
          detail: `${r.found_location_name || 'Unknown location'} - ${r.resolution_status}`,
          icon: 'found',
        });
      });

      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(timeline);
      setLoading(false);
    };
    fetchHistory();
  }, [open, lighterId]);

  return (
    <Modal open={open} onClose={onClose} title={`History: ${lighterName}`} subtitle="Full chronological timeline" className="max-w-lg">
      {loading ? (
        <div className="py-8 text-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No history found
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">
            {events.map((event) => {
              const Icon = iconMap[event.icon];
              return (
                <div key={event.id} className="flex items-start gap-3 relative">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 z-10 ${iconColorMap[event.icon]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 pb-1">
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.detail}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{formatFullTimestamp(event.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
