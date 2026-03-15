'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Flame,
  Search,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/lighters', label: 'Lighters', icon: Flame },
  { href: '/dashboard/lost-found', label: 'Lost & Found', icon: Search },
  { href: '/dashboard/moderation', label: 'Moderation', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-50 ${
        collapsed ? 'w-[72px]' : 'w-[250px]'
      }`}
    >
      {/* Logo - red box tilted with yellow text spilling out */}
      <div className="h-[72px] flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative w-[36px] h-[36px] -rotate-[5deg] shrink-0" style={{ overflow: 'visible' }}>
            <div className="absolute inset-0 rounded-[10px] bg-[#D32F2F] shadow-md shadow-[#D32F2F]/30" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/flick-logo.png"
              alt="Flick!"
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '48px', height: 'auto', objectFit: 'contain', pointerEvents: 'none' }}
            />
          </div>
          {!collapsed && (
            <div className="ml-1">
              <span className="text-base font-bold text-foreground tracking-tight">Flick!</span>
              <span className="text-[10px] text-muted-foreground block -mt-0.5 font-medium">Dashboard</span>
            </div>
          )}
        </div>
      </div>

      {/* Nav label */}
      {!collapsed && (
        <div className="px-5 pt-5 pb-2">
          <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.15em]">
            Menu
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className={`flex-1 px-3 space-y-0.5 ${collapsed ? 'pt-4' : ''}`}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all relative ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-hover'
              }`}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full" />
              )}
              <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'drop-shadow-[0_0_6px_rgba(253,216,53,0.4)]' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-sidebar-border space-y-0.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-hover w-full transition-all"
        >
          {collapsed ? (
            <ChevronRight className="w-[18px] h-[18px] shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-[18px] h-[18px] shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/5 w-full transition-all"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
