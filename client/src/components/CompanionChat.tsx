import { FormEvent, useEffect, useMemo, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { trpc } from "@/lib/trpc";
import { ClimbRecord, UserProfile } from "../types";

export interface AnimalMeta {
  emoji: string;
  label: string;
  suffix: string;
}

export const ANIMAL_METAS: Record<string, AnimalMeta> = {
  squirrel: { emoji: "🐿️", label: "シマリス", suffix: "のだ" },
  fox: { emoji: "🦊", label: "キツネ", suffix: "コン" },
  bear: { emoji: "🐻", label: "クマ", suffix: "クマ" },
  rabbit: { emoji: "🐰", label: "ウサギ", suffix: "ピョン" },
  owl: { emoji: "🦉", label: "フクロウ", suffix: "ホゥ" },
  deer: { emoji: "🦌", label: "シカ", suffix: "しか" },
  cat: { emoji: "🐱", label: "ネコ", suffix: "にゃ" },
  dog: { emoji: "🐶", label: "イヌ", suffix: "ワン" },
};

interface CompanionChatProps {
  userProfile: UserProfile;
  records: ClimbRecord[];
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
  inline?: boolean;
  isOnline?: boolean;
  initialPrompt?: string;
}

export default function CompanionChat({
  userProfile,
  records,
  isOpen = false,
  setIsOpen,
  inline = false,
  initialPrompt,
}: CompanionChatProps) {
  const [input, setInput] = useState(initialPrompt ?? "");
  const messageQuery = trpc.mountain.companion.list.useQuery(undefined, {
    enabled: isOpen || inline,
  });
  const sendMessage = trpc.mountain.companion.send.useMutation();
  const meta =
    ANIMAL_METAS[userProfile.companionAnimal || "squirrel"] ||
    ANIMAL_METAS.squirrel;
  const title = `${userProfile.companionName || "ヤマコ"}と話す`;
  const recordSummary = useMemo(
    () => `${records.length}件の登頂記録をもとに、`,
    [records.length]
  );

  useEffect(() => {
    if (initialPrompt) setInput(initialPrompt);
  }, [initialPrompt]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || sendMessage.isPending) return;
    await sendMessage.mutateAsync({ text });
    setInput("");
    await messageQuery.refetch();
  }

  const content = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative overflow-hidden border-b border-emerald-900/10 bg-gradient-to-br from-emerald-50 via-[#FDFBF4] to-amber-50 px-4 pb-4 pt-3">
        <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-emerald-200/30 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-emerald-900/10 ring-4 ring-white shadow-lg"
          >
            <span className="text-7xl leading-none drop-shadow-md">
              {meta.emoji}
            </span>
            <span className="absolute -bottom-1 -right-1 rounded-full bg-amber-300 px-2 py-1 text-[9px] font-black text-emerald-950 shadow-sm">
              ヤマコ
            </span>
          </motion.div>
          <div className="min-w-0">
            <p className="text-base font-black text-emerald-950">{title}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-stone-500">
              {recordSummary}安全な登山準備を一緒に確認します。
            </p>
            <p className="mt-1 text-[10px] font-bold text-emerald-700">
              {meta.label}のヤマコが待っているのだ！
              Geminiが安全確認をサポート。
            </p>
          </div>
        </div>
        <p className="relative mt-2 text-[10px] text-stone-500">
          会話はあなたのアカウントに保存されます。
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-[#FDFBF4] p-4">
        {messageQuery.isLoading ? (
          <p className="text-center text-xs text-stone-400">
            会話履歴を読み込んでいます。
          </p>
        ) : messageQuery.data?.length ? (
          messageQuery.data.map(message => (
            <div
              key={message.id}
              className={`max-w-[86%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${message.role === "user" ? "ml-auto bg-emerald-700 text-white" : "bg-white text-stone-700 border border-emerald-900/5"}`}
            >
              <p>{message.text}</p>
              <time
                className={`mt-1 block text-[9px] ${message.role === "user" ? "text-emerald-100" : "text-stone-400"}`}
              >
                {new Date(message.createdAt).toLocaleString()}
              </time>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-center">
            <p className="text-sm">{meta.emoji}</p>
            <p className="mt-1 text-xs font-black text-emerald-950">
              {recordSummary}安全な登山準備を一緒に確認します。
            </p>
            <p className="mt-1 text-[10px] text-stone-500">
              装備や天気、出発前の確認を質問してください。
            </p>
          </div>
        )}
      </div>
      <form
        onSubmit={submit}
        className="border-t border-emerald-900/10 bg-white p-3"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={event => setInput(event.target.value)}
            maxLength={2000}
            placeholder="装備や安全確認について質問する"
            className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
          />
          <button
            disabled={sendMessage.isPending || !input.trim()}
            className="rounded-xl bg-emerald-700 px-3 text-white disabled:opacity-50"
            aria-label="メッセージを保存して送信"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {sendMessage.error && (
          <p className="mt-1 text-[10px] text-red-600">
            {sendMessage.error.message}
          </p>
        )}
      </form>
    </div>
  );

  if (inline)
    return (
      <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
        {content}
      </section>
    );
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-x-3 bottom-3 z-50 flex h-[min(72vh,620px)] flex-col overflow-hidden rounded-3xl border-2 border-[#EAE2D1] bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between bg-[#2D5A27] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs font-black">登山アシスタント</span>
            </div>
            <button
              onClick={() => setIsOpen?.(false)}
              className="rounded-lg p-1 hover:bg-white/10"
              aria-label="会話を閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {content}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
