import { createAdminClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { user_id, reason = 'Blocked by admin' } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Update user status to banned
    const { error: statusError } = await admin
      .from('users')
      .update({ user_status: 'banned' })
      .eq('user_id', user_id);

    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: 400 });
    }

    // Insert into banned_users
    const { error: banError } = await admin
      .from('banned_users')
      .insert({
        user_id,
        ban_type: 'permanent',
        reason,
        starts_at: new Date().toISOString(),
      });

    if (banError) {
      return NextResponse.json({ error: banError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
