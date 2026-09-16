import { insertRecord, listRecords, getSettings, getKnowledge, buildSummary, workspaceSnapshot, type JsonRecord } from './store';

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// Pull a name out of a free-text command: "add client Ramesh Furniture", "there's an enquiry from Priya"
function extractName(message: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = message.match(p);
    if (m && m[1]) return m[1].trim().replace(/[.!]+$/, '');
  }
  return null;
}

export type IntentResult = { handled: boolean; reply: string };

/** Direct workspace actions June can perform straight from chat, no model call needed. */
async function tryIntent(raw: string): Promise<IntentResult | null> {
  const message = raw.trim();
  const lower = message.toLowerCase();

  // Add a partner / client
  if (/\b(add|new|create)\b.*\b(partner|client)\b/.test(lower)) {
    const name = extractName(message, [
      /(?:partner|client)\s*(?:named|called)?\s*[:\-]?\s*(.+)$/i,
      /(?:add|new|create)\s+(?:a\s+)?(?:partner|client)\s+(.+)$/i,
    ]);
    if (name) {
      await insertRecord('partners', { name, priority: false });
      return { handled: true, reply: `Done — added **${name}** as a new partner in the directory.` };
    }
  }

  // Add a referral / enquiry
  if (/\b(enquiry|inquiry|referral|lead)\b/.test(lower) && /\b(add|new|there'?s|got|received|log)\b/.test(lower)) {
    const name = extractName(message, [
      /(?:enquiry|inquiry|referral|lead)\s+(?:from|for|by)\s+(.+)$/i,
      /(?:add|log)\s+(?:an?\s+)?(?:enquiry|inquiry|referral|lead)\s+(?:from|for)?\s*(.+)$/i,
    ]);
    if (name) {
      await insertRecord('referrals', { customer_name: name, stage: 'new' });
      return { handled: true, reply: `Got it — logged an enquiry from **${name}** as a new referral.` };
    }
  }

  // Schedule a site visit
  if (/\b(site visit|visit)\b/.test(lower) && /\b(add|schedule|book|new)\b/.test(lower)) {
    const name = extractName(message, [/visit\s+(?:for|with)\s+(.+)$/i]);
    if (name) {
      await insertRecord('site_visits', { customer_name: name, date: new Date().toISOString(), status: 'scheduled' });
      return { handled: true, reply: `Scheduled a site visit for **${name}**. Update the date any time from the Visits tab.` };
    }
  }

  // Log a sale
  if (/\b(sale|sold)\b/.test(lower) && /\b(add|log|new|record)\b/.test(lower)) {
    const nameMatch = message.match(/(?:sale|sold)\s+(?:to|for)\s+([^,]+?)(?:\s+(?:of|for|worth)\s+₹?\s?([\d,]+))?$/i);
    const amountMatch = message.match(/₹\s?([\d,]+)|(?:rs\.?|inr)\s?([\d,]+)/i);
    if (nameMatch?.[1]) {
      const amount = Number((nameMatch[2] || amountMatch?.[1] || amountMatch?.[2] || '0').replace(/,/g, '')) || 0;
      await insertRecord('sales', { customer_name: nameMatch[1].trim(), amount, date: new Date().toISOString() });
      return { handled: true, reply: `Logged a sale for **${nameMatch[1].trim()}**${amount ? ` worth ${fmtINR(amount)}` : ''}.` };
    }
  }

  return null;
}

async function fallbackJune(message: string): Promise<string> {
  const snapshot = await workspaceSnapshot();
  const summary = buildSummary(snapshot.partners, snapshot.referrals, snapshot.visits, snapshot.sales, []);
  const lower = message.toLowerCase();
  if (lower.includes('sale') || lower.includes('revenue')) {
    return `Revenue booked is ${fmtINR(summary.revenue)} across ${summary.sales_count} sale${summary.sales_count === 1 ? '' : 's'}. ${summary.sales_count ? 'Ready for a product or partner breakdown whenever you want it.' : 'Log the first completed sale to start the trend.'}`;
  }
  if (lower.includes('partner')) {
    const priority = snapshot.partners.filter((p: JsonRecord) => Boolean(p.priority)).length;
    return `You have ${summary.partner_count} partner${summary.partner_count === 1 ? '' : 's'} in the directory, including ${priority} priority relationship${priority === 1 ? '' : 's'}. ${summary.open_referrals ? `There are ${summary.open_referrals} open referrals to use as your next touchpoint.` : 'No open referrals attached yet.'}`;
  }
  if (lower.includes('visit') || lower.includes('today') || lower.includes('attention')) {
    return `${summary.today_visits} visit${summary.today_visits === 1 ? '' : 's'} are scheduled today and ${summary.overdue_visits} need attention. ${summary.priorities[0]}`;
  }
  return `${summary.priorities.join('. ')}. I'm in workspace mode right now — add a Groq API key in Settings for fuller answers.`;
}

async function modelJune(message: string): Promise<string> {
  const settings = await getSettings();
  const apiKey = settings.groq_api_key;
  if (!apiKey) return fallbackJune(message);
  const knowledge = await getKnowledge();
  const snapshot = await workspaceSnapshot();
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: settings.model || 'openai/gpt-oss-120b',
      temperature: Number(settings.temperature ?? 0.4),
      max_tokens: Number(settings.max_tokens ?? 2048),
      messages: [
        {
          role: 'system',
          content: `${settings.system_prompt}\nPersonality: ${settings.personality}\nBusiness knowledge: ${JSON.stringify(knowledge)}\nWorkspace snapshot (partners, referrals, visits, sales, tasks): ${JSON.stringify(snapshot)}\nIf asked to add a partner, referral, visit, or sale, tell the user it's already handled automatically by the app when phrased as a direct instruction.`,
        },
        { role: 'user', content: message },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq returned ${res.status}. Check the key in Settings.`);
  const payload = await res.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq returned an empty response.');
  return content as string;
}

export async function askJune(message: string): Promise<string> {
  const intent = await tryIntent(message);
  if (intent?.handled) return intent.reply;
  try {
    return await modelJune(message);
  } catch (e) {
    return `${e instanceof Error ? e.message : 'June could not reach the model.'} Here's what I can tell you from the workspace: ${await fallbackJune(message)}`;
  }
}

export async function loadChatHistory() {
  return listRecords('june_chat');
}
export async function pushChat(role: 'user' | 'assistant', content: string, conversationId: string) {
  return insertRecord('june_chat', { role, content, conversation_id: conversationId }, false);
}
