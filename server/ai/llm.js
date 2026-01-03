const OpenAI = require("openai");

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

async function generateSummaryLLM({ facts, contractExample }) {
  const client = getClient();
  if (!client) return null; // allow fallback

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  //system instructions + user prompt
  const system = [
     "You write concise, parent-friendly Hebrew summaries about a child's online activity.",
    "Return ONLY valid JSON (no markdown, no extra text).",
    "Do not invent topics/creators/platforms not present in the facts.",
    "Avoid full URLs; use domains only if needed.",
  ].join(" ");

   const user = {
    task: "Generate the summary JSON strictly matching the contract.",
    facts,
    outputSchemaHint, 
  };

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