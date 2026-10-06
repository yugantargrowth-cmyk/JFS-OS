import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  insertWorkspaceRecord,
  listWorkspaceRecords,
  isSupabaseConfigured
} from './lib/supabase';
import { sendPushToAll } from './lib/push';

function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-jfs-client');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

function sanitizeText(str: any): string {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

function cleanIndianPhone(raw: any): string {
  if (!raw) return '';
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.'
      });
    }

    try {
      const limit = Number(req.query.limit) || 100;
      const leads = await listWorkspaceRecords('leads', limit);
      return res.status(200).json({ success: true, leads });
    } catch (err: any) {
      console.error('[API /api/leads GET error]:', err);
      return res.status(500).json({ success: false, error: err.message || 'Error fetching leads' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    const rawName = sanitizeText(body.customer_name || body.name);
    const rawPhone = cleanIndianPhone(body.phone || body.phone_number);
    const rawEmail = sanitizeText(body.email);
    const rawCity = sanitizeText(body.city_area || body.city || 'Ahmedabad');
    const rawService = sanitizeText(body.service || 'Modular Kitchen');
    const rawBudget = sanitizeText(body.budget);
    const rawDate = sanitizeText(body.site_visit_date || body.date || body.preferred_date);
    const rawNotes = sanitizeText(body.notes || body.requirements || body.message);
    const rawSource = sanitizeText(body.source || (body.type === 'visit' ? 'Website - Free Site Visit' : 'Website Lead'));

    // Validation
    if (rawName.length < 2) {
      return res.status(400).json({ success: false, error: 'Please enter a valid full name (minimum 2 characters).' });
    }

    if (!rawPhone || rawPhone.length !== 10 || !/^[6-9]\d{9}$/.test(rawPhone)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const initialStage = body.stage || (rawSource.toLowerCase().includes('visit') || rawDate ? 'Site Visit' : 'Lead');
    const nextAction = initialStage === 'Site Visit'
      ? 'Call customer to confirm site visit measurement appointment'
      : 'Initial phone call to qualify requirement and discuss design';

    // 5-Minute Idempotency / Accidental Duplicate Prevention
    if (isSupabaseConfigured()) {
      try {
        const recentLeads = await listWorkspaceRecords('leads', 20);
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const duplicate = recentLeads.find((l) => {
          if (!l || !l.phone) return false;
          const phoneMatch = cleanIndianPhone(l.phone) === rawPhone;
          const createdTime = new Date(l.created_at || l.timestamp || 0).getTime();
          return phoneMatch && createdTime > fiveMinutesAgo;
        });

        if (duplicate) {
          return res.status(200).json({
            success: true,
            deduplicated: true,
            message: 'Inquiry already received! Our workshop team is reviewing your details and will call you shortly.',
            lead: duplicate
          });
        }
      } catch (dedupErr) {
        console.warn('[API /api/leads] Deduplication check warning:', dedupErr);
      }
    }

    const leadId = `lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newLead = {
      id: leadId,
      customer_name: rawName,
      phone: rawPhone,
      email: rawEmail,
      city_area: rawCity || 'Ahmedabad',
      service: rawService || 'Modular Kitchen',
      budget: rawBudget,
      source: rawSource,
      stage: initialStage,
      next_action: nextAction,
      next_follow_up_date: todayStr,
      site_visit_date: rawDate || '',
      notes: rawNotes,
      created_at: nowIso,
      updated_at: nowIso
    };

    if (isSupabaseConfigured()) {
      await insertWorkspaceRecord('leads', newLead);
      // Also log activity
      try {
        await insertWorkspaceRecord('activity_log', {
          type: 'lead_captured',
          message: `New website lead from ${rawName} (${rawPhone}) for ${rawService}.`,
          lead_id: leadId,
          created_at: nowIso
        });
      } catch {}
    } else {
      console.warn('[API /api/leads] Supabase not connected. Lead generated in-memory mode.');
    }

    // Trigger Web Push phone notification to all JFS-OS users
    try {
      await sendPushToAll({
        title: `New JFS Lead: ${rawName}`,
        body: `${rawService} · ${rawCity} (+91 ${rawPhone})`,
        url: `/?leadId=${leadId}`,
        leadId
      });
    } catch (pushErr) {
      console.warn('[API /api/leads] Push notification delivery notice:', pushErr);
    }

    return res.status(201).json({
      success: true,
      lead: newLead,
      message: 'Inquiry recorded successfully in JFS-OS.'
    });

  } catch (err: any) {
    console.error('[API /api/leads POST error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error recording lead'
    });
  }
}
