const express = require("express");
const dotenv = require("dotenv");

const { buildSummary } = require("../ai/summarize");
const { AIInputSchema, AIOutputSchema } = require("../ai/schema");

//creating POST endpoint - receiving JSON from client and calling summary builder (the AI)
//- responds with JSON + HTTP status codes

dotenv.config();

//creating a router that handles ai requests
const router = express.Router();

router.post("/summary", async (req, res) => {
  try {
    //1)security - require API key header
    const expectedKey = process.env.AI_API_KEY;
    const providedKey = req.headers["x-api-key"];

    if (expectedKey && providedKey !== expectedKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    //2)validating input JSON against schema
    const parsedIn = AIInputSchema.safeParse(req.body);
    if (!parsedIn.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: parsedIn.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      });
    }

    const input = parsedIn.data;

    //min log
    console.log("HIT /api/ai/summary", {
      ageGroup: input.ageGroup,
      location: input.location,
      topicsCount: input.topTopics.length,
      creatorsCount: (input.topCreators && input.topCreators.length) || 0,
    });

    //3)generating summary
    const result = await buildSummary(input);

    //4)validating output JSON against schema
    const parsedOut = AIOutputSchema.safeParse(result);
    if (!parsedOut.success) {
      console.error("AI output schema mismatch:", parsedOut.error.issues);
      return res.status(500).json({ error: "AI output schema mismatch" });
    }

    return res.status(200).json(parsedOut.data);
  } catch (err) {
    console.error("AI summary error:", err);
    return res.status(500).json({ error: "Failed to generate AI summary" });
  }
});

module.exports = router;
