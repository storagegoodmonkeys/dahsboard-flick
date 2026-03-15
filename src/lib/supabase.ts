import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\s+/g, '');
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/\s+/g, '');

// Client-side Supabase client (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (uses service role key for admin operations)
export function createAdminClient() {
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/\s+/g, '');
  return createClient(supabaseUrl, serviceRoleKey);
}
