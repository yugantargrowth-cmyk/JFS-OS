import { Lead, LeadStage, HubSettings } from './types';

const LEADS_STORAGE_KEY = 'jfs_leads_v2';
const SETTINGS_STORAGE_KEY = 'jfs_hub_settings_v2';

// Today's ISO date string (YYYY-MM-DD) in local time
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
  googleSheetWebAppUrl: '',
  businessName: 'Jangid Furniture Studio',
  ownerPhone: '+919714461172'
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
    stage: 'Today Follow-up' as any === 'Follow-up' ? 'Follow-up' : 'Follow-up',
    next_action: 'Call to review 3D layout options and final finish selection',
    next_follow_up_date: getTodayDateString(), // Today!
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
    next_follow_up_date: getTodayDateString(), // Today!
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
    next_follow_up_date: getOffsetDateString(1), // Tomorrow
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
    next_follow_up_date: getOffsetDateString(-1), // Overdue!
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
    next_follow_up_date: getTodayDateString(), // Today!
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
  const newLead: Lead = {
    id: 'lead-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    customer_name: leadData.customer_name.trim(),
    phone: leadData.phone.trim(),
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
  return newLead;
}

export function deleteLead(leadId: string): void {
  const currentLeads = getLeads();
  const filtered = currentLeads.filter((l) => l.id !== leadId);
  localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(filtered));
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
    if (lead.stage === 'Lead') newLeads++;
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

    // Active leads check for follow-up status (exclude Won and Lost)
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
    overdueFollowUps,
    siteVisits,
    quotations,
    wonLeads,
    lostLeads,
    quotationPipelineValue,
    wonRevenue
  };
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

export async function syncFromGoogleSheet(url: string): Promise<{ success: boolean; count: number; error?: string }> {
  if (!url || !url.startsWith('http')) {
    return { success: false, count: 0, error: 'Please enter a valid Google Apps Script Web App URL.' };
  }

  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      return { success: false, count: 0, error: `HTTP ${res.status}: Failed to reach Google Sheet` };
    }
    const data = await res.json();
    if (data.status === 'success' && Array.isArray(data.leads)) {
      const mapped: Lead[] = data.leads.map((row: any, idx: number) => {
        return {
          id: row.id || `lead-sheet-${idx}-${Date.now()}`,
          customer_name: row.customer_name || row.name || 'Unknown',
          phone: String(row.phone_number || row.phone || ''),
          email: row.email || '',
          city_area: row.city___area || row.city || 'Ahmedabad',
          service: row.service || 'Modular Kitchen',
          budget: row.budget || '',
          source: row.source || 'Website',
          stage: (row.stage as LeadStage) || 'Lead',
          next_action: row.next_action || 'Review sheet lead',
          next_follow_up_date: row.next_follow_up_date || getTodayDateString(),
          quote_amount: row.quote_amount ? Number(row.quote_amount) : undefined,
          site_visit_date: row.preferred_date || row.site_visit_date || '',
          notes: row.requirements___notes || row.notes || '',
          created_at: row.timestamp || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      if (mapped.length > 0) {
        localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(mapped));
        saveHubSettings({ lastSyncedAt: new Date().toISOString() });
        return { success: true, count: mapped.length };
      } else {
        return { success: true, count: 0 };
      }
    } else {
      return { success: false, count: 0, error: data.message || 'Invalid response from Google Apps Script' };
    }
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Network error syncing with Google Sheet' };
  }
}
