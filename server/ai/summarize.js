const { scoreRisks } = require("./riskRules");
const { explainTopicHe, explainAlertHe, suggestedActionHe } = require("./hebrewTemplates");
const { AIOutputSchema } = require("./schema");
const { generateSummaryLLM } = require("./llm");

//func to convert backend schema into arrays so ai side works
 function normalizeFromHistory(history) {
  const topics = new Map();   //key->{label, platform, count}
  const creators = new Map(); //key->{name, platform, count}

  //changed to match new aggregated signal schema
  for (const item of history) {
    const platform = doc.platform || "unknown";
    const label = item.label || "unknown";
    const weight = Number.isFinite(item.occurrenceCount) ? item.occurrenceCount : 1;

    //topics
    const topicKey = `${platform}::${label}`;
    const t = topics.get(topicKey) || { label, platform, seconds: undefined, count: 0 };
    t.count += weight;
    topics.set(topicKey, t);
      
    //creators
    const cs = Array.isArray(item.creators) ? item.creators : [];

    for (const cname of cs) {
      const creatorKey = `${platform}::${cname}`;
      const c = creators.get(creatorKey) || { name: cname, platform, count: 0 };
      c.count += weight;
      creators.set(creatorKey, c);
    }
  }

  const topTopics = [...topics.values()].sort((a, b) => b.count - a.count);
  const topCreators = [...creators.values()].sort((a, b) => b.count - a.count);

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
async function buildSummary({ history, ageGroup = "unknown", location = "unknown" }) {
  const { topTopics, topCreators } = normalizeFromHistory(Array.isArray(history) ? history : []);

  //risk scoring
  const rawAlerts = scoreRisks({ topTopics, topCreators });

  //enrich alerts into final contract fields
  const alerts = rawAlerts.map((a) => ({
    item: a.item,
    severity: a.severity,
    explanationHe: explainAlertHe(a.category, a.severity),
    suggestedActionHe: suggestedActionHe(a.severity),
  }));

  //facts for LLM
  const facts = {
    ageGroup,
    location,
    topTopics: topTopics.slice(0, 8),
    topCreators: topCreators.slice(0, 8),
    alerts,
  };

  //call LLM to generate full summary
  const outputSchemaHint = {
    shortSummaryHe: "...",
    interestsHe: { bullets: ["..."], whyItMatters: "...", timeContext: "..." },
    topTopicsHe: [{ topic: "...", meaningHe: "...", platforms: ["youtube"] }],
    topCreatorsHe: [{ name: "...", platform: "youtube", whyHe: "..." }],
    alerts: [{ item: "...", severity: "low", explanationHe: "...", suggestedActionHe: "..." }],
    meta: { generatedAt: 0, ageGroup: "...", location: "..." },
  };

  const llmJson  = await generateSummaryLLM({ facts, outputSchemaHint });

  //use LLM output if valid
  if (llmJson) {
    const parsed = AIOutputSchema.safeParse(llmJson);
    if (parsed.success) {
      // enforce meta we control (prevents weird outputs)
      parsed.data.meta.generatedAt = Date.now();
      parsed.data.meta.ageGroup = ageGroup;
      parsed.data.meta.location = location;
      return parsed.data;
    }
  }
  //fallback to deterministic
  return buildDeterministicOutput({ topTopics, topCreators, alerts, ageGroup, location });
}

module.exports = { buildSummary };
