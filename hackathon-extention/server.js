// server.js
const express = require('express');
const cors = require('cors');

const app = express();

// Allow requests from your extension
app.use(cors({
  origin: ['chrome-extension://ojeoflagjllmfjbmnfgogbdgkhabiiko'], 
  methods: ['POST'],
  credentials: true
}));

app.use(express.json());

app.post('/events', (req, res) => {
  console.log('--- NEW EVENT BATCH ---');
  console.log(JSON.stringify(req.body, null, 2)); // pretty print the body
  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log('Local server listening at http://localhost:3000');
});
