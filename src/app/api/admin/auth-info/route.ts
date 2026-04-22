import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const map: Record<string, string | null> = {};
    (data?.users || []).forEach((u) => {
      map[u.id] = u.last_sign_in_at || null;
    });

    return NextResponse.json(map);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch auth info' }, { status: 500 });
  }
}
