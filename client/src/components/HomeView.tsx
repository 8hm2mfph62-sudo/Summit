/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Mountain,
  Album,
  ClimbRecord,
  UserProfile,
  DailyChallenge,
  getRankInfo,
} from "../types";
import {
  Award,
  BellRing,
  Compass,
  Heart,
  Calendar,
  CheckSquare,
  Square,
  ChevronRight,
  BookOpen,
  Star,
  RefreshCw,
} from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

interface HomeViewProps {
  mountains: Mountain[];
  albums: Album[];
  userProfile: UserProfile;
  records: ClimbRecord[];
  challenges: DailyChallenge[];
  announcements: Array<{
    id: string;
    title: string;
    body: string;
    category: "info" | "safety" | "maintenance" | "event";
    publishedAt: string | null;
  }>;
  onSelectMountain: (id: string) => void;
  onNavigateTab: (tab: "home" | "search" | "album" | "mypage") => void;
  completeChallenge: (challengeId: string) => void;
  onOpenCompanion?: () => void;
}

export default function HomeView({
  mountains,
  albums,
  userProfile,
  records,
  challenges,
  announcements,
  onSelectMountain,
  onNavigateTab,
  completeChallenge,
  onOpenCompanion,
}: HomeViewProps) {
  const [recommendedMountain, setRecommendedMountain] =
    useState<Mountain | null>(mountains[0] ?? null);

  // Choose a recommended mountain statically or based on daily rotation
  useEffect(() => {
    // Let's recommend a mountain that has NOT been climbed yet, if possible, or otherwise an easy one
    const unclimbed = mountains.filter(
      m => !records.some(r => r.mountainId === m.id)
    );
    if (unclimbed.length > 0) {
      setRecommendedMountain(unclimbed[0]);
    } else {
      setRecommendedMountain(mountains[0] ?? null);
    }
  }, [mountains, records]);

  // Statistics
  const totalClimbs = records.length;
  const distinctMountainsClimbed = new Set(records.map(r => r.mountainId)).size;

  // Completed albums check
  const completedAlbumsCount = albums.filter(album =>
    album.mountainIds.every(mId => records.some(r => r.mountainId === mId))
  ).length;

  // XP Progress Percentage
  const xpPercent = Math.min(100, Math.floor((userProfile.xp % 150) / 1.5));

  // Recent 5 climb records
  const recentRecords = [...records]
    .sort(
      (a, b) =>
        new Date(b.climbDate).getTime() - new Date(a.climbDate).getTime()
    )
    .slice(0, 5);

  if (!recommendedMountain) {
    return (
      <div className="w-full max-w-xl mx-auto p-8 text-center text-sm font-bold text-emerald-800">
        山カタログを読み込んでいます。
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 pb-24 px-4">
      {/* 1. Welcome Card Header */}
      <div className="p-6 forest-gradient text-white rounded-3xl shadow-xl relative overflow-hidden border-2 border-amber-100">
        {/* Absolute visual patterns */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="relative flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-green-200 tracking-widest font-black uppercase">
              Current Adventure
            </p>
            <h2 className="text-2xl font-black flex items-center gap-1.5 font-display-heavy">
              <span>こんにちは、{userProfile.nickname}さん！</span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Interactive Yamako Mascot Badge */}
            <motion.div
              onClick={onOpenCompanion}
              className="relative cursor-pointer group select-none flex flex-col items-center justify-center bg-white/15 hover:bg-white/25 border-2 border-emerald-200/50 hover:border-amber-200 px-4 py-2 rounded-3xl transition-all shadow-lg shadow-black/10"
              title="ヤマコとお話しする！"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Micro-speech bubble */}
              <div
                className="absolute -top-9 left-1/2 -translate-x-1/2 bg-white text-[#2D5A27] border border-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-xs whitespace-nowrap animate-bounce"
                style={{ animationDuration: "3s" }}
              >
                話すのだ！🐿️
                <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-1 h-1 bg-white border-b border-r border-emerald-800 transform rotate-45"></div>
              </div>
              <div className="relative mt-1 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900/40 ring-2 ring-amber-200/70 shadow-inner">
                <span className="text-5xl leading-none filter drop-shadow-md transition-transform group-hover:scale-110">
                  🐿️
                </span>
                <span className="absolute -bottom-1 -left-1 text-base">🎒</span>
              </div>
              <span className="mt-1 text-[11px] font-black text-white leading-none">
                ヤマコ
              </span>
              <span className="mt-1 rounded-full bg-amber-300 px-2 py-0.5 text-[8px] font-black text-emerald-950">
                話しかける
              </span>
            </motion.div>

            <div className="text-right shrink-0 flex flex-col items-end">
              <span className="text-[9px] font-mono tracking-widest text-emerald-300 block font-black mb-1">
                GUILD RANK
              </span>
              <div
                className={`px-2.5 py-1 rounded-xl text-white font-black bg-gradient-to-r ${getRankInfo(userProfile.level).badgeColor} flex items-center gap-1.5 shadow-md border border-white/20 text-xs`}
              >
                <span>{getRankInfo(userProfile.level).emoji}</span>
                <span>{getRankInfo(userProfile.level).name}</span>
              </div>
              <span className="text-[9px] text-green-200 font-bold block mt-1">
                (冒険者 Lv.{userProfile.level})
              </span>
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mt-4 space-y-1 relative">
          <div className="flex justify-between text-[10px] font-black tracking-wider text-green-100">
            <span>ランクアップ経験値</span>
            <span>
              {userProfile.level >= 10
                ? "MAX"
                : `${userProfile.xp % 150} / 150 XP`}
            </span>
          </div>
          <div className="w-full h-3 bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full xp-bar-fill rounded-full"
            ></motion.div>
          </div>
        </div>
      </div>

      {announcements.length > 0 && (
        <section className="bg-white p-5 rounded-2xl border border-amber-900/5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
              <BellRing className="w-4.5 h-4.5 text-amber-500" />
              <span>お知らせ</span>
            </h4>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-800">
              NEW
            </span>
          </div>
          <div className="space-y-2">
            {announcements.map(announcement => (
              <div
                key={announcement.id}
                className="rounded-xl border border-stone-100 bg-stone-50/60 p-3"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${announcement.category === "safety" ? "bg-amber-100 text-amber-900" : announcement.category === "maintenance" ? "bg-violet-100 text-violet-800" : announcement.category === "event" ? "bg-rose-100 text-rose-800" : "bg-sky-100 text-sky-800"}`}
                  >
                    {announcement.category === "safety"
                      ? "安全"
                      : announcement.category === "maintenance"
                        ? "メンテナンス"
                        : announcement.category === "event"
                          ? "イベント"
                          : "お知らせ"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-stone-800">
                      {announcement.title}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[10px] leading-relaxed text-stone-600">
                      {announcement.body}
                    </p>
                    {announcement.publishedAt && (
                      <p className="mt-1 text-[9px] text-stone-400">
                        {new Intl.DateTimeFormat("ja-JP", {
                          month: "numeric",
                          day: "numeric",
                        }).format(new Date(announcement.publishedAt))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Adventure Statistics (Row of Bento Cards) */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-white border border-amber-900/5 shadow-xs rounded-xl text-center flex flex-col justify-between h-24">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            登頂回数
          </span>
          <span className="text-2xl font-black text-gray-800 font-mono block leading-none">
            {totalClimbs}回
          </span>
          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 rounded-full py-0.5 px-1 inline-block">
            制覇数: {distinctMountainsClimbed}
          </span>
        </div>

        <div
          onClick={() => onNavigateTab("album")}
          className="p-3 bg-white border border-amber-900/5 hover:border-emerald-700/20 shadow-xs hover:shadow-md rounded-xl text-center flex flex-col justify-between h-24 cursor-pointer transition-all active:scale-95 group"
          title="アルバム本棚を開く"
        >
          <span className="text-[10px] font-bold text-gray-400 group-hover:text-emerald-700 uppercase tracking-wider block transition-colors">
            アルバム
          </span>
          <span className="text-2xl font-black text-gray-800 font-mono block leading-none group-hover:scale-105 transition-transform">
            {completedAlbumsCount}冊
          </span>
          <span className="text-[9px] font-semibold text-sky-750 bg-sky-50 group-hover:bg-sky-100 rounded-full py-0.5 px-1 inline-block transition-colors">
            開く →
          </span>
        </div>

        <div className="p-3 bg-white border border-amber-900/5 shadow-xs rounded-xl text-center flex flex-col justify-between h-24">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            獲得スタンプ
          </span>
          <span className="text-2xl font-black text-gray-800 font-mono block leading-none">
            {distinctMountainsClimbed}枚
          </span>
          <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 rounded-full py-0.5 px-1 inline-block">
            バッジ数: {userProfile.unlockedBadges.length}
          </span>
        </div>
      </div>

      {/* 3. Today's Recommended Mountain */}
      <div className="bg-white p-5 rounded-2xl border border-amber-900/5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
            <Compass className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
            <span>今日のおすすめ山頂</span>
          </h4>
          <span className="text-[10px] font-extrabold tracking-wider text-amber-700 px-2 py-0.5 rounded-full bg-amber-100 uppercase">
            CHALLENGE PROPOSAL
          </span>
        </div>

        {/* Big visual recommendation card */}
        <div
          onClick={() => onSelectMountain(recommendedMountain.id)}
          className="relative group h-48 rounded-[32px] overflow-hidden cursor-pointer border-4 border-white shadow-xl flex items-end p-5 hover:scale-[1.01] transition-transform"
        >
          <img
            src={recommendedMountain.imageUrl}
            alt={recommendedMountain.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          {/* Shading overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>

          {/* Details */}
          <div className="relative z-10 text-white w-full">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] bg-sky-400 text-black font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {recommendedMountain.prefecture}エリア
                </span>
                <h3 className="text-3xl font-black mt-1 font-display-heavy tracking-tight">
                  {recommendedMountain.name}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold block opacity-80">
                  標高
                </span>
                <span className="text-2xl font-mono font-black text-[#FFD700]">
                  {recommendedMountain.elevation}m
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/20 mt-3 pt-2 text-xs text-gray-200">
              <span className="flex items-center gap-1 font-black">
                難易度:{" "}
                {recommendedMountain.difficulty === "beginner"
                  ? "★☆☆"
                  : recommendedMountain.difficulty === "intermediate"
                    ? "★★☆"
                    : "★★★"}
              </span>
              <span className="text-[#FFD700] font-black flex items-center gap-0.5">
                <span>詳しく見る →</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Daily Challenges */}
      <div className="bg-white p-5 rounded-2xl border border-amber-900/5 shadow-xs space-y-4">
        <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
          <Award className="w-4.5 h-4.5 text-amber-500" />
          <span>デイリークエスト</span>
        </h4>

        <div className="space-y-3">
          {challenges.map(ch => (
            <div
              key={ch.id}
              className={`p-3 rounded-xl border flex flex-col gap-2 transition-colors ${
                ch.isCompleted
                  ? "bg-emerald-50/40 border-emerald-900/10 text-gray-500"
                  : "bg-amber-50/10 border-amber-900/5 text-gray-800"
              }`}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="shrink-0 text-emerald-600">
                  {ch.isCompleted ? (
                    <CheckSquare className="w-5 h-5 text-emerald-650" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 space-y-0.5 text-left">
                  <p
                    className={`text-xs font-bold leading-tight ${ch.isCompleted ? "line-through text-gray-400" : "text-gray-800"}`}
                  >
                    {ch.title}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-snug">
                    {ch.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full ${
                      ch.isCompleted
                        ? "bg-gray-100 text-gray-400"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    +{ch.xpReward} XP
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Recent Activity Horizontal Scroll */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
            <BookOpen className="w-4.5 h-4.5 text-emerald-600" />
            <span>最近登った山</span>
          </h4>
          <button
            onClick={() => onNavigateTab("album")}
            className="px-3 py-1.5 bg-[#2D5A27] hover:bg-[#1E3C1A] text-white font-black text-[11px] rounded-full flex items-center gap-1 shadow-xs hover:shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 group"
          >
            <span>アルバム一覧 📖</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform stroke-[2.5]" />
          </button>
        </div>

        {recentRecords.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-amber-900/5 text-gray-400 space-y-2">
            <p className="text-sm font-bold">まだ登頂記録がありません。</p>
            <p className="text-xs">
              「山を探す」から登頂した山を記録してみましょう！
            </p>
            <button
              onClick={() => onNavigateTab("search")}
              className="mt-3 px-4 py-2 bg-emerald-650 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              近くの山を探しに行く 🏔️
            </button>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-thin">
            {recentRecords.map(rec => {
              const mountain = mountains.find(m => m.id === rec.mountainId);
              if (!mountain) return null;

              return (
                <div
                  key={rec.id}
                  onClick={() => onSelectMountain(mountain.id)}
                  className="w-48 bg-white border border-amber-900/5 shadow-xs hover:shadow-md rounded-xl p-3 shrink-0 cursor-pointer space-y-2.5 transition-shadow"
                >
                  {/* Photo or map icon placeholder */}
                  <div className="h-28 rounded-lg overflow-hidden relative bg-emerald-950">
                    <img
                      src={
                        rec.photos.length > 0
                          ? rec.photos[0]
                          : mountain.imageUrl
                      }
                      alt={mountain.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {/* Timestamp overlay */}
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono font-bold text-white">
                      {rec.climbDate}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-gray-800 line-clamp-1">
                      {mountain.name}
                    </h5>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                      <span>標高 {mountain.elevation}m</span>
                    </p>
                    {rec.memo && (
                      <p className="text-[10px] text-gray-400 italic line-clamp-1 pl-1 border-l border-amber-900/20">
                        「{rec.memo}」
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
