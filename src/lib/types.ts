export type LeadStage =
  | 'Lead'
  | 'Contact'
  | 'Qualify'
  | 'Site Visit'
  | 'Requirement'
  | 'Quotation'
  | 'Follow-up'
  | 'Negotiation'
  | 'WON'
  | 'Installation'
  | 'Referral'
  | 'Lost';

export const LEAD_STAGES: LeadStage[] = [
  'Lead',
  'Contact',
  'Qualify',
  'Site Visit',
  'Requirement',
  'Quotation',
  'Follow-up',
  'Negotiation',
  'WON',
  'Installation',
  'Referral',
  'Lost'
];

export interface Lead {
  id: string;
  customer_name: string;
  phone: string;
  email?: string;
  city_area: string;
  service: string;
  budget?: string;
  source: string;
  stage: LeadStage;
  next_action: string;
  next_follow_up_date: string; // YYYY-MM-DD
  quote_amount?: number;
  site_visit_date?: string;
  notes?: string;
  partner_id?: string;
  partner_name?: string;
  created_at: string;
  updated_at: string;
}

export interface HubSettings {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  groqApiKey?: string;
  businessName: string;
  ownerPhone: string;
  lastSyncedAt?: string;
  pushNotificationsEnabled?: boolean;
}
