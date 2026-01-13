const crypto = require("crypto");

//simple TTL cache (in-memory)
const store = new Map();

//default TTL: 10 minutes
const DEFAULT_TTL_MS = Number(process.env.AI_CACHE_TTL_MS || 10 * 60 * 1000);

const CACHE_VERSION = process.env.AI_CACHE_VERSION || "v1";

//stable stringify: sort object keys recursively so hashing is deterministic
function stableStringify(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  const keys = Object.keys(value).sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`);
  return `{${entries.join(",")}}`;
}

function hashKey(obj) {
  const raw = `${CACHE_VERSION}::${stableStringify(obj)}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function get(key) {
  const hit = store.get(key);
  if (!hit) return null;

  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

function set(key, value, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function purgeExpired() {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now > v.expiresAt) store.delete(k);
  }
}

function stats() {
  purgeExpired();
  return { size: store.size, ttlMs: DEFAULT_TTL_MS, version: CACHE_VERSION };
}

module.exports = { hashKey, get, set, stats };
