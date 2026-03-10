// scheduler.js
require('dotenv').config();
const cron = require('node-cron');
const dailyBrief = require('./daily-brief');

// Example: run at 9 AM daily
// cron.schedule('0 9 * * *', () => {
//   console.log('Running daily brief...');
//   // dailyBrief.run();
// });
