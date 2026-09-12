const MAX_COMPANION_REPLY_CHARS = 240;

/**
 * Keep companion replies readable on a phone screen in the mountains.
 * The LLM is instructed to be concise, but this guard also protects the UI
 * when a model returns unexpectedly long text.
 */
export function compactCompanionReply(text: string): string {
  const normalized = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalized.length <= MAX_COMPANION_REPLY_CHARS) return normalized;

  const shortened = normalized.slice(0, MAX_COMPANION_REPLY_CHARS - 1);
  const boundary = Math.max(
    shortened.lastIndexOf("。"),
    shortened.lastIndexOf("！"),
    shortened.lastIndexOf("？"),
    shortened.lastIndexOf("\n"),
  );
  const safeEnd = boundary >= 120 ? boundary + 1 : shortened.length;
  return `${shortened.slice(0, safeEnd).trim()}…`;
}

export const companionReplyGuidance = [
  "回答は日本語で、山中のスマホでも読める短文にする。",
  "2〜4文、または最大3個の短い箇条書きにする。",
  "目安は120文字、絶対に240文字以内。前置きや長い説明は省く。",
  "安全に関わる内容は、最優先の注意を最初に1点だけ伝える。",
].join("\n");
