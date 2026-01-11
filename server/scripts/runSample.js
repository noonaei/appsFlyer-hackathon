const fs = require("fs");
const path = require("path");

const samplePath = process.argv[2];
if (!samplePath) {
  console.error("Usage: node scripts/runSample.js ai/samples/youtube_gaming.json");
  process.exit(1);
}

const body = JSON.parse(fs.readFileSync(path.resolve(samplePath), "utf8"));

(async () => {
  const res = await fetch("http://localhost:5000/api/ai/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log(text);
})();
