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

    //changed to fit new schema    
    const body = parsedIn.data;
    const history = Array.isArray(body) ? body : body.history || [];
    //if provided 
    const ageGroup = (!Array.isArray(body) && body.ageGroup) ? body.ageGroup : "unknown";
    const location = (!Array.isArray(body) && body.location) ? body.location : "unknown";

    //min log
    console.log("HIT /api/ai/summary", {
      items:history.length,
      ageGroup,
      location,
    });


    //3)generating summary
    const result = await buildSummary({ history, ageGroup, location });

    //4)validating output JSON against schema
    const parsedOut = AIOutputSchema.safeParse(result);
    
    //printing JSON in console for testing
    const out = parsedOut.data;

    console.log("[AI] shortSummaryHe:", out.shortSummaryHe);
    console.log("[AI] interestsHe.whyItMatters:", out.interestsHe?.whyItMatters);

    console.log("[AI] topTopicsHe:");
    out.topTopicsHe?.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.topic} — ${t.meaningHe}`);
    });

    console.log("[AI] alerts:");
    out.alerts?.forEach((a, i) => {
      console.log(`  ${i + 1}. [${a.severity}] ${a.item}`);
      console.log(`     ${a.explanationHe}`);
      console.log(`     ${a.suggestedActionHe}`);
    });

    //end of test printing

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
