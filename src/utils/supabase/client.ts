// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Supabase Client
 * Single instance for browser-side Supabase operations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables — dev-only detail logging
if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
    console.error(
      `[Supabase] Missing required environment variables: ${missingVars.join(', ')}. ` +
      'Configure your .env.local file with valid Supabase credentials.'
    );
  }
}

// Validate URL format — dev only
if (import.meta.env.DEV && supabaseUrl && !supabaseUrl.match(/^https:\/\/[a-z0-9-]+\.supabase\.co$/)) {
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

// Alias for modules that use factory pattern
export const createClientSupabaseClient = () => supabase;
