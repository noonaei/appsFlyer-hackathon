# AI Summary Contract (MVP)

## Input (to buildSummary)

{
ageGroup: "9-11" | "12-14" | "15-17",
location: "Israel" | string,
timeByPlatform?: Record<string, number>,
topTopics: Array<{ label: string, platform?: string, seconds?: number }>,
topCreators?: Array<{ name: string, platform?: string, seconds?: number }>
}

## Output (returned by buildSummary / /api/ai/summary)

{
shortSummaryHe: string,

// NEW (optional): general "what the child is interested in" section
interestsHe?: {
bullets: string[], // 2-5 short bullet points in Hebrew
whyItMatters: string, // 1-2 lines: pattern/context for the parent
timeContext?: string // optional: tie to timeByPlatform (e.g., "mostly YouTube")
},

topTopicsHe: Array<{
topic: string,
meaningHe: string,
platforms: string[],
seconds?: number
}>,

topCreatorsHe: Array<{
name: string,
platform: string,
whyHe: string
}>,

alerts: Array<{
item: string,
severity: "low" | "medium" | "high",
explanationHe: string,
suggestedActionHe: string
}>,

meta: {
generatedAt: number,
ageGroup: string,
location: string
}
}
