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
