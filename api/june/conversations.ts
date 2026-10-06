import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  listWorkspaceRecords,
  deleteWorkspaceRecord,
  isSupabaseConfigured
} from '../lib/supabase';

function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isSupabaseConfigured()) {
    return res.status(200).json({ conversations: [] });
  }

  try {
    if (req.method === 'GET') {
      const records = await listWorkspaceRecords('june_chat', 500);

      const convMap: Record<string, { id: string; title: string; lastMessage: string; updatedAt: string; count: number }> = {};

      for (const msg of records) {
        const cId = msg.conversation_id || 'default';
        if (!convMap[cId]) {
          convMap[cId] = {
            id: cId,
            title: msg.role === 'user' ? (msg.content.slice(0, 40) + '…') : 'Discussion with June',
            lastMessage: msg.content,
            updatedAt: msg.created_at || new Date().toISOString(),
            count: 1
          };
        } else {
          convMap[cId].count++;
          if (new Date(msg.created_at).getTime() > new Date(convMap[cId].updatedAt).getTime()) {
            convMap[cId].updatedAt = msg.created_at;
            convMap[cId].lastMessage = msg.content;
          }
        }
      }

      const list = Object.values(convMap).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      return res.status(200).json({ conversations: list });
    }

    if (req.method === 'DELETE') {
      const convId = req.query.conversation_id as string;
      if (!convId) return res.status(400).json({ error: 'Missing conversation_id parameter' });

      const records = await listWorkspaceRecords('june_chat', 500);
      const matches = records.filter((r) => r.conversation_id === convId);

      for (const m of matches) {
        await deleteWorkspaceRecord('june_chat', m.id);
      }

      return res.status(200).json({ success: true, deleted: matches.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
