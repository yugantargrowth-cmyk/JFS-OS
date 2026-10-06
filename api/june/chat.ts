import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  listWorkspaceRecords,
  getWorkspaceRecord,
  updateWorkspaceRecord,
  insertWorkspaceRecord,
  getSingleton,
  isSupabaseConfigured
} from '../lib/supabase';

function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const DEFAULT_JFS_KNOWLEDGE = {
  business_name: 'Jangid Furniture Studio',
  founded: '2014 by Ashutosh Jangid',
  location: 'Ahmedabad, Gujarat, India',
  phone: '+91 97144 61172',
  email: 'jangidfurniturestudio@gmail.com',
  services: [
    'Modular Kitchen (L-Shape, U-Shape, Parallel, Acrylic, Membrane finishes)',
    'Wardrobes & Storage (Sliding, Hinged, Walk-in, floor-to-ceiling)',
    'Aluminium & Glass Partitions (Corporate cabins, 10mm toughened glass, slim black profile)',
    'Office & Showroom Furniture (Workstations, reception desks, MD cabins)',
    'PVC Cabinets & Panels (100% waterproof vanity and utility units)',
    'Full Home Interior'
  ],
  pipeline_stages: [
    'Lead', 'Contact', 'Qualify', 'Site Visit', 'Requirement',
    'Quotation', 'Follow-up', 'Negotiation', 'WON', 'Installation',
    'Referral', 'Lost'
  ],
  standard_operating_rules: [
    'Free site measurement in Ahmedabad',
    'Quotation turnaround: 24-48 hours after site visit',
    'Every active lead must have a specific Next Action and Next Follow-up Date',
    'Payment terms: 40% advance on confirmation, 50% on factory material dispatch, 10% on handover completion'
  ]
};

// Available Tools for June
const JUNE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_leads',
      description: 'Search leads by customer name, phone number, city area, or service.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Name, phone number, or keywords to search for' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_lead_details',
      description: 'Get full details of a specific lead by its ID or phone number.',
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'Unique ID of the lead' }
        },
        required: ['lead_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_dashboard_summary',
      description: 'Get high-level summary of lead counts across pipeline stages, overdue follow-ups, and quotation value.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_followups',
      description: "Get list of leads due for follow-up today or overdue.",
      parameters: {
        type: 'object',
        properties: {
          filter: { type: 'string', enum: ['today', 'overdue', 'all_active'], description: 'Follow-up filter' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_lead_status',
      description: 'Update the pipeline stage of an unambiguous lead record.',
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'Lead ID to update' },
          stage: {
            type: 'string',
            enum: ['Lead', 'Contact', 'Qualify', 'Site Visit', 'Requirement', 'Quotation', 'Follow-up', 'Negotiation', 'WON', 'Installation', 'Referral', 'Lost'],
            description: 'New stage for the lead'
          },
          next_action: { type: 'string', description: 'Optional next action description' },
          next_follow_up_date: { type: 'string', description: 'Next follow-up date in YYYY-MM-DD format' }
        },
        required: ['lead_id', 'stage']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_note',
      description: 'Add a dated note or discussion log to a lead.',
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'Lead ID' },
          note: { type: 'string', description: 'Note content to append' }
        },
        required: ['lead_id', 'note']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_lead',
      description: 'Update quote amount, site visit date, or contact details of an unambiguous lead.',
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'Lead ID' },
          quote_amount: { type: 'number', description: 'Quote amount in INR' },
          site_visit_date: { type: 'string', description: 'Site visit date YYYY-MM-DD' },
          next_action: { type: 'string', description: 'Next action' },
          next_follow_up_date: { type: 'string', description: 'Next follow-up date YYYY-MM-DD' },
          city_area: { type: 'string', description: 'Area / location' }
        },
        required: ['lead_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_partners',
      description: 'List registered trade and contractor partners.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'assign_partner',
      description: 'Assign a trade partner to a lead.',
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'Lead ID' },
          partner_id: { type: 'string', description: 'Partner ID' },
          partner_name: { type: 'string', description: 'Partner Name' }
        },
        required: ['lead_id', 'partner_name']
      }
    }
  }
];

// Tool Executor against authoritative database
async function executeToolCall(toolName: string, args: any, user: string): Promise<any> {
  const todayStr = new Date().toISOString().slice(0, 10);

  if (toolName === 'search_leads') {
    const q = (args.query || '').toLowerCase().trim();
    if (!q) return { count: 0, matches: [] };

    const allLeads = await listWorkspaceRecords('leads', 500);
    const matches = allLeads.filter((l) => {
      const name = (l.customer_name || '').toLowerCase();
      const phone = (l.phone || '').toLowerCase();
      const area = (l.city_area || '').toLowerCase();
      const srv = (l.service || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || area.includes(q) || srv.includes(q);
    });

    return {
      count: matches.length,
      matches: matches.map((m) => ({
        id: m.id,
        customer_name: m.customer_name,
        phone: m.phone,
        city_area: m.city_area,
        service: m.service,
        stage: m.stage,
        next_action: m.next_action,
        next_follow_up_date: m.next_follow_up_date,
        quote_amount: m.quote_amount
      }))
    };
  }

  if (toolName === 'get_lead_details') {
    const lead = await getWorkspaceRecord('leads', args.lead_id);
    if (!lead) return { error: `No lead found with ID ${args.lead_id}` };
    return lead;
  }

  if (toolName === 'get_dashboard_summary') {
    const leads = await listWorkspaceRecords('leads', 500);
    let todayFollowups = 0;
    let overdueFollowups = 0;
    let pipelineValue = 0;
    let wonRevenue = 0;
    const stageBreakdown: Record<string, number> = {};

    for (const l of leads) {
      const st = l.stage || 'Lead';
      stageBreakdown[st] = (stageBreakdown[st] || 0) + 1;

      if (['Quotation', 'Follow-up', 'Negotiation'].includes(st)) {
        if (l.quote_amount) pipelineValue += Number(l.quote_amount);
      }
      if (['WON', 'Installation', 'Referral'].includes(st)) {
        if (l.quote_amount) wonRevenue += Number(l.quote_amount);
      }

      if (st !== 'WON' && st !== 'Lost' && st !== 'Referral') {
        if (l.next_follow_up_date === todayStr) todayFollowups++;
        else if (l.next_follow_up_date && l.next_follow_up_date < todayStr) overdueFollowups++;
      }
    }

    return {
      total_leads: leads.length,
      today_followups: todayFollowups,
      overdue_followups: overdueFollowups,
      quotation_pipeline_inr: pipelineValue,
      won_revenue_inr: wonRevenue,
      stage_breakdown: stageBreakdown
    };
  }

  if (toolName === 'get_followups') {
    const leads = await listWorkspaceRecords('leads', 500);
    const filter = args.filter || 'all_active';

    const active = leads.filter((l) => l.stage !== 'WON' && l.stage !== 'Lost' && l.stage !== 'Referral');
    let results: any[] = [];

    if (filter === 'today') {
      results = active.filter((l) => l.next_follow_up_date === todayStr);
    } else if (filter === 'overdue') {
      results = active.filter((l) => l.next_follow_up_date && l.next_follow_up_date < todayStr);
    } else {
      results = active.filter((l) => l.next_follow_up_date && l.next_follow_up_date <= todayStr);
    }

    return {
      count: results.length,
      leads: results.map((l) => ({
        id: l.id,
        customer_name: l.customer_name,
        phone: l.phone,
        stage: l.stage,
        next_action: l.next_action,
        next_follow_up_date: l.next_follow_up_date,
        is_overdue: l.next_follow_up_date < todayStr
      }))
    };
  }

  if (toolName === 'update_lead_status') {
    const existing = await getWorkspaceRecord('leads', args.lead_id);
    if (!existing) return { error: `Lead ${args.lead_id} not found.` };

    const oldStage = existing.stage;
    const patch: any = {
      stage: args.stage,
      updated_at: new Date().toISOString()
    };
    if (args.next_action) patch.next_action = args.next_action;
    if (args.next_follow_up_date) patch.next_follow_up_date = args.next_follow_up_date;

    const updated = await updateWorkspaceRecord('leads', args.lead_id, patch);

    // Audit log
    await insertWorkspaceRecord('june_actions', {
      user: user || 'Owner',
      action: 'update_lead_status',
      lead_id: args.lead_id,
      customer_name: existing.customer_name,
      old_stage: oldStage,
      new_stage: args.stage,
      timestamp: new Date().toISOString(),
      result: 'success'
    });

    await insertWorkspaceRecord('activity_log', {
      type: 'june_update_stage',
      message: `June moved ${existing.customer_name} from ${oldStage} to ${args.stage}.`,
      lead_id: args.lead_id,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      lead_id: args.lead_id,
      customer_name: existing.customer_name,
      old_stage: oldStage,
      new_stage: args.stage,
      next_action: updated?.next_action,
      next_follow_up_date: updated?.next_follow_up_date
    };
  }

  if (toolName === 'add_note') {
    const existing = await getWorkspaceRecord('leads', args.lead_id);
    if (!existing) return { error: `Lead ${args.lead_id} not found.` };

    const datePrefix = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const formattedNote = `[${datePrefix} - June]: ${args.note}`;
    const newNotes = existing.notes ? `${existing.notes}\n${formattedNote}` : formattedNote;

    await updateWorkspaceRecord('leads', args.lead_id, {
      notes: newNotes,
      updated_at: new Date().toISOString()
    });

    await insertWorkspaceRecord('june_actions', {
      user: user || 'Owner',
      action: 'add_note',
      lead_id: args.lead_id,
      customer_name: existing.customer_name,
      note: args.note,
      timestamp: new Date().toISOString(),
      result: 'success'
    });

    return { success: true, message: `Note added to ${existing.customer_name}.` };
  }

  if (toolName === 'update_lead') {
    const existing = await getWorkspaceRecord('leads', args.lead_id);
    if (!existing) return { error: `Lead ${args.lead_id} not found.` };

    const patch: any = { updated_at: new Date().toISOString() };
    if (args.quote_amount !== undefined) patch.quote_amount = Number(args.quote_amount);
    if (args.site_visit_date) patch.site_visit_date = args.site_visit_date;
    if (args.next_action) patch.next_action = args.next_action;
    if (args.next_follow_up_date) patch.next_follow_up_date = args.next_follow_up_date;
    if (args.city_area) patch.city_area = args.city_area;

    const updated = await updateWorkspaceRecord('leads', args.lead_id, patch);

    await insertWorkspaceRecord('june_actions', {
      user: user || 'Owner',
      action: 'update_lead',
      lead_id: args.lead_id,
      customer_name: existing.customer_name,
      changes: patch,
      timestamp: new Date().toISOString(),
      result: 'success'
    });

    return { success: true, updated };
  }

  if (toolName === 'get_partners') {
    const partners = await listWorkspaceRecords('partners', 100);
    return { count: partners.length, partners };
  }

  if (toolName === 'assign_partner') {
    const existing = await getWorkspaceRecord('leads', args.lead_id);
    if (!existing) return { error: `Lead ${args.lead_id} not found.` };

    const updated = await updateWorkspaceRecord('leads', args.lead_id, {
      partner_id: args.partner_id || '',
      partner_name: args.partner_name,
      updated_at: new Date().toISOString()
    });

    await insertWorkspaceRecord('june_actions', {
      user: user || 'Owner',
      action: 'assign_partner',
      lead_id: args.lead_id,
      customer_name: existing.customer_name,
      partner_name: args.partner_name,
      timestamp: new Date().toISOString(),
      result: 'success'
    });

    return { success: true, lead_id: args.lead_id, partner_name: args.partner_name };
  }

  return { error: `Unknown tool: ${toolName}` };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const message = (body.message || '').trim();
    const conversationId = body.conversation_id || `conv_${Date.now()}`;
    const user = body.user || 'Owner';

    if (!message) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'Groq API Key is not configured on the server. Please add GROQ_API_KEY in Vercel environment variables.'
      });
    }

    // Retrieve shared business knowledge
    const knowledge = await getSingleton('knowledge', DEFAULT_JFS_KNOWLEDGE);

    // Retrieve conversation history from database
    let pastMessages: any[] = [];
    if (isSupabaseConfigured()) {
      try {
        const chats = await listWorkspaceRecords('june_chat', 40);
        pastMessages = chats
          .filter((c) => c.conversation_id === conversationId)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .slice(-10); // Last 10 turns
      } catch (chatFetchErr) {
        console.warn('Error reading chat history:', chatFetchErr);
      }
    }

    const systemPrompt = `You are JUNE, the senior operations and sales partner AI for Jangid Furniture Studio (Ahmedabad, Gujarat).
Your role is to help the business owner manage incoming inquiries, track quotations, schedule site visits, and push leads through the sales pipeline.

KEY DIRECTIVES:
1. TRUTHFUL & ACCURATE: Never fabricate data. Distinguish retrieved database facts from assumptions. If data is missing or unretrieved, say so explicitly.
2. AMBIGUITY SAFETY: When asked to update, move, or modify a lead (e.g. "move Ramesh to Site Visit"):
   - Call 'search_leads' first.
   - If MULTIPLE leads match (e.g. 2 different Ramesh records), DO NOT guess. List all matching leads with their phone/area/stage and ask the user to clarify which one they want to update.
   - If exactly ONE lead matches unambiguously, execute the action immediately using the appropriate tool.
3. CONCISE & OPERATIONAL: Keep responses clear, business-like, and professional. Confirm actions with exact details of what changed.
4. JFS KNOWLEDGE:
   - Business: ${knowledge.business_name} (Founded ${knowledge.founded})
   - Location: ${knowledge.location} | Phone: ${knowledge.phone}
   - Services: ${JSON.stringify(knowledge.services)}
   - Standard Stages: ${JSON.stringify(knowledge.pipeline_stages)}
   - Rules: ${JSON.stringify(knowledge.standard_operating_rules)}`;

    // Build OpenAI-compatible message array
    const messagesPayload: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    for (const pm of pastMessages) {
      messagesPayload.push({
        role: pm.role === 'user' ? 'user' : 'assistant',
        content: pm.content
      });
    }

    messagesPayload.push({ role: 'user', content: message });

    // Call Groq API with gpt-oss-120b (or fallback model)
    const primaryModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const fallbackModel = 'llama-3.3-70b-versatile';

    let groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: primaryModel,
        messages: messagesPayload,
        tools: JUNE_TOOLS,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 1500
      })
    });

    // Fallback if primary model ID is not available on user tier
    if (!groqRes.ok && primaryModel !== fallbackModel) {
      console.warn(`Groq primary model ${primaryModel} returned status ${groqRes.status}. Retrying with fallback ${fallbackModel}...`);
      groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: fallbackModel,
          messages: messagesPayload,
          tools: JUNE_TOOLS,
          tool_choice: 'auto',
          temperature: 0.2,
          max_tokens: 1500
        })
      });
    }

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Groq API error (${groqRes.status}): ${errText}`);
    }

    const groqData = await groqRes.json();
    const responseMessage = groqData.choices?.[0]?.message;

    if (!responseMessage) {
      throw new Error('Empty response received from Groq model.');
    }

    const actionsExecuted: any[] = [];

    // Handle tool calls if the model invoked tools
    if (responseMessage.tool_calls && Array.isArray(responseMessage.tool_calls)) {
      messagesPayload.push(responseMessage);

      for (const tc of responseMessage.tool_calls) {
        const fnName = tc.function.name;
        let fnArgs = {};
        try {
          fnArgs = JSON.parse(tc.function.arguments || '{}');
        } catch {}

        const toolResult = await executeToolCall(fnName, fnArgs, user);
        actionsExecuted.push({ tool: fnName, arguments: fnArgs, result: toolResult });

        messagesPayload.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: fnName,
          content: JSON.stringify(toolResult)
        });
      }

      // Second round-trip to let model synthesize answer after tools
      const secondRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: primaryModel,
          messages: messagesPayload,
          temperature: 0.2,
          max_tokens: 1500
        })
      });

      if (secondRes.ok) {
        const secondData = await secondRes.json();
        const finalReply = secondData.choices?.[0]?.message?.content || 'Action executed successfully.';

        // Persist conversation
        if (isSupabaseConfigured()) {
          try {
            await insertWorkspaceRecord('june_chat', {
              conversation_id: conversationId,
              role: 'user',
              content: message,
              created_at: new Date().toISOString()
            });
            await insertWorkspaceRecord('june_chat', {
              conversation_id: conversationId,
              role: 'assistant',
              content: finalReply,
              actions: actionsExecuted,
              created_at: new Date().toISOString()
            });
          } catch {}
        }

        return res.status(200).json({
          reply: finalReply,
          conversation_id: conversationId,
          actionsExecuted
        });
      }
    }

    const reply = responseMessage.content || 'I have reviewed the workspace.';

    // Persist conversation
    if (isSupabaseConfigured()) {
      try {
        await insertWorkspaceRecord('june_chat', {
          conversation_id: conversationId,
          role: 'user',
          content: message,
          created_at: new Date().toISOString()
        });
        await insertWorkspaceRecord('june_chat', {
          conversation_id: conversationId,
          role: 'assistant',
          content: reply,
          actions: actionsExecuted,
          created_at: new Date().toISOString()
        });
      } catch {}
    }

    return res.status(200).json({
      reply,
      conversation_id: conversationId,
      actionsExecuted
    });

  } catch (err: any) {
    console.error('[API /api/june/chat error]:', err);
    return res.status(500).json({
      error: err.message || 'Error processing June chat request.'
    });
  }
}
