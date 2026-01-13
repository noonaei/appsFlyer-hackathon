const { generateSummaryLLM } = require("./llm");

// AI-powered explanation functions with fallback to templates
async function explainTopicHe(topicRaw) {
  try {
    const prompt = [
      `Explain in Hebrew what "${topicRaw}" means in online/social media context.`,
      "Write 2-3 sentences explaining what this topic/hashtag/content typically involves.",
      "Be informative and age-appropriate. Focus on what parents should know.",
      "Return ONLY the Hebrew explanation text, no JSON or extra formatting."
    ].join(" ");
    
    const aiResponse = await generateSummaryLLM({
      facts: { topic: topicRaw },
      outputSchemaHint: "Hebrew explanation text",
      customPrompt: prompt
    });
    
    if (aiResponse && typeof aiResponse === 'string' && aiResponse.length > 20) {
      return aiResponse;
    }
  } catch (err) {
    console.error(`[AI] Error explaining topic ${topicRaw}:`, err);
  }
  
  // Fallback to template
  return explainTopicHeTemplate(topicRaw);
}

async function explainAlertHe(category, severity) {
  try {
    const prompt = [
      `Explain in Hebrew why content category "${category}" with "${severity}" severity is concerning for parents.`,
      "Write 3-4 sentences explaining the specific risks and concerns.",
      "Be informative but not alarmist. Address parents directly using 'אתם'.",
      "Return ONLY the Hebrew explanation text, no JSON or extra formatting."
    ].join(" ");
    
    const aiResponse = await generateSummaryLLM({
      facts: { category, severity },
      outputSchemaHint: "Hebrew explanation text",
      customPrompt: prompt
    });
    
    if (aiResponse && typeof aiResponse === 'string' && aiResponse.length > 30) {
      return aiResponse;
    }
  } catch (err) {
    console.error(`[AI] Error explaining alert ${category}:`, err);
  }
  
  // Fallback to template
  return explainAlertHeTemplate(category, severity);
}

async function suggestedActionHe(severity) {
  try {
    const prompt = [
      `Provide Hebrew suggested actions for parents when finding "${severity}" severity concerning content.`,
      "Write 2-3 sentences with specific, actionable steps parents can take.",
      "Include conversation starters and monitoring suggestions.",
      "Address parents directly using 'אתם'. Be constructive and supportive.",
      "Return ONLY the Hebrew action text, no JSON or extra formatting."
    ].join(" ");
    
    const aiResponse = await generateSummaryLLM({
      facts: { severity },
      outputSchemaHint: "Hebrew action text",
      customPrompt: prompt
    });
    
    if (aiResponse && typeof aiResponse === 'string' && aiResponse.length > 30) {
      return aiResponse;
    }
  } catch (err) {
    console.error(`[AI] Error generating suggested action for ${severity}:`, err);
  }
  
  // Fallback to template
  return suggestedActionHeTemplate(severity);
}

// Template fallback functions
function explainTopicHeTemplate(topicRaw) {
  const topic = (topicRaw || "").toLowerCase();

  if (topic.includes("minecraft") || topic.includes("#minecraft")) {
    return "תוכן סביב Minecraft: בנייה, הישרדות, מדריכים, שרתים ומודים. לרוב מדובר בגיימינג יצירתי.";
  }

  if (topic.includes("music") || topic.includes("#music")) {
    return "תוכן מוזיקה: שירים, קליפים, רמיקסים וטרנדים. יכול לכלול גם אתגרים/ריקודים לפי הטרנדים.";
  }

  if (topic.includes("gaming") || topic.includes("#gaming")) {
    return "תוכן גיימינג: סרטוני משחק, ביקורות, מדריכים, סטרימינג וקהילות סביב משחקים פופולריים.";
  }

  if (topic.startsWith("r/")) {
    return "קהילת Reddit (סאב-רדיט) בנושא מסוים. מומלץ לבדוק מה סוג הפוסטים שמופיעים שם.";
  }

  //fallback (generic)
  return "נושא/האשטג שמופיע בתוכן שנצרך. מומלץ לבדוק הקשר לפני הסקת מסקנות.";
}



function explainAlertHeTemplate(category, severity) {
  //messages according to category
  if (category === "self_harm") {
    return "ייתכן שזה קשור למצוקה או פגיעה עצמית. חשוב לבדוק הקשר ולא להסיק מסקנות רק מהמונח.";
  }
  if (category === "sexual_content") {
    return "ייתכן שזה קשור לתוכן מיני/לא מתאים לגיל. מומלץ לבדוק באיזה הקשר זה הופיע.";
  }
  if (category === "drugs") {
    return "ייתכן שזה קשור לשיח על סמים. מומלץ לברר הקשר ולשים לב אם זה חוזר.";
  }
  if (category === "violence") {
    return "ייתכן שזה קשור לתוכן אלים/קיצוני. מומלץ לבדוק הקשר ולוודא התאמה לגיל.";
  }
  if (category === "gambling") {
    return "ייתכן שזה קשור להימורים/תוכן ממכר. מומלץ לשוחח ולוודא גבולות.";
  }
  if (category === "hate_harassment") {
    return "ייתכן שזה קשור להסתה/הטרדה. מומלץ לבדוק הקשר ולשוחח על שפה בטוחה ומכבדת.";
  }

  //fallback - according to severity
  if (severity === "high") return "ייתכן שזה קשור לתוכן רגיש. מומלץ לבדוק הקשר.";
  if (severity === "medium") return "עשוי להיות תוכן גבולי. מומלץ לעקוב.";
  return "נושא שדורש תשומת לב בהתאם להקשר.";
}


function suggestedActionHeTemplate(severity) {
  if (severity === "high") {
    return "שיחה רגועה ושואלת, ובדיקה משותפת של התוכן/המקור. אם יש חשש ממשי — פנייה לגורם מקצועי.";
  }
  if (severity === "medium") {
    return "לשאול מה זה אומר עבורם ולבדוק באיזה הקשר זה הופיע. לעקוב האם זה חוזר.";
  }
  return "לשאול בסקרנות על הנושא ולוודא התאמה לגיל.";
}

module.exports = {explainTopicHe, explainAlertHe, suggestedActionHe};