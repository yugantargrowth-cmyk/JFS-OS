import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL_KEY = 'jfs_supabase_url';
const ANON_KEY = 'jfs_supabase_anon_key';

let cached: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function getSupabaseConfig() {
  return {
    url: localStorage.getItem(URL_KEY) || '',
    anonKey: localStorage.getItem(ANON_KEY) || '',
  };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(URL_KEY, url.trim());
  localStorage.setItem(ANON_KEY, anonKey.trim());
  cached = null;
}

export function hasSupabaseConfig() {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;
  if (cached && cachedUrl === url && cachedKey === anonKey) return cached;
  cached = createClient(url, anonKey);
  cachedUrl = url;
  cachedKey = anonKey;
  return cached;
}
