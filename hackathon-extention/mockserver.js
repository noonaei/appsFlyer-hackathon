// ===================================
// DEBUG: Simple Node.js Mock Server
// ===================================
// Save this as mockServer.js and run: node mockServer.js

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Keep track of all received signals
const receivedSignals = [];

app.post('/api/signals', (req, res) => {
  const body = req.body;
  console.log('\n========================================');
  console.log('📨 RECEIVED POST REQUEST');
  console.log('========================================');
  console.log('Full request body:', JSON.stringify(body, null, 2));
  console.log('========================================\n');

  // Store the signals
  receivedSignals.push({
    timestamp: new Date().toISOString(),
    ...body
  });

  // Send success response
  res.json({
    success: true,
    message: 'Signals received and processed',
    labelsCount: body.labels?.length || 0,
    totalReceived: receivedSignals.length
  });
});

// Endpoint to view all received signals
app.get('/api/signals', (req, res) => {
  res.json({
    totalBatches: receivedSignals.length,
    signals: receivedSignals
  });
});

// Endpoint to clear history
app.delete('/api/signals', (req, res) => {
  receivedSignals.length = 0;
  res.json({ message: 'Signals cleared' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Mock Server running on http://localhost:${PORT}`);
  console.log(`📊 View all signals: http://localhost:${PORT}/api/signals`);
  console.log(`🗑️  Clear signals: DELETE http://localhost:${PORT}/api/signals\n`);
});

