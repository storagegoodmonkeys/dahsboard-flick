'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
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

  return (
    <header className="h-[72px] border-b border-border flex items-center justify-between px-8">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {/* Live indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-success/5 border border-success/10 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
          <span className="text-[11px] font-medium text-success">Live</span>
        </div>
        {/* User */}
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
