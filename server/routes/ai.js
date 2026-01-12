<<<<<<< Updated upstream
const express = require("express");
const dotenv = require("dotenv");

const { buildSummary } = require("../ai/summarize");
const { getPopularContent } = require("../ai/popularContent");
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
      console.log('AI API key check skipped - no key configured');
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
    const customPrompt = (!Array.isArray(body) && body.customPrompt) ? body.customPrompt : null;

    //min log
    console.log("HIT /api/ai/summary", {
      items:history.length,
      ageGroup,
      location,
    });


    //3)generating summary
    const result = await buildSummary({ history, ageGroup, location, customPrompt });

    //4)validating output JSON against schema
    const parsedOut = AIOutputSchema.safeParse(result);

    //fix 
    if (!parsedOut.success) {
      console.error("AI output schema mismatch:", parsedOut.error.issues);
      return res.status(500).json({ error: "AI output schema mismatch" });
    }
    
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

    

    return res.status(200).json(parsedOut.data);
  } catch (err) {
    console.error("AI summary error:", err);
    return res.status(500).json({ error: "Failed to generate AI summary" });
  }
});

router.get("/popular/:age", async (req, res) => {
  try {
    const age = parseInt(req.params.age);
    if (!age || age < 1 || age > 18) {
      return res.status(400).json({ error: "Age must be between 1-18" });
    }

    console.log(`HIT /api/ai/popular/${age}`);
    
    const result = await getPopularContent(age);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Popular content error:", err);
    return res.status(500).json({ error: "Failed to get popular content" });
  }
});

module.exports = router;
=======
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
>>>>>>> Stashed changes
