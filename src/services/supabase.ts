import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../types';

// ─── Credentials loaded from environment variables ────────────────────────────
// Set these in your ".env" file (see .env.example). Never hardcode credentials.
const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[supabase.ts] ⚠️  Missing Supabase environment variables.\n' +
    'Please create a ".env" file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
    'See ".env.example" for the required format.'
  );
}
// ─────────────────────────────────────────────────────────────────────────────

let supabaseClient: SupabaseClient | null = null;

export function sanitizeSupabaseUrl(url: string): string {
  let cleaned = url.trim();
  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  // Strip /rest/v1 if present at the end
  if (cleaned.endsWith('/rest/v1')) {
    cleaned = cleaned.substring(0, cleaned.length - 8);
  }
  // Strip trailing slashes again
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

export function getSupabaseCredentials(): SupabaseConfig | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  };
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[supabase.ts] Cannot initialize client — environment variables are missing.');
    return null;
  }

  try {
    const sanitizedUrl = sanitizeSupabaseUrl(SUPABASE_URL);
    supabaseClient = createClient(sanitizedUrl, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
      },
    });
    return supabaseClient;
  } catch (e) {
    console.error('[supabase.ts] Failed to initialize Supabase client:', e);
    return null;
  }
}
