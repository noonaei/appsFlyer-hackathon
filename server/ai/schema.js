const { z } = require("zod");

// record - for dict/maps, () is the value
// min - length
// nonnegative - non-negative num
// optional - can be empty
// array - should be an array with its elements matching the structure set for it 

//check later if time is removed or not 


//input validation - what backend sends into buildSummary (edited to match backend schema)
const PlatformEnum = z.enum([
  "youtube",
  "tiktok",
  "instagram",
  "reddit",
  "twitch",
  "google_search",
]);

const SignalKindEnum = z.enum([
  "hashtag",
  "channel",
  "search_term",
  "url_visit",
]);

const EventSignalItemSchema = z.object({
  kind: SignalKindEnum,
  label: z.string().min(1),
  url: z.string().optional(),
  creator: z.string().optional(),
  timestamp: z.coerce.date().optional(),
});

const EventSignalDocSchema = z.object({
  deviceId: z.string().min(1),
  platform: PlatformEnum,
  signals: z.array(EventSignalItemSchema).min(1),
});

//allow posting one doc or an array of docs
const AIInputSchema = z.union([
  EventSignalDocSchema,
  z.array(EventSignalDocSchema).min(1),
]);


//output validation - what buildSummary must return
const AIOutputSchema = z.object({
  shortSummaryHe: z.string().min(1),

  interestsHe: z.object({
    bullets: z.array(z.string().min(1)).min(1),
    whyItMatters: z.string().min(1),
    timeContext: z.string().min(1).optional(),
  }).optional(),

  topTopicsHe: z.array(
    z.object({
      topic: z.string().min(1),
      meaningHe: z.string().min(1),
      platforms: z.array(z.string().min(1)),
      seconds: z.number().nonnegative().optional(),
    })
  ),

  topCreatorsHe: z.array(
    z.object({
      name: z.string().min(1),
      platform: z.string().min(1),
      whyHe: z.string().min(1),
    })
  ),

  alerts: z.array(
    z.object({
      item: z.string().min(1),
      severity: z.enum(["low", "medium", "high"]),
      explanationHe: z.string().min(1),
      suggestedActionHe: z.string().min(1),
    })
  ),

  meta: z.object({
    generatedAt: z.number(),
    ageGroup: z.string().min(1),
    location: z.string().min(1),
  }),
});

module.exports = {
  AIInputSchema,
  AIOutputSchema,
  PlatformEnum,
  SignalKindEnum,
};