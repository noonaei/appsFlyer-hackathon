import express from "express";
import { buildSummary } from "../ai/summarize.js";

//creating POST endpoint - receiving JSON from client and calling summary builder (the AI)
// - responds with JSON + HTTP status codes


//creating a router that handles ai requests
const router = express.Router();

router.post("/summary", async (req, res) => {
    console.log("HIT /api/ai/summary", req.body);

  try {
    const input = req.body;

    if (!input) {
      return res.status(400).json({ error: "Missing request body" });
    }

    const result = await buildSummary(input);
    return res.status(200).json(result);
  } catch (err) {
    console.error("AI summary error:", err);
    return res.status(500).json({ error: "Failed to generate AI summary" });
  }
});

export default router;
