const http = require('http');

const data = JSON.stringify({
  updates: [{
    userId: '1e370e28-3e41-4c12-920f-b1e2a53bbdd0', // Let's get LATERZA NICOLA's ID
    date: '2026-05-08',
    type: 'P14',
    overtimeHours: 3,
    serviceDetails: "Test API"
  }]
});

// Wait, I need the session cookie to call the API...
// It's easier to just write a script that directly uses the Next.js API handler? No, easier to just trust my manual DB check.
