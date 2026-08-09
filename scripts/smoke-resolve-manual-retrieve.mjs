import fs from "node:fs";
import path from "node:path";

const STOP = new Set([
  "a","an","the","to","in","on","of","for","and","or","how","do","i","my","me",
  "can","please","what","where","when","with","from","into","is","it","this",
  "that","resolve","davinci",
]);

function tokenize(q) {
  return String(q)
    .toLowerCase()
    .replace(/[^a-z0-9\s/+.-]/g, " ")
    .split(/[\s/+.-]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function score(text, tokens, raw) {
  const t = text.toLowerCase();
  let s = 0;
  const q = raw.toLowerCase().trim();
  if (q.length >= 6 && t.includes(q)) s += 40;
  for (let i = 0; i < tokens.length; i++) {
    for (let n = 2; n <= 3; n++) {
      const phrase = tokens.slice(i, i + n).join(" ");
      if (phrase.length >= 5 && t.includes(phrase)) s += 16;
    }
  }
  for (const tok of tokens) {
    const re = new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    const hits = t.match(re);
    if (hits?.length) s += Math.min(12, hits.length) * 3;
    else if (t.includes(tok)) s += 1;
  }
  if (/\b(choose|select|click|drag|press|open|from the)\b/i.test(text)) s += 2;
  return s;
}

const chunksPath = path.join(process.cwd(), "data", "resolve-manual", "chunks.jsonl");
const raw = process.argv[2] || "how do I add a transition";
const tokens = tokenize(raw);
const ranked = [];
for (const line of fs.readFileSync(chunksPath, "utf8").split(/\n/)) {
  if (!line.trim()) continue;
  const c = JSON.parse(line);
  const sc = score(c.text, tokens, raw);
  if (sc > 0) ranked.push({ sc, page: c.page, text: c.text.replace(/\s+/g, " ").slice(0, 160) });
}
ranked.sort((a, b) => b.sc - a.sc);
console.log("query:", raw);
console.log(ranked.slice(0, 6));
