import { z } from "zod";


// record - for dict/maps, () is the value
// min - length
// number - must be a number 
// nonnegative - non-negative num
// optional - can be empty
// array - should be an array with its elements matching the structure set for it 


//input validation - what backend sends into buildSummary
export const AIInputSchema = z.object({
    //discuss if this is essential
  ageGroup: z.enum(["9-11", "12-14", "15-17"]),
  location: z.string().min(1),

  timeByPlatform: z.record(z.number().nonnegative()).optional(),

  topTopics: z.array(
    z.object({
      label: z.string().min(1),
      platform: z.string().min(1).optional(),
      seconds: z.number().nonnegative().optional()
    })
  ),

  topCreators: z.array(
    z.object({
      name: z.string().min(1),
      platform: z.string().min(1).optional(),
      seconds: z.number().nonnegative().optional()
    })
  ).optional()
});

//output validation - what buildSummary must return
export const AIOutputSchema = z.object({
  shortSummaryHe: z.string().min(1),

  interestsHe: z.object({
    bullets: z.array(z.string().min(1)).min(1),
    whyItMatters: z.string().min(1),
    timeContext: z.string().min(1).optional()
  }).optional(),

  topTopicsHe: z.array(
    z.object({
      topic: z.string().min(1),
      meaningHe: z.string().min(1),
      platforms: z.array(z.string().min(1)),
      seconds: z.number().nonnegative().optional()
    })
  ),

  topCreatorsHe: z.array(
    z.object({
      name: z.string().min(1),
      platform: z.string().min(1),
      whyHe: z.string().min(1)
    })
  ),

  alerts: z.array(
    z.object({
      item: z.string().min(1),
      severity: z.enum(["low", "medium", "high"]),
      explanationHe: z.string().min(1),
      suggestedActionHe: z.string().min(1)
    })
  ),

  meta: z.object({
    generatedAt: z.number(),
    ageGroup: z.string().min(1),
    location: z.string().min(1)
  })
});
