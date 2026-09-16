import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  LayoutGrid, Users, GitBranch, MapPin, Wallet, MessageCircle, Settings as SettingsIcon,
  Send, Plus, Lock, Check, X, WifiOff, Sparkles,
} from 'lucide-react';
import { isAuthed, tryLogin, logout } from './lib/auth';
import { hasSupabaseConfig, getSupabaseConfig, saveSupabaseConfig } from './lib/supabase';
import {
  listRecords, insertRecord, buildSummary, type JsonRecord,
  getSettings, saveSettings, getKnowledge, saveKnowledge,
} from './lib/store';
import { askJune, loadChatHistory, pushChat } from './lib/june';

type View = 'dashboard' | 'partners' | 'referrals' | 'visits' | 'sales' | 'settings';

const NAV: { id: View; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'partners', label: 'Partners', icon: Users },
  { id: 'referrals', label: 'Referrals', icon: GitBranch },
  { id: 'visits', label: 'Visits', icon: MapPin },
  { id: 'sales', label: 'Sales', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// ---------- Login ----------
function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand-mark">JFS</div>
        <h1>Partner Hub</h1>
        <p className="muted">Enter the workspace password to continue.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (tryLogin(pw)) onLoggedIn();
            else setErr(true);
          }}
        >
          <div className={`pw-field ${err ? 'error' : ''}`}>
            <Lock size={16} />
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              placeholder="Password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setErr(false); }}
            />
          </div>
          {err && <div className="err-text">Incorrect password. Try again.</div>}
          <button className="btn primary full" type="submit">Enter workspace</button>
        </form>
      </div>
      <div className="login-glow" />
    </div>
  );
}

// ---------- Small building blocks ----------
function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="tile" style={accent ? { ['--tile-accent' as any]: accent } : undefined}>
      <div className="tile-value">{value}</div>
      <div className="tile-label">{label}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

// ---------- Record list views (Partners / Referrals / Visits / Sales) ----------
function RecordPanel({
  table, title, fields, renderRow,
}: {
  table: 'partners' | 'referrals' | 'site_visits' | 'sales';
  title: string;
  fields: { key: string; placeholder: string; type?: string }[];
  renderRow: (r: JsonRecord) => React.ReactNode;
}) {
  const qc = useQueryClient();
  const { data = [], isLoading, isError } = useQuery({ queryKey: [table], queryFn: () => listRecords(table) });
  const [form, setForm] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  const add = useMutation({
    mutationFn: (payload: JsonRecord) => insertRecord(table, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [table] }); qc.invalidateQueries({ queryKey: ['activity_log'] }); setForm({}); setOpen(false); },
  });

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <button className="btn ghost" onClick={() => setOpen((v) => !v)}>
          <Plus size={16} /> Add
        </button>
      </div>

      {open && (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const payload: JsonRecord = { ...form };
            if (payload.amount) payload.amount = Number(payload.amount);
            if (!payload.date && (table === 'site_visits' || table === 'sales')) payload.date = new Date().toISOString();
            add.mutate(payload);
          }}
        >
          {fields.map((f) => (
            <input
              key={f.key}
              type={f.type || 'text'}
              placeholder={f.placeholder}
              value={form[f.key] || ''}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
              required={f.key === 'name' || f.key === 'customer_name'}
            />
          ))}
          <button className="btn primary" type="submit" disabled={add.isPending}>Save</button>
        </form>
      )}

      {isError && <EmptyState text="Supabase isn't connected yet — add it in Settings." />}
      {!isError && isLoading && <EmptyState text="Loading…" />}
      {!isError && !isLoading && data.length === 0 && <EmptyState text="Nothing here yet." />}
      <div className="record-grid">{data.map((r: JsonRecord) => <div className="record-card" key={r.id}>{renderRow(r)}</div>)}</div>
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard() {
  const partners = useQuery({ queryKey: ['partners'], queryFn: () => listRecords('partners') });
  const referrals = useQuery({ queryKey: ['referrals'], queryFn: () => listRecords('referrals') });
  const visits = useQuery({ queryKey: ['site_visits'], queryFn: () => listRecords('site_visits') });
  const sales = useQuery({ queryKey: ['sales'], queryFn: () => listRecords('sales') });
  const activity = useQuery({ queryKey: ['activity_log'], queryFn: () => listRecords('activity_log') });

  const ready = [partners, referrals, visits, sales, activity].every((q) => q.data);
  const summary = useMemo(
    () => (ready ? buildSummary(partners.data!, referrals.data!, visits.data!, sales.data!, activity.data!) : null),
    [ready, partners.data, referrals.data, visits.data, sales.data, activity.data]
  );

  if (!ready) return <EmptyState text={partners.isError ? "Connect Supabase in Settings to load the dashboard." : "Loading dashboard…"} />;

  return (
    <div className="panel">
      <div className="tile-row">
        <StatTile label="Partners" value={String(summary!.partner_count)} />
        <StatTile label="Open referrals" value={String(summary!.open_referrals)} accent="#e8a33d" />
        <StatTile label="Visits today" value={String(summary!.today_visits)} accent="#4fb8a8" />
        <StatTile label="Overdue visits" value={String(summary!.overdue_visits)} accent="#e35b5b" />
        <StatTile label="Revenue" value={fmtINR(summary!.revenue)} accent="#7fd4ff" />
      </div>
      <div className="two-col">
        <div className="panel inner">
          <h3>Priorities</h3>
          <ul className="priority-list">
            {summary!.priorities.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
        <div className="panel inner">
          <h3>Recent activity</h3>
          {summary!.recent_activity.length === 0 && <EmptyState text="No activity logged yet." />}
          <ul className="activity-list">
            {summary!.recent_activity.map((a: JsonRecord) => (
              <li key={a.id}><span className="dot" />{a.message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------- Settings ----------
function SettingsPanel() {
  const qc = useQueryClient();
  const [sb, setSb] = useState(getSupabaseConfig());
  const [saved, setSaved] = useState(false);
  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: getSettings, enabled: hasSupabaseConfig() });
  const knowledgeQ = useQuery({ queryKey: ['knowledge'], queryFn: getKnowledge, enabled: hasSupabaseConfig() });
  const [groqKey, setGroqKey] = useState('');
  const [biz, setBiz] = useState<Record<string, string>>({});

  useEffect(() => { if (settingsQ.data) setGroqKey(settingsQ.data.groq_api_key || ''); }, [settingsQ.data]);
  useEffect(() => { if (knowledgeQ.data) setBiz(knowledgeQ.data.business || {}); }, [knowledgeQ.data]);

  const saveGroq = useMutation({
    mutationFn: () => saveSettings({ groq_api_key: groqKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
  const saveBiz = useMutation({
    mutationFn: () => saveKnowledge({ business: biz }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge'] }),
  });

  return (
    <div className="panel">
      <div className="two-col">
        <div className="panel inner">
          <h3>Supabase connection</h3>
          <p className="muted small">This is the only storage the app uses — partners, referrals, visits, sales and June's memory all live here.</p>
          <label className="field-label">Project URL</label>
          <input placeholder="https://xxxx.supabase.co" value={sb.url} onChange={(e) => setSb((s) => ({ ...s, url: e.target.value }))} />
          <label className="field-label">Anon public key</label>
          <input placeholder="eyJ..." value={sb.anonKey} onChange={(e) => setSb((s) => ({ ...s, anonKey: e.target.value }))} />
          <button
            className="btn primary"
            onClick={() => { saveSupabaseConfig(sb.url, sb.anonKey); setSaved(true); qc.invalidateQueries(); setTimeout(() => setSaved(false), 1500); }}
          >
            {saved ? <><Check size={16} /> Saved</> : 'Save connection'}
          </button>
          <p className="muted small" style={{ marginTop: 10 }}>
            Run the SQL in <code>supabase-setup.sql</code> once in your project's SQL editor before connecting.
          </p>
        </div>

        <div className="panel inner">
          <h3>June — AI settings</h3>
          <p className="muted small">Add a Groq key for model-backed answers. Without it, June still runs the dashboard and understands direct commands (add partner, log a sale, etc).</p>
          <label className="field-label">Groq API key</label>
          <input placeholder="gsk_..." value={groqKey} onChange={(e) => setGroqKey(e.target.value)} />
          <button className="btn primary" onClick={() => saveGroq.mutate()} disabled={!hasSupabaseConfig() || saveGroq.isPending}>Save Groq key</button>
        </div>
      </div>

      <div className="panel inner">
        <h3>Business knowledge (grounds June's answers)</h3>
        <div className="grid-2">
          {(['positioning', 'products', 'pricing', 'gst', 'operating_rules'] as const).map((k) => (
            <div key={k}>
              <label className="field-label">{k.replace('_', ' ')}</label>
              <textarea rows={2} value={biz[k] || ''} onChange={(e) => setBiz((s) => ({ ...s, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
        <button className="btn primary" onClick={() => saveBiz.mutate()} disabled={!hasSupabaseConfig() || saveBiz.isPending}>Save knowledge</button>
      </div>

      <div className="panel inner">
        <button className="btn ghost" onClick={() => { logout(); location.reload(); }}>Log out</button>
      </div>
    </div>
  );
}

// ---------- June chat dock ----------
function JuneDock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const [convId] = useState(() => `${Date.now()}`);
  const [busy, setBusy] = useState(false);
  const chatQ = useQuery({ queryKey: ['june_chat'], queryFn: loadChatHistory, enabled: hasSupabaseConfig() });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }); }, [chatQ.data, busy]);

  async function send() {
    const text = msg.trim();
    if (!text || busy) return;
    setMsg('');
    setBusy(true);
    try {
      await pushChat('user', text, convId);
      qc.invalidateQueries({ queryKey: ['june_chat'] });
      const reply = await askJune(text);
      await pushChat('assistant', reply, convId);
    } finally {
      setBusy(false);
      qc.invalidateQueries();
    }
  }

  if (!open) return null;
  const history = [...(chatQ.data || [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="june-dock">
      <div className="june-head">
        <div className="june-title"><Sparkles size={16} /> June</div>
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="june-body" ref={scrollRef}>
        {!hasSupabaseConfig() && <EmptyState text="Connect Supabase in Settings so June can remember things." />}
        {history.map((m: JsonRecord) => (
          <div key={m.id} className={`bubble ${m.role}`}>{m.content}</div>
        ))}
        {busy && <div className="bubble assistant typing">June is thinking…</div>}
      </div>
      <form className="june-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input
          placeholder='Try: "add client Ramesh Furniture"'
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          disabled={!hasSupabaseConfig()}
        />
        <button className="icon-btn primary" type="submit" disabled={!hasSupabaseConfig() || busy}><Send size={16} /></button>
      </form>
    </div>
  );
}

// ---------- Root App ----------
export default function App() {
  const [authed, setAuthed] = useState(isAuthed());
  const [view, setView] = useState<View>('dashboard');
  const [juneOpen, setJuneOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!authed) return <Login onLoggedIn={() => setAuthed(true)} />;

  return (
    <div className="shell">
      <nav className="rail">
        <div className="rail-brand">JFS</div>
        <div className="rail-nav">
          {NAV.map((n) => (
            <button key={n.id} className={`rail-btn ${view === n.id ? 'active' : ''}`} onClick={() => setView(n.id)} title={n.label}>
              <n.icon size={20} />
              <span>{n.label}</span>
            </button>
          ))}
        </div>
        <button className={`rail-btn june-btn ${juneOpen ? 'active' : ''}`} onClick={() => setJuneOpen((v) => !v)} title="June">
          <MessageCircle size={20} />
          <span>June</span>
        </button>
      </nav>

      <main className="stage">
        {!online && <div className="offline-banner"><WifiOff size={14} /> Offline — showing cached data. Changes need a connection.</div>}
        {!hasSupabaseConfig() && view !== 'settings' && (
          <div className="offline-banner warn">Supabase isn't connected. Go to Settings to add your project URL and key.</div>
        )}
        {view === 'dashboard' && <Dashboard />}
        {view === 'partners' && (
          <RecordPanel
            table="partners" title="Partners"
            fields={[{ key: 'name', placeholder: 'Partner name' }, { key: 'contact', placeholder: 'Phone / contact' }]}
            renderRow={(r) => (<><div className="record-title">{r.name}</div><div className="record-sub">{r.contact || 'No contact on file'}</div></>)}
          />
        )}
        {view === 'referrals' && (
          <RecordPanel
            table="referrals" title="Referrals"
            fields={[{ key: 'customer_name', placeholder: 'Customer name' }, { key: 'stage', placeholder: 'Stage (new, contacted, won…)' }]}
            renderRow={(r) => (<><div className="record-title">{r.customer_name}</div><div className="record-sub">Stage: {r.stage || 'new'}</div></>)}
          />
        )}
        {view === 'visits' && (
          <RecordPanel
            table="site_visits" title="Site visits"
            fields={[{ key: 'customer_name', placeholder: 'Customer name' }, { key: 'date', placeholder: '', type: 'datetime-local' }]}
            renderRow={(r) => (<><div className="record-title">{r.customer_name}</div><div className="record-sub">{new Date(r.date).toLocaleString()} · {r.status || 'scheduled'}</div></>)}
          />
        )}
        {view === 'sales' && (
          <RecordPanel
            table="sales" title="Sales"
            fields={[{ key: 'customer_name', placeholder: 'Customer name' }, { key: 'amount', placeholder: 'Amount (₹)', type: 'number' }]}
            renderRow={(r) => (<><div className="record-title">{r.customer_name}</div><div className="record-sub">{fmtINR(Number(r.amount || 0))}</div></>)}
          />
        )}
        {view === 'settings' && <SettingsPanel />}
      </main>

      <JuneDock open={juneOpen} onClose={() => setJuneOpen(false)} />
    </div>
  );
}
