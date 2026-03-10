// ══════════════════════════════════════════════════════
// SOVEREIGN INTELLIGENCE — Daily Brief Pipeline
// Run: node daily-brief.js
// Cron: 0 6 * * 1-6  (Mon-Sat at 6AM)
// ══════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import nodemailer from 'nodemailer';
import fs from 'fs';
import 'dotenv/config';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── CLIENT CONFIG ──────────────────────────────────────
// Add each client here. Each entry generates one brief.
const CLIENTS = JSON.parse(fs.readFileSync('./clients.json', 'utf8'));
/* clients.json structure:
[{
  "name": "Rahul Sharma",
  "company": "AcmeSaaS",
  "sector": "B2B HR Tech India",
  "email": "rahul@acmesaas.com",
  "competitors": ["Darwinbox", "Keka", "greytHR"],
  "watchTopics": ["HR tech funding India", "payroll compliance India"],
  "priorities": ["Enterprise expansion", "Series B fundraise"],
  "tier": "sovereign"
}] */

// ── RESEARCH ENGINE ────────────────────────────────────
async function research(client) {
    const queries = [
        `${client.company} latest news developments ${new Date().getFullYear()}`,
        `${client.competitors.join(' OR ')} latest moves India`,
        `${client.sector} market news today`,
        `${client.watchTopics.join(' ')} latest`,
        `India B2B SaaS startup news funding today`,
    ];

    const results = await Promise.all(queries.map(q => tavilySearch(q)));
    return results.map((r, i) => `[QUERY ${i + 1}: ${queries[i]}]\n${r}`).join('\n\n---\n\n');
}

async function tavilySearch(query) {
    const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key: process.env.TAVILY_API_KEY,
            query, search_depth: 'advanced',
            include_answer: true, max_results: 5
        })
    });
    const d = await res.json();
    return d.answer + '\n' + (d.results || []).map(r => `• ${r.title}: ${r.content?.slice(0, 200)}`).join('\n');
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
You write with precision — no corporate speak, no filler, maximum signal.
You know the client deeply: ${client.name}, CEO of ${client.company} (${client.sector}).
Their current priorities: ${client.priorities.join(', ')}.
Key competitors: ${client.competitors.join(', ')}.
Write only what matters. Every sentence must earn its place.`,
        messages: [{
            role: 'user',
            content: `Today is ${today}. Synthesize this research into the Morning Brief.

REQUIRED FORMAT — do not deviate:

━━━ SOVEREIGN BRIEF ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATE: ${today}
CLIENT: ${client.name} · ${client.company}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▸ COMPETITIVE SIGNAL
[What is ONE competitor doing right now that matters? Name the competitor. Name the move. Why it matters to ${client.company}. Max 3 sentences.]

▸ MARKET PULSE
[One real market movement with a data point. 2 sentences.]

▸ REGULATORY / MACRO WATCH
[One India-specific regulatory or macro signal. 1 sentence. Skip if nothing real today.]

▸ PEOPLE INTELLIGENCE
[Any key hire, exit, or move in their ecosystem. 1 sentence. Skip if nothing real.]

▸ SIGNAL OF THE DAY
[One early-warning indicator — something small today that could be big in 30-90 days.]

▸ YOUR QUESTION FOR TODAY
[One sharp, specific question ${client.name} should be sitting with today. Make it uncomfortable.]

━━━ INTELLIGENCE LEVEL: [LOW / MODERATE / HIGH] ━━━━━━

Research data:
${rawResearch}`
        }]
    });
    return msg.content[0].text;
}

// ── EMAIL DELIVERY ─────────────────────────────────────
async function deliverBrief(client, brief) {
    // Sends to YOUR email for review first
    // You review, add one personal note, forward to client
    const transporter = nodemailer.createTransport({
        host: 'smtppro.zoho.in', port: 465, secure: true,
        auth: { user: process.env.ZOHO_EMAIL, pass: process.env.ZOHO_PASSWORD }
    });

    await transporter.sendMail({
        from: `"Sovereign Intelligence" <${process.env.ZOHO_EMAIL}>`,
        to: process.env.YOUR_REVIEW_EMAIL,  // your email for review
        subject: `[REVIEW] ${client.name} Brief — ${new Date().toLocaleDateString('en-IN')}`,
        text: brief + `\n\n---\nForward to: ${client.email}`
    });
}

// ── MAIN RUNNER ────────────────────────────────────────
async function runAllBriefs() {
    console.log(`🔍 Running briefs for ${CLIENTS.length} clients...`);
    for (const client of CLIENTS) {
        try {
            console.log(`Processing: ${client.name}`);
            const research = await research(client);
            const brief = await synthesize(client, research);
            await deliverBrief(client, brief);
            console.log(`✅ Done: ${client.name}`);
            await new Promise(r => setTimeout(r, 3000)); // rate limit buffer
        } catch (e) {
            console.error(`❌ Failed: ${client.name} —`, e.message);
        }
    }
}

runAllBriefs();
