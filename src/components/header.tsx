'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ChevronRight } from 'lucide-react';

const pathLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Users',
  lighters: 'Lighters',
  'lost-found': 'Lost & Found',
  moderation: 'Reports',
  'report-problems': 'Report Problems',
  'support-messages': 'Support Messages',
  posts: 'Posts',
  friends: 'Friends',
  points: 'Points',
};

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        const { data } = await supabase
          .from('users')
          .select('full_name')
          .eq('uuid', user.id)
          .single();
        setName(data?.full_name || 'Admin');
      }
    };
    fetchUser();
  }, []);

  // Generate breadcrumbs
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];
  let path = '';
  for (const seg of segments) {
    path += `/${seg}`;
    const label = pathLabels[seg] || (seg.match(/^\d+$/) ? `#${seg}` : seg);
    breadcrumbs.push({ label, href: path });
  }

  return (
    <header className="h-[72px] border-b border-border flex items-center justify-between px-8">
      <div>
        {breadcrumbs.length > 2 && (
          <div className="flex items-center gap-1 mb-0.5">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
                {i < breadcrumbs.length - 1 ? (
                  <Link href={crumb.href} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[11px] text-muted-foreground/60">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-success/5 border border-success/10 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
          <span className="text-[11px] font-medium text-success">Live</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">{name}</p>
            <p className="text-[11px] text-muted-foreground">{email}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-gradient-red to-gradient-orange flex items-center justify-center shadow-lg shadow-gradient-red/20">
            <span className="text-sm font-bold text-white">
              {name ? name[0].toUpperCase() : 'A'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
