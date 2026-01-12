<<<<<<< Updated upstream
const { scoreRisks } = require("./riskRules");
const { explainTopicHe, explainAlertHe, suggestedActionHe } = require("./hebrewTemplates");
const { AIOutputSchema } = require("./schema");
const { generateSummaryLLM } = require("./llm");
const { hashKey, get: cacheGet, set: cacheSet } = require("./cache");

//func to convert backend schema into arrays so ai side works
 function normalizeFromHistory(history) {
  const topics = new Map();   //key->{label, platform, count}
  const creators = new Map(); //key->{name, platform, count}

  console.log("[AI] normalizeFromHistory input:", history.slice(0, 5));
  console.log("[AI] total history items:", history.length);
  
  //changed to match new aggregated signal schema
  for (const item of history) {
    const platform = item.platform || "unknown";
    const label = item.label || "unknown";
    const kind = item.kind || "unknown";
    const weight = Number.isFinite(item.occurrenceCount) ? item.occurrenceCount : 1;

    //kind==creators, new logic where the creators are in the label
    if (kind === "creators") {
      // Special handling for Reddit, Instagram, TikTok: treat as topics unless username is available
      if (platform === "reddit" || platform === "instagram" || platform === "tiktok") {
        const topicKey = `${platform}::${label}`;
        const t = topics.get(topicKey) || { label, platform, seconds: undefined, count: 0 };
        t.count += weight;
        topics.set(topicKey, t);
        continue;
      }
      
      const creatorKey = `${platform}::${label}`;
      const c = creators.get(creatorKey) || { name: label, platform, seconds: undefined, count: 0 };
      c.count += weight;
      creators.set(creatorKey, c);
      continue;
    }

    //topics
    const topicKey = `${platform}::${label}`;
    const t = topics.get(topicKey) || { label, platform, seconds: undefined, count: 0 };
    t.count += weight;
    topics.set(topicKey, t);
      
  }

  const topTopics = [...topics.values()].sort((a, b) => b.count - a.count);
  const topCreators = [...creators.values()].sort((a, b) => b.count - a.count);

  console.log("[AI] Final topTopics:", topTopics.slice(0, 5));
  console.log("[AI] Final topCreators:", topCreators.slice(0, 5));

  return { topTopics, topCreators };
}

//for testing: deterministic output without LLM
function buildDeterministicOutput({ topTopics, topCreators, alerts, ageGroup, location }) {
  return {
    shortSummaryHe: `סיכום: עיקר הפעילות סביב ${topTopics[0]?.label ?? "תכנים כלליים"}.`,
    topTopicsHe: topTopics.slice(0, 5).map((t) => ({
      topic: t.label ?? "unknown",
      meaningHe: explainTopicHe(t.label ?? "unknown"),
      platforms: t.platform ? [t.platform] : [],
      seconds: t.seconds ?? undefined,
    })),
    topCreatorsHe: topCreators.slice(0, 5).map((c) => ({
      name: c.name ?? "unknown",
      platform: c.platform ?? "unknown",
      whyHe: "נמצא בין היוצרים הנצפים ביותר בתקופה.",
    })),
    alerts,
    meta: {
      generatedAt: Date.now(),
      ageGroup,
      location,
    },
  };
}



//updated inout to match new backend schema
async function buildSummary({ history, ageGroup = "unknown", location = "unknown", deviceAge = null, customPrompt = null }) {
  const { topTopics, topCreators } = normalizeFromHistory(Array.isArray(history) ? history : []);

  //risk scoring
  const rawAlerts = scoreRisks({ topTopics, topCreators });

  //enrich alerts with AI-generated explanations
  const enrichedAlerts = [];
  for (const alert of rawAlerts) {
    try {
      const alertPrompt = [
        `You found concerning content: "${alert.item}" (${alert.severity} risk)`,
        "Explain in Hebrew what this content is and why it's concerning for parents.",
        "Provide specific actionable advice for parents.",
        "Be calm, informative, and constructive.",
        "Return ONLY valid JSON with explanationHe and suggestedActionHe fields.",
        "Provide possible conversation starters for parents to discuss this with their child.",
        "DO NOT use the word parents, say YOU in plural in the explanation.",
        "ALWAYS: provide conversation starters for parents to discuss online safety with their child.",
        "be sensitive and avoid alarming language; focus on understanding and guidance.",
        "make the summary medium-length, not too short or too long.",
      ].join(" ");
      
      console.log(`[AI] Processing alert: ${alert.item} (${alert.severity})`);
      
      const aiExplanation = await generateSummaryLLM({ 
        facts: { item: alert.item, severity: alert.severity, category: alert.category },
        outputSchemaHint: { explanationHe: "...", suggestedActionHe: "..." },
        customPrompt: alertPrompt 
      });
      
      console.log(`[AI] AI response for ${alert.item}:`, aiExplanation);
      
      enrichedAlerts.push({
        item: alert.item,
        severity: alert.severity,
        explanationHe: aiExplanation?.explanationHe || explainAlertHe(alert.category, alert.severity),
        suggestedActionHe: aiExplanation?.suggestedActionHe || suggestedActionHe(alert.severity),
      });
    } catch (err) {
      console.error(`[AI] Error processing alert ${alert.item}:`, err);
      // Fallback to templates if AI fails
      enrichedAlerts.push({
        item: alert.item,
        severity: alert.severity,
        explanationHe: explainAlertHe(alert.category, alert.severity),
        suggestedActionHe: suggestedActionHe(alert.severity),
      });
    }
  }
  
  const alerts = enrichedAlerts;

  //facts for LLM - use deviceAge if available, otherwise ageGroup
  const effectiveAge = deviceAge || ageGroup;
  const facts = {
    ageGroup: effectiveAge,
    location,
    topTopics: topTopics.slice(0, 8),
    topCreators: topCreators.slice(0, 8),
    alerts,
  };

    //---- cache (facts -> final output) ----
  const cacheKey = hashKey({ facts, schema: "AIOutputSchema:v1" });
  const cached = cacheGet(cacheKey);
  if (cached) {
    //enforce meta we control
    cached.meta.generatedAt = Date.now();
    cached.meta.ageGroup = ageGroup;
    cached.meta.location = location;
    return cached;
  }

  //call LLM to generate full summary
  const outputSchemaHint = {
    shortSummaryHe: "...",
    interestsHe: { bullets: ["..."], whyItMatters: "...", timeContext: "..." },
    topTopicsHe: [{ topic: "...", meaningHe: "...", platforms: ["youtube"] }],
    topCreatorsHe: [{ name: "...", platform: "youtube", whyHe: "..." }],
    alerts: [{ item: "...", severity: "low", explanationHe: "...", suggestedActionHe: "..." }],
    meta: { generatedAt: 0, ageGroup: "...", location: "..." },
  };

  console.log("[AI] attempting LLM summary...");
  const llmJson  = await generateSummaryLLM({ facts, outputSchemaHint, customPrompt });

  //use LLM output if valid
  if (llmJson) {
    const parsed = AIOutputSchema.safeParse(llmJson);
    if (parsed.success) {
      // enforce meta we control (prevents weird outputs)
      parsed.data.meta.generatedAt = Date.now();
      parsed.data.meta.ageGroup = effectiveAge;
      parsed.data.meta.location = location;
      // cache the validated output
      cacheSet(cacheKey, parsed.data);
      return parsed.data;
    }
  }
  //fallback to deterministic
  const fallback = buildDeterministicOutput({ topTopics, topCreators, alerts, ageGroup: effectiveAge, location });
  cacheSet(cacheKey, fallback);
  return fallback;
}

module.exports = { buildSummary };
=======
import { scoreRisks } from "./riskRules.js";
import { explainTopicHe, explainAlertHe, suggestedActionHe } from "./hebrewTemplates.js";

//STOPPED HERE - NEED TESTING! 24/12 3PM
export async function buildSummary(input) {
  const ageGroup = input?.ageGroup ?? "unknown";
  const location = input?.location ?? "unknown";

  const topTopics = Array.isArray(input?.topTopics) ? input.topTopics : [];
  const topCreators = Array.isArray(input?.topCreators) ? input.topCreators : [];

  // 1)risk scoring
  const rawAlerts = scoreRisks({ topTopics, topCreators });

  // 2)enrich alerts into final contract fields
  const alerts = rawAlerts.map((a) => ({
    item: a.item,
    severity: a.severity,
    explanationHe: explainAlertHe(a.category, a.severity),
    suggestedActionHe: suggestedActionHe(a.severity)
  }));

  return {
    shortSummaryHe: `סיכום: עיקר הפעילות סביב ${topTopics[0]?.label ?? "תכנים כלליים"}.`,
    topTopicsHe: topTopics.slice(0, 5).map((t) => ({
      topic: t.label ?? t.topic ?? "unknown",
      meaningHe: explainTopicHe(t.label ?? t.topic ?? "unknown"),
      platforms: t.platform ? [t.platform] : [],
      seconds: t.seconds ?? undefined
    })),
    topCreatorsHe: topCreators.slice(0, 5).map((c) => ({
      name: c.name ?? "unknown",
      platform: c.platform ?? "unknown",
      whyHe: "נמצא בין היוצרים הנצפים ביותר בתקופה."
    })),
    alerts,
    meta: {
      generatedAt: Date.now(),
      ageGroup,
      location
    }
  };
}
>>>>>>> Stashed changes
