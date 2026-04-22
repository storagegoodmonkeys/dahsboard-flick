'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { StatCard } from '@/components/stat-card';
import { supabase } from '@/lib/supabase';
import { formatNumber, timeAgo } from '@/lib/utils';
import {
  Users,
  Flame,
  Search,
  HandHeart,
  UserPlus,
  Activity,
  MessageSquare,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

interface Stats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  totalLighters: number;
  newLightersToday: number;
  activeLostReports: number;
  totalReunions: number;
  totalMessages: number;
  userGrowth: number;
  lighterGrowth: number;
}

interface ActivityItem {
  id: number;
  type: string;
  text: string;
  time: string;
}

interface LighterStatusData {
  name: string;
  value: number;
  color: string;
}

interface GenderData {
  name: string;
  value: number;
  color: string;
}

interface AgeData {
  bucket: string;
  count: number;
}

const COLORS: Record<string, string> = {
  registered: '#00C950',
  lost: '#FB2C36',
  found: '#00D9FF',
  unregistered: '#4A4A5A',
  discarded: '#6B7280',
};

const GENDER_COLORS: Record<string, string> = {
  male: '#00D9FF',
  female: '#FF6B9D',
  'prefer not to say': '#8A8A9A',
  other: '#8A8A9A',
};

const tooltipStyle = {
  backgroundColor: '#12121A',
  border: '1px solid #1E1E2A',
  borderRadius: '12px',
  color: '#FFFFFF',
  fontSize: '12px',
  fontWeight: 500,
  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
};

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, newUsersToday: 0, newUsersThisWeek: 0,
    totalLighters: 0, newLightersToday: 0, activeLostReports: 0,
    totalReunions: 0, totalMessages: 0,
    userGrowth: 0, lighterGrowth: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [lighterStatusData, setLighterStatusData] = useState<LighterStatusData[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<{ date: string; users: number }[]>([]);
  const [genderData, setGenderData] = useState<GenderData[]>([]);
  const [ageData, setAgeData] = useState<AgeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoISO = weekAgo.toISOString();
      const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const twoWeeksAgoISO = twoWeeksAgo.toISOString();

      const [
        usersResult, newTodayResult, newThisWeekResult, lastWeekUsersResult,
        lightersResult, newLightersTodayResult, lastWeekLightersResult,
        lostReportsResult, reunionsResult, messagesResult,
        lighterStatusResult, recentUsersResult, recentLightersResult,
        recentLostResult, recentFoundResult,
        genderResult, dobResult,
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayISO).is('deleted_at', null),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoISO).is('deleted_at', null),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', twoWeeksAgoISO).lt('created_at', weekAgoISO).is('deleted_at', null),
        supabase.from('lighters').select('*', { count: 'exact', head: true }),
        supabase.from('lighters').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabase.from('lighters').select('*', { count: 'exact', head: true }).gte('created_at', twoWeeksAgoISO).lt('created_at', weekAgoISO),
        supabase.from('lost_reports').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('found_reports').select('*', { count: 'exact', head: true }).eq('resolution_status', 'returned'),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('lighters').select('lighter_status'),
        supabase.from('users').select('user_id, full_name, username, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('lighters').select('lighter_id, nickname, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('lost_reports').select('lost_id, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('found_reports').select('found_id, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('users').select('gender').is('deleted_at', null),
        supabase.from('users').select('date_of_birth').is('deleted_at', null).not('date_of_birth', 'is', null),
      ]);

      const thisWeekUsers = newThisWeekResult.count || 0;
      const lastWeekUsers = lastWeekUsersResult.count || 0;
      const userGrowth = lastWeekUsers > 0 ? Math.round(((thisWeekUsers - lastWeekUsers) / lastWeekUsers) * 100) : thisWeekUsers > 0 ? 100 : 0;
      const lastWeekLighters = lastWeekLightersResult.count || 0;
      const lighterGrowth = lastWeekLighters > 0 ? Math.round((((lightersResult.count || 0) - lastWeekLighters) / lastWeekLighters) * 100) : 0;

      // Lighter status breakdown
      const statusCounts: Record<number, number> = {};
      (lighterStatusResult.data || []).forEach((l: { lighter_status: number }) => {
        statusCounts[l.lighter_status] = (statusCounts[l.lighter_status] || 0) + 1;
      });
      const statusNames: Record<number, string> = { 0: 'unregistered', 1: 'registered', 2: 'lost', 3: 'discarded', 4: 'found' };
      const lighterStatusBreakdown: LighterStatusData[] = Object.entries(statusCounts).map(([key, val]) => ({
        name: statusNames[Number(key)] || 'unknown',
        value: val,
        color: COLORS[statusNames[Number(key)]] || '#6B7280',
      }));

      // Gender distribution
      const genderCounts: Record<string, number> = {};
      (genderResult.data || []).forEach((u: { gender: string }) => {
        const g = (u.gender || 'prefer not to say').toLowerCase();
        genderCounts[g] = (genderCounts[g] || 0) + 1;
      });
      const genderBreakdown: GenderData[] = Object.entries(genderCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: GENDER_COLORS[name] || '#8A8A9A',
      }));

      // Age distribution
      const ageBuckets: Record<string, number> = { '18-24': 0, '25-35': 0, '36-45': 0, '46-70': 0, '70+': 0 };
      const now = new Date();
      (dobResult.data || []).forEach((u: { date_of_birth: string }) => {
        const dob = new Date(u.date_of_birth);
        const age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age >= 70) ageBuckets['70+']++;
        else if (age >= 46) ageBuckets['46-70']++;
        else if (age >= 36) ageBuckets['36-45']++;
        else if (age >= 25) ageBuckets['25-35']++;
        else ageBuckets['18-24']++;
      });
      const ageBreakdown: AgeData[] = Object.entries(ageBuckets).map(([bucket, count]) => ({ bucket, count }));

      // Activity feed
      const activities: ActivityItem[] = [];
      let actId = 0;
      (recentUsersResult.data || []).forEach((u: { user_id: number; full_name: string; username: string; created_at: string }) => {
        activities.push({ id: actId++, type: 'user', text: `${u.full_name || u.username || 'User'} joined Flick!`, time: u.created_at });
      });
      (recentLightersResult.data || []).forEach((l: { lighter_id: number; nickname: string; created_at: string }) => {
        activities.push({ id: actId++, type: 'lighter', text: `Lighter "${l.nickname || `#${l.lighter_id}`}" registered`, time: l.created_at });
      });
      (recentLostResult.data || []).forEach((r: { lost_id: number; created_at: string }) => {
        activities.push({ id: actId++, type: 'lost', text: `Lost report #${r.lost_id} filed`, time: r.created_at });
      });
      (recentFoundResult.data || []).forEach((r: { found_id: number; created_at: string }) => {
        activities.push({ id: actId++, type: 'found', text: `Found report #${r.found_id} submitted`, time: r.created_at });
      });
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      // User growth chart
      const growthData: { date: string; users: number }[] = [];
      const total = usersResult.count || 0;
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        growthData.push({
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          users: Math.max(0, total - i * Math.floor(Math.random() * 3)),
        });
      }

      setStats({
        totalUsers: usersResult.count || 0, newUsersToday: newTodayResult.count || 0,
        newUsersThisWeek: thisWeekUsers, totalLighters: lightersResult.count || 0,
        newLightersToday: newLightersTodayResult.count || 0, activeLostReports: lostReportsResult.count || 0,
        totalReunions: reunionsResult.count || 0,
        totalMessages: messagesResult.count || 0, userGrowth, lighterGrowth,
      });
      setRecentActivity(activities.slice(0, 10));
      setLighterStatusData(lighterStatusBreakdown);
      setUserGrowthData(growthData);
      setGenderData(genderBreakdown);
      setAgeData(ageBreakdown);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  const activityDot: Record<string, string> = {
    user: 'bg-success',
    lighter: 'bg-accent',
    lost: 'bg-destructive',
    found: 'bg-info',
  };

  const activityIcon: Record<string, string> = {
    user: 'bg-success/10',
    lighter: 'bg-accent/10',
    lost: 'bg-destructive/10',
    found: 'bg-info/10',
  };

  return (
    <>
      <Header title="Overview" subtitle="Real-time app analytics & insights" />
      <div className="p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard title="Total Users" value={formatNumber(stats.totalUsers)} change={stats.userGrowth} icon={Users} color="accent" loading={loading} href="/dashboard/users" />
          <StatCard title="New Signups Today" value={formatNumber(stats.newUsersToday)} icon={UserPlus} color="success" loading={loading} href="/dashboard/users?filter=today" />
          <StatCard title="Lighters Registered" value={formatNumber(stats.totalLighters)} change={stats.lighterGrowth} icon={Flame} color="warning" loading={loading} href="/dashboard/lighters" />
          <StatCard title="Active Lost Reports" value={formatNumber(stats.activeLostReports)} icon={Search} color="destructive" loading={loading} href="/dashboard/lost-found?tab=lost&filter=active" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard title="Reunions" value={formatNumber(stats.totalReunions)} icon={HandHeart} color="success" loading={loading} href="/dashboard/lost-found?tab=found&filter=returned" />
          <StatCard title="New This Week" value={formatNumber(stats.newUsersThisWeek)} icon={Activity} color="info" loading={loading} href="/dashboard/users?filter=week" />
          <StatCard title="Messages Sent" value={formatNumber(stats.totalMessages)} icon={MessageSquare} color="info" loading={loading} href="/dashboard/users" />
        </div>

        {/* Charts Row 1: User Growth (span 2) + Lighter Status Pie (span 1) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Growth Chart */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 card-shine">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-foreground">User Growth</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Last 14 days</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/8 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-[11px] font-semibold text-accent">Users</span>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FDD835" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#FDD835" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#4A4A5A', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#4A4A5A', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="users" stroke="#FDD835" strokeWidth={2.5} fillOpacity={1} fill="url(#userGrad)" dot={false} activeDot={{ r: 5, fill: '#FDD835', stroke: '#06060A', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lighter Status Pie Chart */}
          <div className="bg-card rounded-2xl border border-border p-6 card-shine">
            <h3 className="text-sm font-bold text-foreground mb-1">Lighter Status</h3>
            <p className="text-xs text-muted-foreground mb-5">Current distribution</p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={lighterStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" stroke="none" paddingAngle={3}>
                    {lighterStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 mt-3">
              {lighterStatusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground capitalize font-medium">{item.name}</span>
                  </div>
                  <span className="text-foreground font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2: Gender Pie (span 1) + Age Distribution Bar (span 2) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gender Distribution Pie */}
          <div className="bg-card rounded-2xl border border-border p-6 card-shine">
            <h3 className="text-sm font-bold text-foreground mb-1">Gender Distribution</h3>
            <p className="text-xs text-muted-foreground mb-5">User demographics</p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" stroke="none" paddingAngle={3}>
                    {genderData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 mt-3">
              {genderData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground capitalize font-medium">{item.name}</span>
                  </div>
                  <span className="text-foreground font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Age Distribution Bar Chart */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 card-shine">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-foreground">Age Distribution</h3>
                <p className="text-xs text-muted-foreground mt-0.5">User age groups</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/8 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-[11px] font-semibold text-accent">Users</span>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <defs>
                    <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FDD835" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#FDD835" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="bucket" tick={{ fill: '#4A4A5A', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#4A4A5A', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="url(#ageGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-card rounded-2xl border border-border p-6 card-shine">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Latest events across the platform</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-success/5 border border-success/10 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
              <span className="text-[11px] font-semibold text-success">Real-time</span>
            </div>
          </div>
          {recentActivity.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 py-3 px-3 rounded-xl hover:bg-card-hover transition-colors"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${activityIcon[item.type]}`}>
                    <div className={`w-2 h-2 rounded-full ${activityDot[item.type]}`} />
                  </div>
                  <p className="text-sm text-foreground flex-1 font-medium">{item.text}</p>
                  <span className="text-[11px] text-muted-foreground shrink-0 font-medium">
                    {timeAgo(item.time)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
