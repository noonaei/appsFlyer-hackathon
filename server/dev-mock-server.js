// dev-mock-server.js
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 1) Background.js auto-detection relies on this
app.get("/api/config", (req, res) => {
  res.json({
    uploadEndpoint: "http://localhost:3000/api/signals",
  });
});

// 2) This receives whatever the extension uploads
app.post("/api/signals", (req, res) => {
  console.log("\n=== RECEIVED EXTENSION UPLOAD ===");
  console.log(JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

app.listen(3000, () => console.log("Dev mock listening on http://localhost:3000"));
