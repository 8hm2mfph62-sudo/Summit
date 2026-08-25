import fs from "node:fs";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { mountains } from "../drizzle/schema.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const dataPath = process.argv[2] || new URL("./attachmentMountains.json", import.meta.url);
const payload = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const db = drizzle(process.env.DATABASE_URL);
const fallbackImage = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80";
const slug = (value) => value.normalize("NFKC").replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase();
const difficultyFor = (elevation) => elevation < 800 ? "beginner" : elevation < 1600 ? "intermediate" : "advanced";
const iconFor = (elevation) => elevation >= 2000 ? "🏔️" : elevation >= 1200 ? "⛰️" : "🌿";

const existing = await db.select({ id: mountains.id, name: mountains.name, prefecture: mountains.prefecture, elevation: mountains.elevation }).from(mountains);
const existingKeys = new Set(existing.map((row) => `${row.prefecture}|${row.name}|${row.elevation}`));
const rows = payload.rows
  .filter((row) => !existingKeys.has(`${row.prefecture}|${row.name}|${row.elevation}`))
  .map((row, index) => ({
    id: `attachment-${slug(row.prefecture)}-${slug(row.name)}-${row.elevation}-${index}`.slice(0, 128),
    name: row.name,
    elevation: row.elevation,
    location: `${row.prefecture}周辺`,
    prefecture: row.prefecture,
    difficulty: difficultyFor(row.elevation),
    description: row.description || `${row.prefecture}にある標高${row.elevation}mの山。`,
    recommendedSeason: "春・夏・秋",
    estimatedTime: row.elevation < 800 ? "半日" : "1日",
    imageUrl: fallbackImage,
    stampText: `${row.name} 登頂記念`,
    stampIcon: iconFor(row.elevation),
    stampColor: "text-emerald-700",
    stampBgColor: "bg-emerald-50",
    stampBorderColor: "border-emerald-200",
  }));

if (rows.length) await db.insert(mountains).values(rows);
console.log(JSON.stringify({ sourceTotal: payload.totalUnique, existingTotal: existing.length, inserted: rows.length, totalAfter: existing.length + rows.length }));
process.exit(0);
EOF
node /home/ubuntu/mountain/scripts/addAttachmentMountains.mjs /home/ubuntu/mountain/scripts/attachmentMountains.json
