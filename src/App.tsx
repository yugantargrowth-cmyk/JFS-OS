import { useState, useMemo, useEffect } from 'react';
import {
  Phone, MessageSquare, Calendar, Plus, Search, CheckCircle2,
  Clock, AlertCircle, FileText, ArrowRight, X, Download, RefreshCw,
  MapPin, Settings as SettingsIcon, LayoutGrid, Check, ExternalLink,
  Sparkles, Bell, BellRing, ShieldCheck, Database
} from 'lucide-react';
import { Lead, LeadStage, LEAD_STAGES, HubSettings } from './lib/types';
import {
  getLeads, saveLead, deleteLead, getHubSettings, saveHubSettings,
  calculateSummary, exportLeadsToCsv, fetchLiveLeads, registerPushNotifications,
  getTodayDateString, getOffsetDateString
} from './lib/leadStore';
import JuneWorkspace from './components/JuneWorkspace';

function fmtINR(amount?: number): string {
  if (!amount || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export default function App() {
  const [leads, setLeads] = useState<Lead[]>(() => getLeads());
  const [settings, setSettings] = useState<HubSettings>(() => getHubSettings());
  const [filterTab, setFilterTab] = useState<'today' | 'all' | 'new' | 'visits' | 'quotes' | 'won' | 'settings'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  
  // June AI workspace state
  const [isJuneOpen, setIsJuneOpen] = useState(false);

  // Modals state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Add Lead Form State
  const [newCustName, setNewCustName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCityArea, setNewCityArea] = useState('Ahmedabad');
  const [newService, setNewService] = useState('Modular Kitchen');
  const [newBudget, setNewBudget] = useState('');
  const [newSource, setNewSource] = useState('Phone Call');
  const [newStage, setNewStage] = useState<LeadStage>('Lead');
  const [newNextAction, setNewNextAction] = useState('Initial phone call to qualify requirement');
  const [newFollowUpDate, setNewFollowUpDate] = useState(getTodayDateString());
  const [newNotes, setNewNotes] = useState('');

  // Sync state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const summary = useMemo(() => calculateSummary(leads), [leads]);
  const today = getTodayDateString();

  function refreshLeads() {
    setLeads(getLeads());
  }

  // Live data sync and deep linking on mount
  useEffect(() => {
    // 1. Initial live fetch
    fetchLiveLeads().then(() => {
      setLeads(getLeads());
    });

    // 2. Poll backend every 15s to catch new incoming website leads
    const timer = setInterval(() => {
      fetchLiveLeads().then((res) => {
        if (res.success && res.count > 0) {
          setLeads(getLeads());
        }
      });
    }, 15000);

    // 3. Deep linking for notifications: ?leadId=...
    const urlParams = new URLSearchParams(window.location.search);
    const targetLeadId = urlParams.get('leadId');
    if (targetLeadId) {
      const match = getLeads().find((l) => l.id === targetLeadId);
      if (match) {
        setEditingLead(match);
      }
    }

    return () => clearInterval(timer);
  }, []);

  // Filter leads based on selected tab and search
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.customer_name.toLowerCase().includes(q);
        const matchesPhone = lead.phone.includes(q);
        const matchesArea = (lead.city_area || '').toLowerCase().includes(q);
        const matchesService = (lead.service || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesArea && !matchesService) return false;
      }

      // Tab match
      if (filterTab === 'today') {
        if (lead.stage === 'WON' || lead.stage === 'Lost' || lead.stage === 'Referral') return false;
        return (lead.next_follow_up_date && lead.next_follow_up_date <= today);
      }
      if (filterTab === 'new') {
        return lead.stage === 'Lead' || lead.stage === 'Contact';
      }
      if (filterTab === 'visits') {
        return lead.stage === 'Site Visit';
      }
      if (filterTab === 'quotes') {
        return lead.stage === 'Quotation' || lead.stage === 'Follow-up' || lead.stage === 'Negotiation';
      }
      if (filterTab === 'won') {
        return lead.stage === 'WON' || lead.stage === 'Installation' || lead.stage === 'Referral';
      }
      return true; // 'all'
    });
  }, [leads, filterTab, searchQuery, today]);

  // Handle Add Lead Submit
  function handleAddLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newCustName.trim() || !newPhone.trim()) return;

    saveLead({
      customer_name: newCustName,
      phone: newPhone,
      city_area: newCityArea,
      service: newService,
      budget: newBudget,
      source: newSource,
      stage: newStage,
      next_action: newNextAction || 'Initial phone call',
      next_follow_up_date: newFollowUpDate || today,
      notes: newNotes
    });

    // Reset
    setNewCustName('');
    setNewPhone('');
    setNewCityArea('Ahmedabad');
    setNewService('Modular Kitchen');
    setNewBudget('');
    setNewNotes('');
    setNewNextAction('Initial phone call to qualify requirement');
    setNewFollowUpDate(today);
    setIsAddOpen(false);
    refreshLeads();
  }

  // Handle Edit Lead Save
  function handleEditLeadSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLead) return;
    saveLead(editingLead);
    setEditingLead(null);
    refreshLeads();
  }

  // Handle Delete Lead
  function handleDeleteLead(id: string) {
    if (window.confirm('Are you sure you want to remove this lead?')) {
      deleteLead(id);
      setEditingLead(null);
      refreshLeads();
    }
  }

  // Export CSV
  function handleExportCsv() {
    const csvContent = exportLeadsToCsv(leads);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `JFS_Leads_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Trigger Live Sync from Server API
  async function handleRefreshLive() {
    setSyncLoading(true);
    setSyncStatus('Checking backend for new website leads…');
    const result = await fetchLiveLeads();
    setSyncLoading(false);
    if (result.success) {
      setSyncStatus(`✓ Connected to JFS-OS backend (${result.count} leads synchronized).`);
      setSettings(getHubSettings());
      refreshLeads();
    } else {
      setSyncStatus(`Notice: ${result.error || 'Running in local cache mode.'}`);
    }
    setTimeout(() => setSyncStatus(null), 5000);
  }

  // Handle Push Notification Activation
  async function handleEnablePush() {
    setPushStatus('Requesting notification permission…');
    const res = await registerPushNotifications();
    setPushStatus(res.message);
    setSettings(getHubSettings());
    setTimeout(() => setPushStatus(null), 6000);
  }

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="hub-header">
        <div className="hub-header-inner">
          <div className="brand-group">
            <div className="brand-badge">JFS</div>
            <div>
              <div className="brand-title">
                Jangid Furniture Studio
                <span style={{ fontSize: '11px', background: 'rgba(79,184,168,0.2)', color: 'var(--accent-2)', padding: '2px 8px', borderRadius: '10px' }}>
                  Business Hub
                </span>
              </div>
              <div className="brand-sub">Ahmedabad Modular Furniture & Lead Pipeline</div>
            </div>
          </div>

          <div className="header-actions">
            <div className="search-wrapper">
              <Search className="search-icon" size={14} />
              <input
                type="text"
                placeholder="Search name, phone, area…"
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* June AI Workspace Button */}
            <button className="june-dock-btn" onClick={() => setIsJuneOpen(true)}>
              <Sparkles size={15} /> Ask June
            </button>

            <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
              <Plus size={16} /> Add Lead
            </button>
          </div>
        </div>
      </header>

      {/* Main Hub Stage */}
      <main className="hub-main">
        {/* KPI Stat Row */}
        <div className="kpi-grid">
          <div
            className={`kpi-card ${filterTab === 'today' ? 'active' : ''}`}
            onClick={() => setFilterTab('today')}
            style={{ ['--kpi-accent' as any]: '#e53e3e' }}
          >
            <div className="kpi-val" style={{ color: summary.overdueFollowUps > 0 ? '#fc8181' : undefined }}>
              {summary.todayFollowUps + summary.overdueFollowUps}
            </div>
            <div className="kpi-label">Today's Focus</div>
            <div className="kpi-sub">
              {summary.overdueFollowUps > 0 ? `${summary.overdueFollowUps} overdue!` : 'Due today'}
            </div>
          </div>

          <div
            className={`kpi-card ${filterTab === 'new' ? 'active' : ''}`}
            onClick={() => setFilterTab('new')}
            style={{ ['--kpi-accent' as any]: '#3182ce' }}
          >
            <div className="kpi-val">{summary.newLeads}</div>
            <div className="kpi-label">New Enquiries</div>
            <div className="kpi-sub">Needs qualification</div>
          </div>

          <div
            className={`kpi-card ${filterTab === 'visits' ? 'active' : ''}`}
            onClick={() => setFilterTab('visits')}
            style={{ ['--kpi-accent' as any]: '#805ad5' }}
          >
            <div className="kpi-val">{summary.siteVisits}</div>
            <div className="kpi-label">Site Visits</div>
            <div className="kpi-sub">Measurements & Layout</div>
          </div>

          <div
            className={`kpi-card ${filterTab === 'quotes' ? 'active' : ''}`}
            onClick={() => setFilterTab('quotes')}
            style={{ ['--kpi-accent' as any]: '#d69e2e' }}
          >
            <div className="kpi-val">{summary.quotations}</div>
            <div className="kpi-label">Active Quotes</div>
            <div className="kpi-sub">{fmtINR(summary.quotationPipelineValue)}</div>
          </div>

          <div
            className={`kpi-card ${filterTab === 'won' ? 'active' : ''}`}
            onClick={() => setFilterTab('won')}
            style={{ ['--kpi-accent' as any]: '#38a169' }}
          >
            <div className="kpi-val">{summary.wonLeads}</div>
            <div className="kpi-label">Orders Won</div>
            <div className="kpi-sub">{fmtINR(summary.wonRevenue)}</div>
          </div>

          <div
            className={`kpi-card ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
            style={{ ['--kpi-accent' as any]: 'var(--accent-2)' }}
          >
            <div className="kpi-val">{summary.totalLeads}</div>
            <div className="kpi-label">Total Leads</div>
            <div className="kpi-sub">All time</div>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="filter-bar">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filterTab === 'today' ? 'active' : ''}`}
              onClick={() => setFilterTab('today')}
            >
              <AlertCircle size={14} style={{ color: summary.overdueFollowUps > 0 ? '#fc8181' : undefined }} />
              Today's Action
              <span className="tab-count">{summary.todayFollowUps + summary.overdueFollowUps}</span>
            </button>
            <button
              className={`filter-tab ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              All Leads
              <span className="tab-count">{leads.length}</span>
            </button>
            <button
              className={`filter-tab ${filterTab === 'new' ? 'active' : ''}`}
              onClick={() => setFilterTab('new')}
            >
              New Leads
              <span className="tab-count">{summary.newLeads}</span>
            </button>
            <button
              className={`filter-tab ${filterTab === 'visits' ? 'active' : ''}`}
              onClick={() => setFilterTab('visits')}
            >
              Site Visits
              <span className="tab-count">{summary.siteVisits}</span>
            </button>
            <button
              className={`filter-tab ${filterTab === 'quotes' ? 'active' : ''}`}
              onClick={() => setFilterTab('quotes')}
            >
              Quotations
              <span className="tab-count">{summary.quotations}</span>
            </button>
            <button
              className={`filter-tab ${filterTab === 'won' ? 'active' : ''}`}
              onClick={() => setFilterTab('won')}
            >
              Won Orders
              <span className="tab-count">{summary.wonLeads}</span>
            </button>
            <button
              className={`filter-tab ${filterTab === 'settings' ? 'active' : ''}`}
              onClick={() => setFilterTab('settings')}
            >
              <SettingsIcon size={14} />
              Settings & Integrations
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleRefreshLive} title="Sync latest website leads">
              <RefreshCw size={13} className={syncLoading ? 'spin' : ''} /> Refresh
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportCsv} title="Export leads to CSV file">
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatus && (
          <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--panel-2)', border: '1px solid var(--accent-2)', fontSize: '13px', color: 'var(--accent-2)' }}>
            {syncStatus}
          </div>
        )}

        {/* Push Status Banner */}
        {pushStatus && (
          <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(79, 184, 168, 0.15)', border: '1px solid var(--accent-2)', fontSize: '13px', color: '#b2f5ea' }}>
            {pushStatus}
          </div>
        )}

        {/* Settings View */}
        {filterTab === 'settings' ? (
          <div className="settings-section">
            <div className="settings-title">
              <SettingsIcon size={18} /> JFS-OS System Settings & Integrations
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: '1.6' }}>
              Jangid Furniture Studio operations run on the unified JFS-OS architecture. Public website inquiries flow directly into the JFS-OS database and trigger real-time phone push notifications.
            </p>

            {/* Web Push Notification Settings Box */}
            <div className="push-status-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BellRing size={20} style={{ color: 'var(--accent-2)' }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '13.5px' }}>Mobile & Desktop Push Notifications</strong>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Receive instant alerts on your phone whenever a customer submits an inquiry from the website.
                  </span>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleEnablePush}>
                <Bell size={14} /> Enable Phone Notifications
              </button>
            </div>

            {/* June AI Operations Partner Box */}
            <div className="guide-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                <strong style={{ color: 'var(--text)', fontSize: '14px' }}>June — Operations & Sales AI</strong>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
                June is accessible at any time from the top navigation bar. It is powered by Groq's high-speed inference engine with direct read/write tools to inspect your live pipeline, update lead stages, schedule follow-ups, and answer questions truthfully using real database records.
              </p>
              <div style={{ marginTop: '10px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setIsJuneOpen(true)}>
                  <Sparkles size={13} /> Open June AI Workspace
                </button>
              </div>
            </div>

            {/* Data Layer & Backup */}
            <div className="guide-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Database size={16} style={{ color: 'var(--accent-2)' }} />
                <strong style={{ color: 'var(--text)', fontSize: '14px' }}>Data Protection & Offline Safety</strong>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
                Google Sheets dependency has been removed. All customer inquiries, notes, quotations, and stages are stored safely with non-destructive caching so your pipeline is always accessible even on remote job sites without internet.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleRefreshLive}>
                  <RefreshCw size={13} /> Synchronize Live Database
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleExportCsv}>
                  <Download size={13} /> Export All Leads as CSV
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Leads List / Cards Grid */
          <div className="leads-container">
            {filteredLeads.length === 0 ? (
              <div className="empty-leads">
                <LayoutGrid size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <h3>No leads found in this view</h3>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>
                  {searchQuery ? 'Try clearing your search query.' : 'Click "+ Add Lead" above to record a new enquiry.'}
                </p>
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isOverdue = lead.next_follow_up_date && lead.next_follow_up_date < today && lead.stage !== 'WON' && lead.stage !== 'Lost' && lead.stage !== 'Referral';
                const isToday = lead.next_follow_up_date && lead.next_follow_up_date === today && lead.stage !== 'WON' && lead.stage !== 'Lost' && lead.stage !== 'Referral';
                const isWon = lead.stage === 'WON' || lead.stage === 'Installation' || lead.stage === 'Referral';

                // Normalized 10-digit phone for WhatsApp link
                const cleanPhone = lead.phone.replace(/[^0-9]/g, '').slice(-10);
                const waMessage = encodeURIComponent(
                  `Namaste ${lead.customer_name} ji, this is from Jangid Furniture Studio, Ahmedabad regarding your ${lead.service} inquiry. We are following up regarding your project.`
                );
                const waUrl = `https://wa.me/91${cleanPhone}?text=${waMessage}`;

                return (
                  <div
                    key={lead.id}
                    className={`lead-card ${isOverdue ? 'is-overdue' : ''} ${isToday ? 'is-today' : ''} ${isWon ? 'is-won' : ''}`}
                  >
                    {/* Header Row */}
                    <div className="lead-header-row">
                      <div className="lead-cust-info">
                        <div className="lead-cust-name">
                          {lead.customer_name}
                          <span className={`stage-badge stage-${lead.stage.replace(/[\s-]/g, '_')}`}>
                            {lead.stage}
                          </span>
                        </div>
                        <div className="lead-meta">
                          <span><Phone size={12} /> {lead.phone}</span>
                          <span><MapPin size={12} /> {lead.city_area || 'Ahmedabad'}</span>
                          <span>Source: {lead.source}</span>
                        </div>
                      </div>

                      {lead.quote_amount ? (
                        <div className="tag-amount">
                          {fmtINR(lead.quote_amount)}
                        </div>
                      ) : null}
                    </div>

                    {/* Next Action Box */}
                    <div className="lead-action-box">
                      <div className="lead-action-text">
                        <ArrowRight size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <span><strong>Next Action:</strong> {lead.next_action}</span>
                      </div>
                      <div>
                        {isOverdue && (
                          <span className="lead-followup-badge badge-overdue">
                            Overdue ({lead.next_follow_up_date})
                          </span>
                        )}
                        {isToday && (
                          <span className="lead-followup-badge badge-today">
                            Due Today
                          </span>
                        )}
                        {!isOverdue && !isToday && lead.next_follow_up_date && (
                          <span className="lead-followup-badge badge-upcoming">
                            Follow-up: {lead.next_follow_up_date}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Notes if available */}
                    {lead.notes && (
                      <div style={{ fontSize: '12.5px', color: 'var(--muted)', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px' }}>
                        {lead.notes}
                      </div>
                    )}

                    {/* Bottom Row */}
                    <div className="lead-bottom-row">
                      <div className="lead-tags">
                        <span className="tag-pill">{lead.service}</span>
                        {lead.budget && <span className="tag-pill">Budget: {lead.budget}</span>}
                        {lead.site_visit_date && (
                          <span className="tag-pill" style={{ color: 'var(--accent-2)', borderColor: 'rgba(79,184,168,0.3)' }}>
                            <Calendar size={11} style={{ display: 'inline', marginRight: '3px' }} />
                            Visit: {lead.site_visit_date}
                          </span>
                        )}
                      </div>

                      <div className="lead-btns">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-whatsapp btn-sm"
                          title="Chat on WhatsApp with client"
                        >
                          <MessageSquare size={13} /> WhatsApp
                        </a>

                        <a
                          href={`tel:${cleanPhone}`}
                          className="btn btn-secondary btn-sm"
                          title="Direct phone call"
                        >
                          <Phone size={13} /> Call
                        </a>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditingLead(lead)}
                        >
                          Update / Move
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* JUNE AI FLOATING WORKSPACE */}
      <JuneWorkspace
        isOpen={isJuneOpen}
        onClose={() => setIsJuneOpen(false)}
        onLeadModified={refreshLeads}
      />

      {/* ADD LEAD MODAL */}
      {isAddOpen && (
        <div className="modal-overlay" onClick={() => setIsAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAddLeadSubmit}>
              <div className="modal-header">
                <div className="modal-title">Record New Customer Lead</div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAddOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patel"
                      className="form-input"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9825012345"
                      className="form-input"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City / Area</label>
                    <input
                      type="text"
                      placeholder="e.g. Satellite, Ahmedabad"
                      className="form-input"
                      value={newCityArea}
                      onChange={(e) => setNewCityArea(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service Required</label>
                    <select
                      className="form-select"
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                    >
                      <option>Modular Kitchen</option>
                      <option>Wardrobes & Storage</option>
                      <option>Aluminium & Glass Partitions</option>
                      <option>Office & Showroom Furniture</option>
                      <option>PVC Cabinets & Panels</option>
                      <option>Full Home Interior</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Initial Stage</label>
                    <select
                      className="form-select"
                      value={newStage}
                      onChange={(e) => setNewStage(e.target.value as LeadStage)}
                    >
                      {LEAD_STAGES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lead Source</label>
                    <select
                      className="form-select"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                    >
                      <option>Phone Call</option>
                      <option>WhatsApp</option>
                      <option>Website Lead</option>
                      <option>Walk-in</option>
                      <option>Referral</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--accent-light)' }}>
                    Next Action * (What needs to be done next?)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Call to schedule site visit for measurement"
                    className="form-input"
                    value={newNextAction}
                    onChange={(e) => setNewNextAction(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Next Follow-up Date *</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={newFollowUpDate}
                      onChange={(e) => setNewFollowUpDate(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNewFollowUpDate(today)}>Today</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNewFollowUpDate(getOffsetDateString(1))}>Tomorrow</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNewFollowUpDate(getOffsetDateString(3))}>+3 Days</button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estimated Budget</label>
                    <input
                      type="text"
                      placeholder="e.g. ₹2.5 Lakh"
                      className="form-input"
                      value={newBudget}
                      onChange={(e) => setNewBudget(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes & Requirements</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. L-shaped layout, matte acrylic finish, client available after 6 PM"
                    className="form-textarea"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save New Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / DETAIL LEAD MODAL */}
      {editingLead && (
        <div className="modal-overlay" onClick={() => setEditingLead(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleEditLeadSave}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">Update Lead: {editingLead.customer_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Phone: {editingLead.phone} · Created: {editingLead.created_at.slice(0, 10)}
                  </div>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingLead(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body">
                {/* Stage Progression Selector */}
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--accent)' }}>
                    Current Pipeline Stage
                  </label>
                  <select
                    className="form-select"
                    style={{ fontWeight: 700, fontSize: '14px', background: 'var(--panel-2)' }}
                    value={editingLead.stage}
                    onChange={(e) => setEditingLead({ ...editingLead, stage: e.target.value as LeadStage })}
                  >
                    {LEAD_STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Next Action & Follow-up (Core Requirement) */}
                <div className="form-group" style={{ background: 'rgba(224,123,57,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(224,123,57,0.3)' }}>
                  <label className="form-label" style={{ color: 'var(--accent-light)' }}>
                    Next Action * (Mandatory for active follow-up)
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editingLead.next_action || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, next_action: e.target.value })}
                  />

                  <div style={{ marginTop: '8px' }}>
                    <label className="form-label">Next Follow-up Date *</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={editingLead.next_follow_up_date || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, next_follow_up_date: e.target.value })}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingLead({ ...editingLead, next_follow_up_date: today })}>Today</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingLead({ ...editingLead, next_follow_up_date: getOffsetDateString(1) })}>Tomorrow</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingLead({ ...editingLead, next_follow_up_date: getOffsetDateString(3) })}>+3 Days</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingLead({ ...editingLead, next_follow_up_date: getOffsetDateString(7) })}>+1 Week</button>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Quotation Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 280000"
                      className="form-input"
                      value={editingLead.quote_amount || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, quote_amount: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Site Visit Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editingLead.site_visit_date || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, site_visit_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Area / Location</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingLead.city_area || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, city_area: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service</label>
                    <select
                      className="form-select"
                      value={editingLead.service || 'Modular Kitchen'}
                      onChange={(e) => setEditingLead({ ...editingLead, service: e.target.value })}
                    >
                      <option>Modular Kitchen</option>
                      <option>Wardrobes & Storage</option>
                      <option>Aluminium & Glass Partitions</option>
                      <option>Office & Showroom Furniture</option>
                      <option>PVC Cabinets & Panels</option>
                      <option>Full Home Interior</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Work Notes & Discussion Log</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    value={editingLead.notes || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteLead(editingLead.id)}
                >
                  Delete Lead
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingLead(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
