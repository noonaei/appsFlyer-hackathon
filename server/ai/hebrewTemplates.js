


function explainTopicHe(topicRaw) {
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



function explainAlertHe(category, severity) {
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


function suggestedActionHe(severity) {
  if (severity === "high") {
    return "שיחה רגועה ושואלת, ובדיקה משותפת של התוכן/המקור. אם יש חשש ממשי — פנייה לגורם מקצועי.";
  }
  if (severity === "medium") {
    return "לשאול מה זה אומר עבורם ולבדוק באיזה הקשר זה הופיע. לעקוב האם זה חוזר.";
  }
  return "לשאול בסקרנות על הנושא ולוודא התאמה לגיל.";
}

module.exports ={explainTopicHe, explainAlertHe, suggestedActionHe};
