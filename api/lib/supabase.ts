import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const WORKSPACE_TABLE = 'jfs_workspace_records';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    throw new Error('Supabase credentials missing. Please configure SUPABASE_URL and SUPABASE_ANON_KEY in Vercel environment variables.');
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false }
  });
  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  return Boolean(url && key);
}

export interface WorkspaceRecordRow {
  id: string;
  table_name: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export async function insertWorkspaceRecord(tableName: string, data: Record<string, any>): Promise<any> {
  const sb = getSupabaseClient();
  const id = data.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const payload = { ...data, id };

  const { data: row, error } = await sb
    .from(WORKSPACE_TABLE)
    .insert({
      id,
      table_name: tableName,
      data: payload,
      created_at: now,
      updated_at: now
    })
    .select()
    .single();

  if (error) throw error;
  return { ...row.data, id: row.id, created_at: row.created_at, updated_at: row.updated_at };
}

export async function listWorkspaceRecords(tableName: string, limit = 200): Promise<any[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from(WORKSPACE_TABLE)
    .select('*')
    .eq('table_name', tableName)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map((r) => ({
    ...r.data,
    id: r.id,
    created_at: r.created_at,
    updated_at: r.updated_at
  }));
}

export async function getWorkspaceRecord(tableName: string, id: string): Promise<any | null> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from(WORKSPACE_TABLE)
    .select('*')
    .eq('table_name', tableName)
    .eq('id', id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { ...data.data, id: data.id, created_at: data.created_at, updated_at: data.updated_at };
}

export async function updateWorkspaceRecord(tableName: string, id: string, patch: Record<string, any>): Promise<any | null> {
  const sb = getSupabaseClient();
  const existing = await getWorkspaceRecord(tableName, id);
  if (!existing) return null;

  const merged = { ...existing, ...patch, id };
  const now = new Date().toISOString();

  const { data: row, error } = await sb
    .from(WORKSPACE_TABLE)
    .update({
      data: merged,
      updated_at: now
    })
    .eq('table_name', tableName)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return { ...row.data, id: row.id, created_at: row.created_at, updated_at: row.updated_at };
}

export async function deleteWorkspaceRecord(tableName: string, id: string): Promise<boolean> {
  const sb = getSupabaseClient();
  const { error } = await sb
    .from(WORKSPACE_TABLE)
    .delete()
    .eq('table_name', tableName)
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function getSingleton<T = any>(key: string, fallback: T): Promise<T> {
  if (!isSupabaseConfigured()) return fallback;
  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from(WORKSPACE_TABLE)
      .select('*')
      .eq('table_name', `__${key}__`)
      .eq('id', `__${key}__`)
      .limit(1)
      .maybeSingle();

    if (error || !data) return fallback;
    return (data.data as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function saveSingleton<T = any>(key: string, value: T): Promise<T> {
  const sb = getSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await sb
    .from(WORKSPACE_TABLE)
    .upsert({
      id: `__${key}__`,
      table_name: `__${key}__`,
      data: value as any,
      created_at: now,
      updated_at: now
    });

  if (error) throw error;
  return value;
}
