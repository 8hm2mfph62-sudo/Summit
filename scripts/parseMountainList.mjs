import fs from "node:fs";

const inputPath = process.argv[2] || "/home/ubuntu/upload/Pasted_content.txt";
const outputPath = process.argv[3] || "/home/ubuntu/mountain/scripts/attachmentMountains.json";
const source = fs.readFileSync(inputPath, "utf8")
  .replace(/）\s*(?=[^/\n]+?\s+-\s*[\d,]+m(?:（|$))/g, "）\n");
const lines = source.split(/\r?\n/);
let prefecture = "";
const rows = [];
for (const raw of lines) {
  const line = raw.trim();
  const header = line.match(/^⭐︎(.+県|.+府|.+都|.+道)$/);
  if (header) {
    prefecture = header[1];
    continue;
  }
  const match = line.match(/^(.+?)\s*-\s*([\d,]+)m(?:（(.+)）)?/);
  if (!match || !prefecture) continue;
  const rawName = match[1].trim();
  const elevation = Number(match[2].replaceAll(",", ""));
  const description = (match[3] || "").trim();
  const readings = [...rawName.matchAll(/[（(]([^）)]+)[）)]/g)].map((match) => match[1].trim());
  const name = rawName.replace(/\s*[（(][^）)]+[）)]/g, "").trim();
  const reading = readings.join(" / ");
  rows.push({ prefecture, name, reading, elevation, description });
}
const deduped = [];
const seen = new Set();
for (const row of rows) {
  const key = `${row.prefecture}|${row.name}|${row.elevation}`;
  if (!seen.has(key)) {
    seen.add(key);
    deduped.push(row);
  }
}
fs.writeFileSync(outputPath, JSON.stringify({ source: inputPath, totalParsed: rows.length, totalUnique: deduped.length, rows: deduped }, null, 2) + "\n");
console.log(JSON.stringify({ totalParsed: rows.length, totalUnique: deduped.length, prefectures: [...new Set(deduped.map((row) => row.prefecture))] }));
if (!deduped.length) process.exitCode = 1;
