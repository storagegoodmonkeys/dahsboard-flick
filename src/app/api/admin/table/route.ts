import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

const ALLOWED_TABLES = ['reports', 'report_problems', 'support_messages'];

export async function GET(req: NextRequest) {
  const table = req.nextUrl.searchParams.get('table');
  const page = parseInt(req.nextUrl.searchParams.get('page') || '0');
  const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '15');
  const search = req.nextUrl.searchParams.get('search') || '';

  if (!table || !ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Count
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });

  // Data
  let query = supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (search) {
    if (table === 'reports') {
      query = query.or(`report_reason.ilike.%${search}%,custom_reason.ilike.%${search}%`);
    } else if (table === 'report_problems') {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,description.ilike.%${search}%,problem_type.ilike.%${search}%`);
    } else if (table === 'support_messages') {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,subject.ilike.%${search}%,message.ilike.%${search}%`);
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich reports with user names/emails
  if (table === 'reports' && data && data.length > 0) {
    const userIds = [...new Set(data.flatMap((r: { reporter_user_id: number; content_id: number }) => [r.reporter_user_id, r.content_id]).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: users } = await supabase.from('users').select('user_id, full_name, username, email').in('user_id', userIds);
      const userMap = new Map((users || []).map((u: { user_id: number; full_name: string; username: string; email: string }) => [u.user_id, u]));
      data.forEach((r: { reporter_user_id: number; content_id: number; reporter_name?: string; reporter_email?: string; reported_name?: string; reported_email?: string }) => {
        const reporter = userMap.get(r.reporter_user_id);
        const reported = userMap.get(r.content_id);
        r.reporter_name = reporter?.full_name || reporter?.username || `User #${r.reporter_user_id}`;
        r.reporter_email = reporter?.email || '';
        r.reported_name = reported?.full_name || reported?.username || `User #${r.content_id}`;
        r.reported_email = reported?.email || '';
      });
    }
  }

  // Enrich report_problems & support_messages: resolve auth UUID → integer user_id
  if ((table === 'report_problems' || table === 'support_messages') && data && data.length > 0) {
    const authUuids = [...new Set(data.map((r: { user_id: string | null }) => r.user_id).filter(Boolean))] as string[];
    if (authUuids.length > 0) {
      const { data: users } = await supabase.from('users').select('user_id, uuid, full_name, username, email').in('uuid', authUuids);
      const uuidMap = new Map((users || []).map((u: { user_id: number; uuid: string; full_name: string; username: string; email: string }) => [u.uuid, u]));
      data.forEach((r: { user_id: string | null; resolved_user_id?: number; resolved_user_name?: string; resolved_user_email?: string }) => {
        if (r.user_id) {
          const u = uuidMap.get(r.user_id);
          if (u) {
            r.resolved_user_id = u.user_id;
            r.resolved_user_name = u.full_name || u.username;
            r.resolved_user_email = u.email;
          }
        }
      });
    }
  }

  return NextResponse.json({ data, count });
}

export async function PATCH(req: NextRequest) {
  const { table, id, status } = await req.json();

  if (!table || !ALLOWED_TABLES.includes(table) || !id || !status) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const pkCol = table === 'reports' ? 'report_id' : table === 'report_problems' ? 'id' : 'id';
  const updates: Record<string, unknown> = { status };
  if (table !== 'reports') updates.updated_at = new Date().toISOString();

  const { error } = await supabase.from(table).update(updates).eq(pkCol, id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
