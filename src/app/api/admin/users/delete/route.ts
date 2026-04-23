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

    // Clean up rows whose FKs do NOT cascade on users.user_id delete.
    // (Everything else has ON DELETE CASCADE / SET NULL in the DB.)
    await supabaseAdmin
      .from('transfer_requests')
      .delete()
      .or(`sender_user_id.eq.${user_id},recipient_user_id.eq.${user_id}`);

    await supabaseAdmin
      .from('conversation_members')
      .delete()
      .eq('user_id', user_id);

    await supabaseAdmin
      .from('conversations')
      .update({ created_by: null })
      .eq('created_by', user_id);

    await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('created_by', user_id);

    // Hard delete from public.users (CASCADE handles the rest)
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('user_id', user_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    // Hard delete from auth.users so the login cannot be re-used
    if (uuid) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(uuid);
      if (authError) {
        return NextResponse.json(
          { error: `Profile deleted, but auth deletion failed: ${authError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
