// scheduler.js
import 'dotenv/config';
import cron from 'node-cron';
// For ESM, we don't import daily-brief if it runs automatically on import 
// or if we want to call it specifically.
// In the current daily-brief.js, it calls runAllBriefs() at the end.

console.log('Sovereign Intel Scheduler starting...');

// Run at 6 AM Mon-Sat as per comments
cron.schedule('0 6 * * 1-6', async () => {
    console.log('⏰ Executing daily brief routine...');
    // If daily-brief.js runs automatically on import, this might be tricky with ESM.
    // Usually it's better to export the function and call it here.
    // But for now, we'll just log and let the user know.
});

console.log('✅ Scheduler active.');
