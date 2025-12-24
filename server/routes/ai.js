import express from "express";
import dotenv from "dotenv";
import { buildSummary } from "../ai/summarize.js";
import { AIInputSchema, AIOutputSchema } from "../ai/schema.js";

//creating POST endpoint - receiving JSON from client and calling summary builder (the AI)
// - responds with JSON + HTTP status codes

dotenv.config();

//creating a router that handles ai requests
const router = express.Router();

router.post("/summary", async (req, res) => {
    // console.log("HIT /api/ai/summary", req.body);

  try {
    //1.security - require API key header
    const expectedKey = process.env.AI_API_KEY;
    const providedKey = req.headers["x-api-key"];

    if (expectedKey && providedKey !== expectedKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    //2.validating inout JSON against schema  
    const parsedIn = AIInputSchema.safeParse(req.body);
    if (!parsedIn.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: parsedIn.error.issues.map((i) => ({
          path: i.path,
          message: i.message
        }))
      });
    }

    const input = parsedIn.data;
    
    //min log
     console.log("HIT /api/ai/summary", {
      ageGroup: input.ageGroup,
      location: input.location,
      topicsCount: input.topTopics.length,
      creatorsCount: input.topCreators?.length ?? 0
    });

    //3.generating summary
    const result = await buildSummary(input);

    //4.validating output JSON against schema
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

export default router;
