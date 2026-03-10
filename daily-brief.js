import Anthropic from '@anthropic-ai/sdk';
import nodemailer from 'nodemailer';
import fs from 'fs';
import 'dotenv/config';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── LOAD CLIENTS ───────────────────────────────────────
const CLIENTS = JSON.parse(fs.readFileSync('./clients.json', 'utf8'));

// ── TAVILY SEARCH ──────────────────────────────────────
async function tavilySearch(query) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'advanced',
      include_answer: true,
      max_results: 5,
      exclude_domains: ['reddit.com', 'quora.com']
    })
  });
  const d = await res.json();
  if (!d.answer) return `No results for: ${query}`;
  return d.answer + '\n' + (d.results || [])
    .map(r => `• ${r.title}: ${r.content?.slice(0, 250)}`)
    .join('\n');
}

// ── RESEARCH SWEEP ─────────────────────────────────────
async function research(client) {
  const queries = [
    `${client.company} latest news ${new Date().getFullYear()}`,
    `${client.competitors.join(' OR ')} latest news India`,
    `${client.sector} market trends India latest`,
    `${client.watchTopics.join(' ')} latest news`,
    `India B2B SaaS startup funding news this week`,
  ];

  console.log(`   📡 Running ${queries.length} research queries for ${client.name}...`);
  const results = await Promise.all(queries.map(q => tavilySearch(q)));
  return results
    .map((r, i) => `[QUERY: ${queries[i]}]\n${r}`)
    .join('\n\n---\n\n');
}

// ── CLAUDE SYNTHESIS ───────────────────────────────────
async function synthesize(client, rawResearch) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const msg = await claude.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1500,
    system: `You are a private strategic intelligence analyst for elite founder clients.
You write with surgical precision — no corporate speak, no filler, maximum signal per word.
You know your client deeply:
- Name: ${client.name}
- Company: ${client.company}
- Sector: ${client.sector}
- Current priorities: ${client.priorities.join(', ')}
- Key competitors: ${client.competitors.join(', ')}
Every sentence must earn its place. Write like you have 5 minutes with a CEO.`,

    messages: [{
      role: 'user',
      content: `Today is ${today}. Synthesize this research into the Morning Intelligence Brief.

REQUIRED FORMAT — follow exactly, no deviations:

━━━ SOVEREIGN BRIEF ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATE: ${today}
CLIENT: ${client.name} · ${client.company}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▸ COMPETITIVE SIGNAL
[ONE competitor doing something RIGHT NOW that matters to ${client.company}. Name the competitor. Name the move. Why it matters. Max 3 sentences. Skip if nothing real today — do not fabricate.]

▸ MARKET PULSE
[One real market movement with a specific data point. 2 sentences. Must be specific, not generic.]

▸ REGULATORY / MACRO WATCH
[One India-specific regulatory or macro signal relevant to ${client.sector}. 1 sentence. Write "Nothing material today." if nothing real.]

▸ PEOPLE INTELLIGENCE
[Key hire, exit, or move in their ecosystem worth knowing. 1 sentence. Write "Nothing material today." if nothing real.]

▸ SIGNAL OF THE DAY
[One early-warning indicator — something small today that could be significant in 30–90 days. Be specific about the escalation path.]

▸ YOUR QUESTION FOR TODAY
[One sharp, specific, slightly uncomfortable strategic question ${client.name} should be sitting with today. Make it relevant to their priorities: ${client.priorities[0]}.]

━━━ INTELLIGENCE LEVEL: [LOW / MODERATE / HIGH] ━━━━━━━━

INTELLIGENCE LEVEL GUIDE:
- HIGH = competitor made a major move, funding happened, regulatory change
- MODERATE = meaningful signals but no single major event  
- LOW = quiet day, routine monitoring

Raw research data:
${rawResearch}`
    }]
  });

  return msg.content[0].text;
}

// ── EMAIL DELIVERY ─────────────────────────────────────
async function deliverBrief(client, brief) {
  // While Zoho DNS is propagating, this sends to YOUR review email
  // Once Zoho is live, change 'to' to client.email and remove review step

  if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_PASSWORD) {
    // Zoho not ready yet — just log the brief
    console.log('\n' + '═'.repeat(60));
    console.log(brief);
    console.log('═'.repeat(60));
    console.log(`\n→ [ZOHO NOT CONFIGURED] Would deliver to: ${client.email}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtppro.zoho.in',
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_EMAIL,
      pass: process.env.ZOHO_PASSWORD
    }
  });

  // Send to YOUR email first for review, then you forward to client
  await transporter.sendMail({
    from: `"Sovereign Intelligence" <${process.env.ZOHO_EMAIL}>`,
    to: process.env.YOUR_REVIEW_EMAIL,
    subject: `[REVIEW → ${client.name}] Sovereign Brief — ${new Date().toLocaleDateString('en-IN')}`,
    text: brief + `\n\n${'─'.repeat(40)}\nForward to: ${client.email}\nClient: ${client.name} · ${client.company}`,
    html: `<pre style="font-family:monospace;font-size:13px;line-height:1.7;background:#0C0C0F;color:#E8E6F0;padding:24px;">${brief}</pre>
           <p style="font-family:monospace;font-size:11px;color:#666;margin-top:16px;">
             Forward to: ${client.email} · ${client.name} · ${client.company}
           </p>`
  });

  console.log(`   📧 Review email sent for ${client.name} → ${process.env.YOUR_REVIEW_EMAIL}`);
}

// ── MAIN RUNNER ────────────────────────────────────────
export async function runAllBriefs() {
  console.log(`\n🔍 Running briefs for ${CLIENTS.length} client(s)...`);

  for (const client of CLIENTS) {
    try {
      console.log(`\n⚙️  Processing: ${client.name} (${client.company})`);
      const rawResearch = await research(client);
      const brief = await synthesize(client, rawResearch);
      await deliverBrief(client, brief);
      console.log(`✅ Done: ${client.name}`);

      // Rate limit buffer between clients
      if (CLIENTS.indexOf(client) < CLIENTS.length - 1) {
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (e) {
      console.error(`❌ Failed for ${client.name}:`, e.message);
    }
  }

  console.log('\n✅ All briefs processed.\n');
}

// ── DIRECT RUN (node daily-brief.js) ──────────────────
// Runs immediately if called directly, not as a module import
const isMain = process.argv[1]?.endsWith('daily-brief.js');
if (isMain) {
  runAllBriefs().catch(console.error);
}
