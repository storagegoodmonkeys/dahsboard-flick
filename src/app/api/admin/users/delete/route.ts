import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, uuid } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Soft-delete user in users table
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        user_status: 'banned',
      })
      .eq('user_id', user_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Ban auth user if uuid provided
    if (uuid) {
      await supabaseAdmin.auth.admin.updateUserById(uuid, {
        ban_duration: '876000h', // ~100 years
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
