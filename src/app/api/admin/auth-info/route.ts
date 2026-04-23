import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const map: Record<string, { last_sign_in_at: string | null; email_confirmed_at: string | null }> = {};
    (data?.users || []).forEach((u) => {
      map[u.id] = {
        last_sign_in_at: u.last_sign_in_at || null,
        email_confirmed_at: u.email_confirmed_at || null,
      };
    });

    return NextResponse.json(map);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch auth info' }, { status: 500 });
  }
}
