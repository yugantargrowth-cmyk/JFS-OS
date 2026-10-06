import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  insertWorkspaceRecord,
  listWorkspaceRecords,
  deleteWorkspaceRecord,
  isSupabaseConfigured
} from '../lib/supabase';
import { getVapidPublicKey } from '../lib/push';

function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: return public key
  if (req.method === 'GET') {
    const publicKey = getVapidPublicKey();
    return res.status(200).json({ success: true, publicKey });
  }

  // POST: save subscription
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const subscription = body.subscription || body;

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ success: false, error: 'Invalid push subscription payload' });
      }

      if (!isSupabaseConfigured()) {
        return res.status(200).json({
          success: true,
          message: 'Push subscription received (database storage skipped: Supabase not configured).'
        });
      }

      // Check if already stored to avoid duplicate rows
      const existing = await listWorkspaceRecords('push_subscriptions', 200);
      const found = existing.find((s) => (s.subscription?.endpoint || s.endpoint) === subscription.endpoint);

      if (found) {
        return res.status(200).json({ success: true, message: 'Push subscription already active', id: found.id });
      }

      const record = await insertWorkspaceRecord('push_subscriptions', {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        endpoint: subscription.endpoint,
        subscription,
        user_agent: req.headers['user-agent'] || '',
        created_at: new Date().toISOString()
      });

      return res.status(201).json({ success: true, message: 'Push subscription activated', id: record.id });
    } catch (err: any) {
      console.error('[API /api/push/subscribe POST error]:', err);
      return res.status(500).json({ success: false, error: err.message || 'Error saving push subscription' });
    }
  }

  // DELETE: remove subscription
  if (req.method === 'DELETE') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const endpoint = body?.endpoint || req.query.endpoint;

      if (!endpoint || !isSupabaseConfigured()) {
        return res.status(200).json({ success: true });
      }

      const existing = await listWorkspaceRecords('push_subscriptions', 200);
      const matches = existing.filter((s) => (s.subscription?.endpoint || s.endpoint) === endpoint);

      for (const m of matches) {
        await deleteWorkspaceRecord('push_subscriptions', m.id);
      }

      return res.status(200).json({ success: true, message: 'Push subscription removed' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
