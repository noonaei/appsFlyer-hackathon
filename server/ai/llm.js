
//wont crash if openai not installed or api key missing
function tryLoadOpenAI() {
  try {
    return require("openai");
  } catch {
    return null;
  }
}

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const OpenAI = tryLoadOpenAI();
  if (!OpenAI) return null;

  return new OpenAI({ apiKey });
}


async function generateSummaryLLM({ facts, outputSchemaHint, customPrompt = null }) {
  const client = getClient();
  if (!client) return null; // allow fallback

  console.log("[AI] LLM enabled:", !!client);

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  //system instructions + user prompt
  const system = customPrompt || [
    "you write concise, detailed, parent-friendly hebrew summaries about a child's online activity, detailing relevant topics, creators, and platforms they engaged with.",
    "return ONLY valid JSON (no markdown, no extra text).",
    "do not invent topics/creators/platforms not present in the facts.",
    "avoid full URLs; use domains only if needed.",
    "IMPORTANT: Keep all topic names and creator names in their original language. If you need to explain what they mean, put the Hebrew translation in parentheses after the original name.",
    "Example: 'Minecraft (משחק בנייה)' or 'PewDiePie (יוטיובר משחקים)'.",
    "DO NOT use the word parents, say YOU in plural in the explanation.",
    "ALWAYS: provide conversation starters for parents to discuss online safety with their child.",
    "be sensitive and avoid alarming language; focus on understanding and guidance.",
    "make the summary medium-length, not too short or too long.",
    "if one of the facts is a probleamatic content item or trend, POINT IT OUT (tell the parent which one it is clearly) and explain what it is and why it's concerning for parents.",
  ].join(" ");

  const user = { facts, outputSchemaHint };

  const resp = await client.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) },
    ],
  });
 
  const text = resp.choices?.[0]?.message?.content;
  if (!text) return null;

  //the API promises JSON_object, but still parse defensively
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

module.exports = { generateSummaryLLM };