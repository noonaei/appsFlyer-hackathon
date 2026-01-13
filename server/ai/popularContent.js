const { generateSummaryLLM } = require("./llm");
const { hashKey, get: cacheGet, set: cacheSet } = require("./cache");

async function getPopularContent(age) {
  const cacheKey = hashKey({ age, type: "popular_content", date: new Date().toDateString() });
  const cached = cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  const prompt = `You are an expert on Israeli youth culture and digital trends. 
  
  Generate a comprehensive summary of what's currently popular among ${age}-year-olds in Israel right now.
  
  Include:
  - Popular social media platforms and trends
  - Trending music, artists, and songs
  - Popular TV shows, movies, and YouTube channels
  - Gaming trends and popular games
  - Fashion and lifestyle trends
  - Popular apps and digital tools
  - Current events or topics they're discussing
  
  Focus specifically on Israeli context and Hebrew content where relevant.
  
  Respond in Hebrew with a structured format.
  
  Format your response as JSON with this structure:
  {
    "socialMedia": ["list of popular platforms and trends"],
    "entertainment": ["popular shows, movies, music"],
    "gaming": ["popular games and gaming trends"],
    "lifestyle": ["fashion, apps, lifestyle trends"],
    "topics": ["current discussion topics"],
    "summary": "brief overview in Hebrew"
  }`;

  try {
    const result = await generateSummaryLLM({ 
      facts: { age, location: "Israel", customPrompt: prompt },
      outputSchemaHint: {
        socialMedia: ["..."],
        entertainment: ["..."],
        gaming: ["..."],
        lifestyle: ["..."],
        topics: ["..."],
        summary: "..."
      }
    });
    
    if (result) {
      cacheSet(cacheKey, result, 3600); // Cache for 1 hour
      return result;
    }
  } catch (error) {
    console.error("Popular content generation failed:", error);
  }

  // Fallback response
  const fallback = {
    socialMedia: ["TikTok", "Instagram", "Snapchat"],
    entertainment: ["נטפליקס", "יוטיוב", "ספוטיפיי"],
    gaming: ["פורטנייט", "רובלוקס", "מיינקראפט"],
    lifestyle: ["אפליקציות אופנה", "אפליקציות כושר"],
    topics: ["בית ספר", "חברים", "תחביבים"],
    summary: `תוכן פופולרי בקרב בני ${age} בישראל כולל רשתות חברתיות, משחקים ובידור דיגיטלי.`
  };
  
  cacheSet(cacheKey, fallback, 3600);
  return fallback;
}

module.exports = { getPopularContent };