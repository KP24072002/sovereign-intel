import cron from 'node-cron';
import http from 'http';
import { runAllBriefs } from './daily-brief.js';
import 'dotenv/config';

console.log('⚡ Sovereign Intelligence Scheduler starting...');

// ── CRON JOBS ──────────────────────────────────────────
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
  console.log(`🗺️ [${new Date().toISOString()}] Running weekly war maps...`);
  // TODO: import and call runWarMaps() once war-map.js is built
}, { timezone: 'UTC' });

// ── KEEP RAILWAY ALIVE ─────────────────────────────────
// Railway kills processes that don't bind to a port.
// This minimal HTTP server keeps the container running.
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: '🟢 operational',
    service: 'Sovereign Intelligence',
    scheduler: 'active',
    jobs: {
      dailyBriefs: 'Mon–Sat 6:00 AM IST (00:30 UTC)',
      warMaps: 'Sunday 7:00 AM IST (01:30 UTC)'
    },
    uptime: `${Math.floor(process.uptime() / 60)} minutes`,
    timestamp: new Date().toISOString()
  }));
}).listen(PORT, () => {
  console.log(`✅ Scheduler active — health check on port ${PORT}`);
  console.log('   Daily briefs: 6:00 AM IST (Mon–Sat)');
  console.log('   War maps:     7:00 AM IST (Sundays)');
});
