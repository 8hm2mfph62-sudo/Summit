import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import {
  ALL_BADGES,
  INITIAL_CHALLENGES,
  PRELOADED_ALBUMS,
  PRELOADED_MOUNTAINS,
} from "../../Mountain-source/src/data";
import {
  albumMountains,
  albums,
  badges,
  challengeTemplates,
  mountains,
} from "../drizzle/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to migrate the Mountain catalogue.");
}

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  await db.insert(mountains).values(
    PRELOADED_MOUNTAINS.map((mountain) => ({
      id: mountain.id,
      name: mountain.name,
      elevation: mountain.elevation,
      location: mountain.location,
      prefecture: mountain.prefecture,
      difficulty: mountain.difficulty,
      description: mountain.description,
      recommendedSeason: mountain.recommendedSeason,
      estimatedTime: mountain.estimatedTime,
      imageUrl: mountain.imageUrl,
      stampText: mountain.stampDesign.text,
      stampIcon: mountain.stampDesign.icon,
      stampColor: mountain.stampDesign.color,
      stampBgColor: mountain.stampDesign.bgColor,
      stampBorderColor: mountain.stampDesign.borderColor,
    })),
  ).onDuplicateKeyUpdate({ set: { id: sql`values(id)` } });

  await db.insert(albums).values(
    PRELOADED_ALBUMS.map((album) => ({
      id: album.id,
      title: album.title,
      description: album.description,
      coverColor: album.coverColor,
      accentColor: album.accentColor,
    })),
  ).onDuplicateKeyUpdate({ set: { id: sql`values(id)` } });

  const albumMountainRows = PRELOADED_ALBUMS.flatMap((album) =>
    album.mountainIds.map((mountainId, position) => ({
      albumId: album.id,
      mountainId,
      position,
    })),
  );
  await db.insert(albumMountains).values(albumMountainRows)
    .onDuplicateKeyUpdate({ set: { position: sql`values(position)` } });

  await db.insert(badges).values(
    ALL_BADGES.map((badge) => ({
      id: badge.id,
      title: badge.title,
      description: badge.description,
      icon: badge.icon,
      requirement: badge.requirement,
    })),
  ).onDuplicateKeyUpdate({ set: { id: sql`values(id)` } });

  await db.insert(challengeTemplates).values(
    INITIAL_CHALLENGES.map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      xpReward: challenge.xpReward,
    })),
  ).onDuplicateKeyUpdate({ set: { id: sql`values(id)` } });

  console.info(`Migrated ${PRELOADED_MOUNTAINS.length} mountains, ${PRELOADED_ALBUMS.length} albums, ${ALL_BADGES.length} badges, and ${INITIAL_CHALLENGES.length} challenge templates.`);
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
