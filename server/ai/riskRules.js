
//RULES to alert to parents based on keywords including slang
//can be exported (module.exports at the bottom) for use in summarize.js
const RULES = [
    {
        id: "self_harm",
        severity: "high",
        strongKeywords: [
            //english
            "self harm", "suicide", "kill myself", "kms", "cutting", "thinspo", "pro-ana", "suicidal", "kys", "unalive", "unaliving", "weed","joint","smoking", "smoke",
            //hebrew
            "אובדנות", "אובדני", "אובדנית", "התאבדות", "לפגוע בעצמי", "לחתוך", "פגיעה עצמית", "פרו-אנה", "טינספו" 
        ],
        weakKeywords: [
            //english 
            "depressed", "depression", "i want to die", "die", "cut", "blood","onechipchallenge" ,"onechip", "bedrotting",

            //hebrew 
            "דיכאון", "מדוכא", "אני בדיכאון",
            "למות", "לחתוך", "דם"
        ]
    }, 
    {
        id:"sexual_content",
        severity: "high",
        strongKeywords: [
            //english
            "porn", "xxx", "onlyfans", "nudes",
            //hebrew
            "18", "אונליפאנט", "עירום","סרט סקס","פורנו"        
        ],
        weakKeywords: [
            "sex", "sexy",
            "סקס", "סקסי"
        ]
    },
        {
        id: "drugs",
        severity: "medium",
        strongKeywords: [
            //english
            "cocaine", "mdma", "ecstasy", "lsd", "acid", "meth",
            //hebrew
            "קוקאין", "אקסטזי", "אמדי-אם-איי", "אסיד", "אל-אס-די", "מת'"
        ],
        weakKeywords: [
            "weed", "joint", "high", "stoned",
            "וויד", "גראס", "ג'וינט", "סטלה", "מסטול", "סמים"
        ]
    },

    {
        id: "violence",
        severity: "medium",
        strongKeywords: [
            "gore", "beheading", "graphic violence",
            "עריפת ראש", "אלימות קשה", "גופות", "סנאף"
        ],
        weakKeywords: [
        "kill", "murder", "blood", "shooting",
        "רצח", "להרוג", "ירי", "דם"
        ]
    },

    {
        id: "hate_harassment",
        severity: "medium",
        strongKeywords: [
            "hate crime", "nazi", "kkk",
            "נאצי", "נאצים"
        ],
        weakKeywords: [
            "kill yourself", 
            "kys",  "bullying",
            "תתאבד", "לך תתאבד","חרם", "בריונות"
        ]
    },

    {
        id: "gambling",
        severity: "low",
        strongKeywords: [
            "casino", "sportsbook", "betting site",
            "קזינו", "אתר הימורים", "ווינר"
        ],
        weakKeywords: [
            "betting", "gambling", "slots",
            "הימורים", "רולטה", "סלוטים", "טוטו"
        ]
    }
];

//for consistent text
function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

//checks if any of the keywords appear in the text
function includesAny(text, keywords) {
  const t = normalize(text);
  //for each keyword, does it appear in the text?
  return keywords.some((k) => t.includes(normalize(k)));
}

function scoreRisks({ topTopics = [], topCreators = [] }) {
    //merging 2 arrays into 1
  const candidates = [
    //item: if label exists use it, else topic, else "" aka null 
    ...topTopics.map((t) => ({ item: t.label ?? t.topic ?? "", platform: t.platform ?? "unknown" })),
    ...topCreators.map((c) => ({ item: c.name ?? "", platform: c.platform ?? "unknown" }))
  ];

  const alerts = [];

  for (const c of candidates) {
    const text = c.item;

    for (const rule of RULES) {
      const strong = includesAny(text, rule.strongKeywords);
      //how many weak keywords were found in the text
      const weakCount =
        (rule.weakKeywords || []).reduce((acc, k) => acc + (normalize(text).includes(normalize(k)) ? 1 : 0), 0);

      //strong match added to alerts
      if (strong) {
        alerts.push({
          item: c.item,
          severity: rule.severity,
          category: rule.id,
          platform: c.platform
        });
        continue;
      }

      //weak matches => conservative alerting
      //require at least 2 weak matches in the same item to avoid false positives.
      if (weakCount >= 2) {
        alerts.push({
          item: c.item,
          severity: rule.severity === "high" ? "medium" : rule.severity, 
          category: rule.id,
          platform: c.platform
        });
      }
    }
  }

  //removing duplicates
  const seen = new Set();
  return alerts.filter((a) => {
    const key = `${a.category}::${a.item}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = {RULES ,scoreRisks};