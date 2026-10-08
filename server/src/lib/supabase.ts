import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

let supabaseAdmin: SupabaseClient | null = null;

export const getSupabaseAdmin = (): SupabaseClient | null => {
  if (supabaseAdmin) return supabaseAdmin;

  const url = config.supabase.url;
  const key = config.supabase.serviceKey || config.supabase.anonKey;

  if (!url || !key) {
    return null;
  }

  supabaseAdmin = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
};
