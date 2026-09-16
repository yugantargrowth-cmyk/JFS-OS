import { getSupabase } from './supabase';

export const TABLE = 'jfs_workspace_records';

export type RecordTable =
  | 'partners' | 'referrals' | 'site_visits' | 'sales'
  | 'tasks' | 'memory' | 'june_chat' | 'june_actions' | 'activity_log';

export type JsonRecord = Record<string, any>;

function uid() {
  return (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function requireClient() {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not connected yet. Add your project URL and anon key in Settings.');
  return sb;
}

function rowToRecord(row: any): JsonRecord {
  return { ...row.data, id: row.id, created_at: row.created_at, updated_at: row.updated_at };
}

function label(table: RecordTable) {
  if (table === 'site_visits') return 'a site visit';
  if (table === 'sales') return 'a sale';
  if (table === 'referrals') return 'a referral';
  if (table === 'partners') return 'a partner';
  return `a ${table}`;
}

export async function writeActivity(message: string, type: string) {
  try {
    await insertRecord('activity_log', { type, message, created_at: new Date().toISOString() }, false);
  } catch {
    /* activity logging is best-effort */
  }
}

export async function listRecords(table: RecordTable): Promise<JsonRecord[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from(TABLE)
    .select('*')
    .eq('table_name', table)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToRecord);
}

export async function insertRecord(table: RecordTable, data: JsonRecord, log = true): Promise<JsonRecord> {
  const sb = requireClient();
  const id = typeof data.id === 'string' && data.id ? data.id : uid();
  const now = new Date().toISOString();
  const payload = { ...data, id };
  const { data: row, error } = await sb
    .from(TABLE)
    .insert({ id, table_name: table, data: payload, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  if (log) await writeActivity(`Added ${label(table)}.`, `create_${table}`);
  return rowToRecord(row);
}

export async function updateRecord(table: RecordTable, data: JsonRecord): Promise<JsonRecord | null> {
  const sb = requireClient();
  const recordId = typeof data.id === 'string' ? data.id : '';
  if (!recordId) return null;
  const { data: existingRows, error: fetchErr } = await sb
    .from(TABLE).select('*').eq('table_name', table).eq('id', recordId).limit(1);
  if (fetchErr) throw fetchErr;
  if (!existingRows?.[0]) return null;
  const merged = { ...existingRows[0].data, ...data, id: recordId };
  const { data: row, error } = await sb
    .from(TABLE)
    .update({ data: merged, updated_at: new Date().toISOString() })
    .eq('table_name', table).eq('id', recordId)
    .select().single();
  if (error) throw error;
  await writeActivity(`Updated ${label(table)}.`, `update_${table}`);
  return rowToRecord(row);
}

export async function removeRecord(table: RecordTable, recordId: string): Promise<JsonRecord | null> {
  const sb = requireClient();
  const { data: row, error } = await sb
    .from(TABLE).delete().eq('table_name', table).eq('id', recordId).select().single();
  if (error) throw error;
  await writeActivity(`Removed ${label(table)}.`, `delete_${table}`);
  return row ? rowToRecord(row) : null;
}

export const defaultSettings = {
  theme: 'dark',
  model: 'openai/gpt-oss-120b',
  temperature: 0.4,
  max_tokens: 2048,
  personality: 'Warm, commercially sharp, and practical. Speak like a thoughtful operations partner.',
  system_prompt: 'Help JFS move partner-sourced furniture work forward. Ground every answer in the workspace data and say when information is missing.',
  reminders_enabled: true,
  groq_api_key: '',
};

export const defaultKnowledge = {
  name: 'JFS Furniture',
  website: '',
  notes: [] as string[],
  business: { positioning: '', products: '', pricing: '', gst: '', operating_rules: '', june_context: '' },
};

async function singleton<T extends JsonRecord>(key: string, fallback: T): Promise<T> {
  const sb = getSupabase();
  if (!sb) return fallback;
  const { data, error } = await sb.from(TABLE).select('*').eq('table_name', `__${key}__`).eq('id', `__${key}__`).limit(1);
  if (error) throw error;
  return (data?.[0]?.data as T) ?? fallback;
}

async function saveSingleton<T extends JsonRecord>(key: string, value: T): Promise<T> {
  const sb = requireClient();
  const now = new Date().toISOString();
  const { error } = await sb.from(TABLE).upsert({ id: `__${key}__`, table_name: `__${key}__`, data: value, created_at: now, updated_at: now });
  if (error) throw error;
  return value;
}

export async function getSettings() {
  const s = await singleton('settings', defaultSettings);
  return { ...defaultSettings, ...s };
}
export async function saveSettings(patch: JsonRecord) {
  const current = await getSettings();
  return saveSingleton('settings', { ...current, ...patch });
}
export async function getKnowledge() {
  const k = await singleton('knowledge', defaultKnowledge);
  return { ...defaultKnowledge, ...k, business: { ...defaultKnowledge.business, ...(k.business || {}) } };
}
export async function saveKnowledge(patch: JsonRecord) {
  const current = await getKnowledge();
  const notes = Array.isArray(patch.notes) ? patch.notes.filter(Boolean) : current.notes;
  return saveSingleton('knowledge', { ...current, ...patch, notes, business: { ...current.business, ...(patch.business || {}) } });
}

export function buildSummary(partners: JsonRecord[], referrals: JsonRecord[], visits: JsonRecord[], sales: JsonRecord[], activity: JsonRecord[]) {
  const today = new Date().toISOString().slice(0, 10);
  const pipeline: Record<string, number> = { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0 };
  for (const r of referrals) { const stage = String(r.stage || 'new'); pipeline[stage] = (pipeline[stage] || 0) + 1; }
  const openReferrals = referrals.filter((r) => !['won', 'lost', 'closed'].includes(String(r.stage))).length;
  const overdueVisits = visits.filter((v) => {
    const d = new Date(String(v.date || ''));
    return !Number.isNaN(d.valueOf()) && d < new Date() && !['completed', 'cancelled'].includes(String(v.status));
  }).length;
  const revenue = sales.reduce((total, s) => total + Number(s.amount || 0), 0);
  const priorities: string[] = [];
  if (overdueVisits) priorities.push(`${overdueVisits} site visit${overdueVisits === 1 ? '' : 's'} need a follow-up`);
  if (openReferrals) priorities.push(`${openReferrals} open referral${openReferrals === 1 ? '' : 's'} are still in motion`);
  if (!priorities.length) priorities.push('The runway is clear. Add a partner touchpoint or capture the next referral.');
  return {
    partner_count: partners.length,
    referral_count: referrals.length,
    open_referrals: openReferrals,
    visit_count: visits.length,
    today_visits: visits.filter((v) => String(v.date || '').slice(0, 10) === today).length,
    overdue_visits: overdueVisits,
    sales_count: sales.length,
    revenue,
    pipeline,
    recent_activity: activity.slice(0, 6),
    priorities,
  };
}

export async function workspaceSnapshot() {
  const [partners, referrals, visits, sales, tasks] = await Promise.all([
    listRecords('partners'), listRecords('referrals'), listRecords('site_visits'), listRecords('sales'), listRecords('tasks'),
  ]);
  return { partners, referrals, visits, sales, tasks };
}
