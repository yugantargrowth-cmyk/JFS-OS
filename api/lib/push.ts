import webpush from 'web-push';
import { listWorkspaceRecords, deleteWorkspaceRecord, isSupabaseConfigured } from './supabase';

const DEFAULT_VAPID_PUBLIC = 'BIonkI-g-lv3BML5ehMI53atzDTG38ZxJjdlavp8ujCvbGr3QCw4FmyadZKFfum9JECdrajMPusHkmZVpWYSS_c';
const DEFAULT_VAPID_PRIVATE = 'nGbmJDj1CkUd5o0QqBMue_qJNNVcRY3kgjtTJj9sDPE';
const DEFAULT_SUBJECT = 'mailto:owner@jangidfurniturestudio.co.in';

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC;
}

export function initWebPush(): void {
  const publicKey = process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC;
  const privateKey = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE;
  const subject = process.env.VAPID_SUBJECT || DEFAULT_SUBJECT;

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  leadId?: string;
}

export async function sendPushToAll(payload: PushNotificationPayload): Promise<{ sent: number; failed: number }> {
  initWebPush();

  if (!isSupabaseConfigured()) {
    console.warn('[Push] Supabase not configured; skipping push delivery.');
    return { sent: 0, failed: 0 };
  }

  let subscriptions: any[] = [];
  try {
    subscriptions = await listWorkspaceRecords('push_subscriptions', 500);
  } catch (err) {
    console.warn('[Push] Error fetching subscriptions:', err);
    return { sent: 0, failed: 0 };
  }

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const notificationString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      url: payload.url || (payload.leadId ? `/?leadId=${payload.leadId}` : '/'),
      leadId: payload.leadId
    }
  });

  let sent = 0;
  let failed = 0;

  for (const subRecord of subscriptions) {
    const sub = subRecord.subscription || subRecord;
    if (!sub || !sub.endpoint) continue;

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys
        },
        notificationString,
        {
          TTL: 60 * 60 * 24 // 24 hours
        }
      );
      sent++;
    } catch (err: any) {
      failed++;
      // If subscription expired or unsubscribed (404, 410 Gone), remove it from database
      if (err.statusCode === 404 || err.statusCode === 410) {
        try {
          await deleteWorkspaceRecord('push_subscriptions', subRecord.id);
        } catch {}
      }
    }
  }

  return { sent, failed };
}
