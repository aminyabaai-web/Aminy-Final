/**
 * Supabase Client
 * Single instance for browser-side Supabase operations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// CRITICAL: Validate environment variables are set - never use placeholders
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
  console.error(
    `[Supabase] CRITICAL: Missing required environment variables: ${missingVars.join(', ')}. ` +
    'Please configure your .env.local file with valid Supabase credentials.'
  );
}

// Validate URL format to catch configuration errors early
if (supabaseUrl && !supabaseUrl.match(/^https:\/\/[a-z0-9-]+\.supabase\.co$/)) {
  console.error('[Supabase] WARNING: VITE_SUPABASE_URL does not match expected format');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
