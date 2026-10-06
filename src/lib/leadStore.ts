import { Lead, LeadStage, HubSettings } from './types';

const LEADS_STORAGE_KEY = 'jfs_leads_v2';
const SETTINGS_STORAGE_KEY = 'jfs_hub_settings_v2';

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOffsetDateString(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEFAULT_SETTINGS: HubSettings = {
  businessName: 'Jangid Furniture Studio',
  ownerPhone: '+919714461172',
  pushNotificationsEnabled: false
};

const INITIAL_SAMPLE_LEADS: Lead[] = [
  {
    id: 'lead-001',
    customer_name: 'Rajesh Shah',
    phone: '9825012345',
    email: 'rajesh.shah@gmail.com',
    city_area: 'Satellite, Ahmedabad',
    service: 'Modular Kitchen',
    budget: '₹2.5L - ₹3.5L',
    source: 'Website Lead',
    stage: 'Follow-up',
    next_action: 'Call to review 3D layout options and final finish selection',
    next_follow_up_date: getTodayDateString(),
    quote_amount: 285000,
    site_visit_date: getOffsetDateString(-3),
    notes: 'Acrylic finish L-shaped modular kitchen with Hafele soft-close fittings.',
    created_at: getOffsetDateString(-5),
    updated_at: getTodayDateString()
  },
  {
    id: 'lead-002',
    customer_name: 'Dr. Amit Patel',
    phone: '9898034567',
    city_area: 'Bodakdev, Ahmedabad',
    service: 'Wardrobes & Storage',
    budget: '₹1.8L - ₹2.2L',
    source: 'Referral',
    stage: 'Site Visit',
    next_action: 'Site visit for master bedroom wardrobe laser measurements at 4:30 PM',
    next_follow_up_date: getTodayDateString(),
    site_visit_date: getTodayDateString(),
    notes: 'Floor-to-ceiling sliding wardrobe with bronze tinted mirror panels.',
    created_at: getOffsetDateString(-2),
    updated_at: getTodayDateString()
  },
  {
    id: 'lead-003',
    customer_name: 'Harsh Vardhan',
    phone: '9724089012',
    city_area: 'Prahladnagar, Ahmedabad',
    service: 'Aluminium & Glass Partitions',
    budget: '₹4.0L - ₹5.0L',
    source: 'Website Lead',
    stage: 'Quotation',
    next_action: 'Send revised formal PDF quotation with 10mm toughened glass specs',
    next_follow_up_date: getOffsetDateString(1),
    quote_amount: 420000,
    site_visit_date: getOffsetDateString(-2),
    notes: 'Corporate cabin partitions with slim black aluminium profile frames.',
    created_at: getOffsetDateString(-4),
    updated_at: getOffsetDateString(-1)
  },
  {
    id: 'lead-004',
    customer_name: 'Neha Mehta',
    phone: '9879567890',
    city_area: 'Bopal, Ahmedabad',
    service: 'Modular Kitchen',
    budget: '₹2.0L - ₹2.5L',
    source: 'Website Lead',
    stage: 'Lead',
    next_action: 'First introductory call to understand requirements and offer site visit',
    next_follow_up_date: getOffsetDateString(-1),
    notes: 'Parallel kitchen enquiry from website. Preferred afternoon call.',
    created_at: getOffsetDateString(-2),
    updated_at: getOffsetDateString(-1)
  },
  {
    id: 'lead-005',
    customer_name: 'Manish Panchal',
    phone: '9426055443',
    city_area: 'Navrangpura, Ahmedabad',
    service: 'Office & Showroom Furniture',
    budget: '₹5.5L',
    source: 'Phone Call',
    stage: 'WON',
    next_action: 'Order confirmed with 40% advance; start factory plywood cutting',
    next_follow_up_date: getOffsetDateString(3),
    quote_amount: 550000,
    site_visit_date: getOffsetDateString(-10),
    notes: '12 workstations + MD cabin desk + storage credenzas. Teak veneer finish.',
    created_at: getOffsetDateString(-12),
    updated_at: getOffsetDateString(-2)
  },
  {
    id: 'lead-006',
    customer_name: 'Kiran Desai',
    phone: '9824411223',
    city_area: 'Thaltej, Ahmedabad',
    service: 'PVC Cabinets & Panels',
    budget: '₹90,000',
    source: 'WhatsApp',
    stage: 'Negotiation',
    next_action: 'Negotiate final price including waterproof hardware warranty',
    next_follow_up_date: getTodayDateString(),
    quote_amount: 95000,
    site_visit_date: getOffsetDateString(-4),
    notes: '2 bathroom vanities and utility area moisture-proof PVC cabinets.',
    created_at: getOffsetDateString(-6),
    updated_at: getOffsetDateString(-1)
  }
];

export function getLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_LEADS));
      return INITIAL_SAMPLE_LEADS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_LEADS));
      return INITIAL_SAMPLE_LEADS;
    }
    return parsed;
  } catch (e) {
    console.error('Error reading leads from storage:', e);
    return INITIAL_SAMPLE_LEADS;
  }
}

export function saveLead(leadData: Partial<Lead> & { customer_name: string; phone: string }): Lead {
  const currentLeads = getLeads();
  const now = new Date().toISOString();

  if (leadData.id) {
    // Update existing
    const index = currentLeads.findIndex((l) => l.id === leadData.id);
    if (index !== -1) {
      const updated: Lead = {
        ...currentLeads[index],
        ...leadData,
        updated_at: now
      };
      currentLeads[index] = updated;
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(currentLeads));
      return updated;
    }
  }

  // Create new
  const cleanPhone = leadData.phone.replace(/[^0-9]/g, '').slice(-10);
  const newLead: Lead = {
    id: 'lead-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    customer_name: leadData.customer_name.trim(),
    phone: cleanPhone || leadData.phone.trim(),
    email: leadData.email ? leadData.email.trim() : '',
    city_area: leadData.city_area ? leadData.city_area.trim() : 'Ahmedabad',
    service: leadData.service || 'Modular Kitchen',
    budget: leadData.budget || '',
    source: leadData.source || 'Direct',
    stage: leadData.stage || 'Lead',
    next_action: leadData.next_action || 'Initial phone call to qualify requirement',
    next_follow_up_date: leadData.next_follow_up_date || getTodayDateString(),
    quote_amount: leadData.quote_amount ? Number(leadData.quote_amount) : undefined,
    site_visit_date: leadData.site_visit_date || '',
    notes: leadData.notes || '',
    created_at: now,
    updated_at: now
  };

  const updatedLeads = [newLead, ...currentLeads];
  localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedLeads));

  // Asynchronously broadcast to backend /api/leads if available
  fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newLead)
  }).catch(() => {});

  return newLead;
}

export function deleteLead(leadId: string): void {
  const currentLeads = getLeads();
  const filtered = currentLeads.filter((l) => l.id !== leadId);
  localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(filtered));
}

// Non-destructive live fetch from server API
export async function fetchLiveLeads(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const res = await fetch('/api/leads');
    if (!res.ok) {
      return { success: false, count: 0, error: `Server responded with status ${res.status}` };
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.leads) && data.leads.length > 0) {
      const currentLeads = getLeads();
      const existingMap = new Map<string, Lead>();

      // Index current leads by ID and clean phone
      currentLeads.forEach((l) => {
        existingMap.set(l.id, l);
        const cleanP = l.phone.replace(/[^0-9]/g, '').slice(-10);
        if (cleanP) existingMap.set(`phone_${cleanP}`, l);
      });

      // Non-destructively merge: server records override base fields, but local notes / stage progression preserved
      const mergedList: Lead[] = [];
      const seenIds = new Set<string>();

      for (const serverLead of data.leads) {
        const cleanP = (serverLead.phone || '').replace(/[^0-9]/g, '').slice(-10);
        const localMatch = existingMap.get(serverLead.id) || (cleanP ? existingMap.get(`phone_${cleanP}`) : null);

        const merged: Lead = {
          ...serverLead,
          id: serverLead.id,
          customer_name: serverLead.customer_name || localMatch?.customer_name || 'Customer',
          phone: cleanP || serverLead.phone || localMatch?.phone || '',
          stage: localMatch?.stage || serverLead.stage || 'Lead',
          next_action: localMatch?.next_action || serverLead.next_action || 'Review lead',
          next_follow_up_date: localMatch?.next_follow_up_date || serverLead.next_follow_up_date || getTodayDateString(),
          quote_amount: localMatch?.quote_amount ?? serverLead.quote_amount,
          site_visit_date: localMatch?.site_visit_date || serverLead.site_visit_date || '',
          notes: localMatch?.notes || serverLead.notes || '',
          city_area: serverLead.city_area || localMatch?.city_area || 'Ahmedabad',
          service: serverLead.service || localMatch?.service || 'Modular Kitchen',
          source: serverLead.source || localMatch?.source || 'Website Lead',
          created_at: serverLead.created_at || localMatch?.created_at || new Date().toISOString(),
          updated_at: serverLead.updated_at || localMatch?.updated_at || new Date().toISOString()
        };

        mergedList.push(merged);
        seenIds.add(merged.id);
      }

      // Preserve any purely local leads that haven't synced yet
      for (const localLead of currentLeads) {
        if (!seenIds.has(localLead.id)) {
          mergedList.push(localLead);
        }
      }

      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(mergedList));
      saveHubSettings({ lastSyncedAt: new Date().toISOString() });
      return { success: true, count: mergedList.length };
    }
    return { success: true, count: 0 };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message };
  }
}

export function getHubSettings(): HubSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveHubSettings(patch: Partial<HubSettings>): HubSettings {
  const current = getHubSettings();
  const updated = { ...current, ...patch };
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export interface HubSummary {
  totalLeads: number;
  newLeads: number;
  todayFollowUps: number;
  overdueFollowUps: number;
  siteVisits: number;
  quotations: number;
  wonLeads: number;
  lostLeads: number;
  quotationPipelineValue: number;
  wonRevenue: number;
}

export function calculateSummary(leads: Lead[]): HubSummary {
  const today = getTodayDateString();
  let newLeads = 0;
  let todayFollowUps = 0;
  let overdueFollowUps = 0;
  let siteVisits = 0;
  let quotations = 0;
  let wonLeads = 0;
  let lostLeads = 0;
  let quotationPipelineValue = 0;
  let wonRevenue = 0;

  for (const lead of leads) {
    // Aligns with filter tabs: New Leads includes 'Lead' and 'Contact'
    if (lead.stage === 'Lead' || lead.stage === 'Contact') newLeads++;
    if (lead.stage === 'Site Visit') siteVisits++;
    if (lead.stage === 'Quotation' || lead.stage === 'Follow-up' || lead.stage === 'Negotiation') {
      quotations++;
      if (lead.quote_amount) quotationPipelineValue += Number(lead.quote_amount);
    }
    if (lead.stage === 'WON' || lead.stage === 'Installation' || lead.stage === 'Referral') {
      wonLeads++;
      if (lead.quote_amount) wonRevenue += Number(lead.quote_amount);
    }
    if (lead.stage === 'Lost') {
      lostLeads++;
    }

    // Active leads follow-up status
    if (lead.stage !== 'WON' && lead.stage !== 'Lost' && lead.stage !== 'Referral') {
      const fDate = lead.next_follow_up_date;
      if (fDate) {
        if (fDate === today) {
          todayFollowUps++;
        } else if (fDate < today) {
          overdueFollowUps++;
        }
      }
    }
  }

  return {
    totalLeads: leads.length,
    newLeads,
    todayFollowUps,
    todayFollowUpsVal: todayFollowUps,
    overdueFollowUps,
    siteVisits,
    quotations,
    wonLeads,
    lostLeads,
    quotationPipelineValue,
    wonRevenue
  } as any;
}

export function exportLeadsToCsv(leads: Lead[]): string {
  const headers = [
    'ID',
    'Customer Name',
    'Phone',
    'Email',
    'City Area',
    'Service',
    'Budget',
    'Source',
    'Stage',
    'Next Action',
    'Next Follow-up Date',
    'Quote Amount',
    'Site Visit Date',
    'Notes',
    'Created At'
  ];

  const rows = leads.map((l) => [
    `"${l.id}"`,
    `"${(l.customer_name || '').replace(/"/g, '""')}"`,
    `"${(l.phone || '').replace(/"/g, '""')}"`,
    `"${(l.email || '').replace(/"/g, '""')}"`,
    `"${(l.city_area || '').replace(/"/g, '""')}"`,
    `"${(l.service || '').replace(/"/g, '""')}"`,
    `"${(l.budget || '').replace(/"/g, '""')}"`,
    `"${(l.source || '').replace(/"/g, '""')}"`,
    `"${l.stage}"`,
    `"${(l.next_action || '').replace(/"/g, '""')}"`,
    `"${l.next_follow_up_date || ''}"`,
    l.quote_amount || '',
    `"${l.site_visit_date || ''}"`,
    `"${(l.notes || '').replace(/"/g, '""')}"`,
    `"${l.created_at || ''}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

// Convert urlBase64 to Uint8Array for VAPID subscription
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Web Push Registration Helper
export async function registerPushNotifications(): Promise<{ success: boolean; message: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, message: 'Web Push is not supported by your browser.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, message: 'Notification permission was denied.' };
  }

  try {
    const keyRes = await fetch('/api/push/subscribe');
    if (!keyRes.ok) throw new Error('Could not fetch VAPID key');
    const { publicKey } = await keyRes.json();
    if (!publicKey) throw new Error('No public VAPID key returned');

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    const saveRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription })
    });

    if (!saveRes.ok) throw new Error('Failed to save subscription on server');

    saveHubSettings({ pushNotificationsEnabled: true });
    return { success: true, message: 'Push notifications activated successfully! You will receive an alert whenever a new lead arrives.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error subscribing to notifications' };
  }
}
