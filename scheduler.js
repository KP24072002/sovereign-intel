// Your complete scheduler.js — replace entire file with this

import cron from 'node-cron';
import http from 'http';
import { runAllBriefs } from './daily-brief.js';
import 'dotenv/config';

console.log('⚡ Sovereign Intelligence Scheduler starting...');

// Daily brief — 6:00 AM IST = 00:30 UTC (Mon–Sat)
cron.schedule('30 0 * * 1-6', async () => {
  console.log(`🔍 [${new Date().toISOString()}] Running daily briefs...`);
  try {
    await runAllBriefs();
    console.log('✅ All briefs complete');
  } catch (e) {
    console.error('❌ Brief run failed:', e.message);
  }
}, { timezone: 'UTC' });

// War map — Sunday 7:00 AM IST = 01:30 UTC
cron.schedule('30 1 * * 0', async () => {
  console.log(`🗺️ [${new Date().toISOString()}] Running war maps...`);
}, { timezone: 'UTC' });

// ── KEEP RAILWAY ALIVE ──────────────────────────
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: '🟢 operational',
    scheduler: 'active',
    briefs: 'Mon–Sat 6:00 AM IST',
    warMaps: 'Sunday 7:00 AM IST',
    uptime: `${Math.floor(process.uptime() / 60)} minutes`,
    clients: process.env.CLIENT_COUNT || 'configured in clients.json'
  }));
}).listen(PORT, () => {
  console.log(`✅ Scheduler active — health check on port ${PORT}`);
  console.log('   Daily briefs: 6:00 AM IST (Mon–Sat)');
  console.log('   War maps:     7:00 AM IST (Sundays)');
});
```

Commit this → push → Railway redeploys. You should now see:
```
⚡ Sovereign Intelligence Scheduler starting...
✅ Scheduler active — health check on port XXXX
   Daily briefs: 6:00 AM IST (Mon–Sat)
   War maps:     7:00 AM IST (Sundays)
