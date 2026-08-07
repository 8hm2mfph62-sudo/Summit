import { FormEvent, useEffect, useState } from "react";
import { Award, Check, Edit2, Flame, HelpCircle, LogOut, RefreshCw, Send, Settings, Trophy } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge, ClimbRecord, UserProfile, getCompanionEvolutionForLevel, getRankInfo } from "../types";

type CompanionAnimal = "squirrel" | "fox" | "bear" | "rabbit" | "owl" | "deer" | "cat" | "dog";

interface MyPageViewProps {
  badges: Badge[];
  userProfile: UserProfile;
  records: ClimbRecord[];
  onUpdateProfile: (input: {
    nickname: string;
    bio: string;
    avatarUrl: string;
    companionName: string;
    companionAnimal: CompanionAnimal;
    companionSkinStage: number;
    homePrefecture: string;
    preferredCondition: string;
  }) => Promise<void>;
  onResetProgress: () => Promise<void>;
  onLogout: () => void;
}

const avatars = ["🧗", "🎒", "🌲", "⛰️", "🦌", "🦊", "🦉", "🏕️", "🔥", "🌸"];
const companions = [
  ["squirrel", "🐿️ リス"], ["fox", "🦊 キツネ"], ["bear", "🐻 クマ"], ["rabbit", "🐰 ウサギ"],
  ["owl", "🦉 フクロウ"], ["deer", "🦌 シカ"], ["cat", "🐱 ネコ"], ["dog", "🐶 イヌ"],
] as const;

export default function MyPageView({ badges, userProfile, records, onUpdateProfile, onResetProgress, onLogout }: MyPageViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(userProfile.nickname);
  const [bio, setBio] = useState(userProfile.bio);
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatarUrl);
  const [companionName, setCompanionName] = useState(userProfile.companionName || "ヤマコ");
  const [companionAnimal, setCompanionAnimal] = useState<CompanionAnimal>((userProfile.companionAnimal as CompanionAnimal) || "squirrel");
  const [homePrefecture, setHomePrefecture] = useState(userProfile.homePrefecture || "京都");
  const [preferredCondition, setPreferredCondition] = useState(userProfile.preferredCondition || "景色重視");
  const [saving, setSaving] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryType, setInquiryType] = useState<"bug" | "question" | "feedback" | "other">("question");
  const [inquiryTitle, setInquiryTitle] = useState("");
  const [inquiryContent, setInquiryContent] = useState("");

  const inquiriesQuery = trpc.mountain.inquiries.list.useQuery(undefined, { enabled: showInquiry });
  const createInquiry = trpc.mountain.inquiries.create.useMutation({
    onSuccess: async () => {
      await inquiriesQuery.refetch();
      setInquiryTitle("");
      setInquiryContent("");
      toast.success("お問い合わせを保存しました。");
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    setNickname(userProfile.nickname);
    setBio(userProfile.bio);
    setAvatarUrl(userProfile.avatarUrl);
    setCompanionName(userProfile.companionName || "ヤマコ");
    setCompanionAnimal((userProfile.companionAnimal as CompanionAnimal) || "squirrel");
    setHomePrefecture(userProfile.homePrefecture || "京都");
    setPreferredCondition(userProfile.preferredCondition || "景色重視");
  }, [userProfile]);

  const activeCompanion = getCompanionEvolutionForLevel(companionAnimal, userProfile.level);
  const distinctMountains = new Set(records.map((record) => record.mountainId)).size;
  const photoCount = records.reduce((sum, record) => sum + record.photos.length, 0);

  async function saveProfile() {
    if (!nickname.trim() || !companionName.trim()) {
      toast.error("ニックネームとパートナー名を入力してください。");
      return;
    }
    setSaving(true);
    try {
      await onUpdateProfile({
        nickname: nickname.trim(), bio: bio.trim(), avatarUrl, companionName: companionName.trim(),
        companionAnimal,
        companionSkinStage: userProfile.companionSkinStage || 1, homePrefecture, preferredCondition,
      });
      setIsEditing(false);
      toast.success("プロフィールを保存しました。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "プロフィールを保存できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function submitInquiry(event: FormEvent) {
    event.preventDefault();
    if (!inquiryTitle.trim() || !inquiryContent.trim()) {
      toast.error("件名と内容を入力してください。");
      return;
    }
    await createInquiry.mutateAsync({ type: inquiryType, title: inquiryTitle.trim(), content: inquiryContent.trim() });
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 pb-24 px-4 text-left">
      <section className="forest-gradient text-white p-6 rounded-3xl shadow-xl border-2 border-amber-100 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] font-black text-green-200">ADVENTURER PROFILE</p>
            <h1 className="mt-1 text-2xl font-black font-display-heavy">{avatarUrl} {userProfile.nickname}</h1>
            <p className="mt-2 text-xs text-green-100 line-clamp-2">{userProfile.bio || "山頂で集めた思い出を、ここに刻もう。"}</p>
          </div>
          <div className={`shrink-0 px-3 py-1.5 rounded-xl border bg-white/10 text-xs font-black ${getRankInfo(userProfile.level).borderColor}`}>
            {getRankInfo(userProfile.level).emoji} Lv.{userProfile.level}
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/20 text-center">
          <div><p className="text-xl font-black">{records.length}</p><p className="text-[9px] text-green-100">登頂回数</p></div>
          <div><p className="text-xl font-black">{distinctMountains}</p><p className="text-[9px] text-green-100">獲得スタンプ</p></div>
          <div><p className="text-xl font-black">{photoCount}</p><p className="text-[9px] text-green-100">写真</p></div>
        </div>
      </section>

      <section className="bg-white p-5 rounded-2xl border border-amber-900/5 shadow-xs space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-sm font-black text-emerald-950 flex items-center gap-1.5"><Settings className="w-4 h-4" />プロフィール設定</h2><button onClick={() => setIsEditing((value) => !value)} className="text-xs font-black text-emerald-700 flex items-center gap-1"><Edit2 className="w-3.5 h-3.5" />{isEditing ? "閉じる" : "編集"}</button></div>
        {isEditing ? <div className="space-y-4 text-sm">
          <label className="block text-xs font-bold text-stone-600">ニックネーム<input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={80} className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5" /></label>
          <label className="block text-xs font-bold text-stone-600">ひとこと<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={5000} className="mt-1.5 w-full min-h-20 rounded-xl border border-stone-200 px-3 py-2.5" /></label>
          <div><p className="text-xs font-bold text-stone-600">アバター</p><div className="mt-2 flex flex-wrap gap-2">{avatars.map((avatar) => <button key={avatar} onClick={() => setAvatarUrl(avatar)} className={`h-9 w-9 rounded-lg text-lg ${avatarUrl === avatar ? "bg-emerald-100 ring-2 ring-emerald-600" : "bg-stone-50"}`}>{avatar}</button>)}</div></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-stone-600">パートナー名<input value={companionName} onChange={(event) => setCompanionName(event.target.value)} maxLength={80} className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5" /></label><label className="text-xs font-bold text-stone-600">パートナー<select value={companionAnimal} onChange={(event) => setCompanionAnimal(event.target.value as CompanionAnimal)} className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5">{companions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-stone-600">活動エリア<input value={homePrefecture} onChange={(event) => setHomePrefecture(event.target.value)} maxLength={64} className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5" /></label><label className="text-xs font-bold text-stone-600">登山のこだわり<select value={preferredCondition} onChange={(event) => setPreferredCondition(event.target.value)} className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5"><option>景色重視</option><option>体力づくり</option><option>初心者向け</option><option>歴史・寺社巡り</option><option>大自然・秘境</option></select></label></div>
          <button disabled={saving} onClick={saveProfile} className="w-full rounded-xl bg-[#2D5A27] py-3 text-xs font-black text-white disabled:opacity-60">{saving ? "保存中…" : "変更を保存する"}</button>
        </div> : <div className="flex items-center gap-3 rounded-xl bg-emerald-50/50 p-3"><span className="text-3xl">{activeCompanion.emoji}</span><div><p className="text-xs font-black text-emerald-950">{userProfile.companionName || "ヤマコ"} — {activeCompanion.title}</p><p className="mt-0.5 text-[10px] text-stone-500">{homePrefecture}を拠点に「{preferredCondition}」の山を探しています。</p></div></div>}
      </section>

      <section className="bg-white p-5 rounded-2xl border border-amber-900/5 shadow-xs space-y-3"><h2 className="text-sm font-black text-emerald-950 flex items-center gap-1.5"><Award className="w-4 h-4 text-amber-500" />獲得した冒険バッジ</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{badges.map((badge) => { const unlocked = userProfile.unlockedBadges.includes(badge.id); return <div key={badge.id} className={`flex gap-3 rounded-xl border p-3 ${unlocked ? "border-amber-200 bg-amber-50/40" : "border-stone-100 bg-stone-50 opacity-55 grayscale"}`}><span className="text-xl">{badge.icon}</span><div><p className="text-xs font-black">{badge.title}</p><p className="mt-0.5 text-[10px] text-stone-500">{badge.requirement}</p></div>{unlocked && <Check className="ml-auto h-4 w-4 text-emerald-600" />}</div>; })}</div></section>

      <section className="bg-white p-5 rounded-2xl border border-amber-900/5 shadow-xs space-y-3"><div className="flex items-center justify-between"><h2 className="text-sm font-black text-emerald-950 flex items-center gap-1.5"><HelpCircle className="w-4 h-4" />お問い合わせ</h2><button onClick={() => setShowInquiry((value) => !value)} className="text-xs font-black text-emerald-700">{showInquiry ? "閉じる" : "履歴・新規作成"}</button></div>{showInquiry && <div className="space-y-4"><form onSubmit={submitInquiry} className="space-y-2 rounded-xl bg-stone-50 p-3"><select value={inquiryType} onChange={(event) => setInquiryType(event.target.value as typeof inquiryType)} className="w-full rounded-lg border border-stone-200 bg-white p-2 text-xs"><option value="question">質問</option><option value="bug">不具合</option><option value="feedback">ご意見</option><option value="other">その他</option></select><input value={inquiryTitle} onChange={(event) => setInquiryTitle(event.target.value)} placeholder="件名" maxLength={255} className="w-full rounded-lg border border-stone-200 p-2 text-xs" /><textarea value={inquiryContent} onChange={(event) => setInquiryContent(event.target.value)} placeholder="お問い合わせ内容" maxLength={10000} className="w-full min-h-24 rounded-lg border border-stone-200 p-2 text-xs" /><button disabled={createInquiry.isPending} className="w-full rounded-lg bg-emerald-700 py-2 text-xs font-black text-white disabled:opacity-60"><Send className="mr-1 inline h-3.5 w-3.5" />{createInquiry.isPending ? "送信中…" : "送信して保存"}</button></form><div className="space-y-2">{inquiriesQuery.isLoading ? <p className="text-xs text-stone-400">履歴を読み込んでいます。</p> : inquiriesQuery.data?.length ? inquiriesQuery.data.map((item) => <div key={item.id} className="rounded-xl border border-stone-100 p-3"><div className="flex justify-between gap-2"><p className="text-xs font-black text-stone-800">{item.title}</p><span className="text-[10px] text-emerald-700">{item.status}</span></div><p className="mt-1 line-clamp-2 text-[10px] text-stone-500">{item.content}</p></div>) : <p className="text-xs text-stone-400">保存済みのお問い合わせはありません。</p>}</div></div>}</section>

      <section className="grid grid-cols-2 gap-3"><button onClick={() => setShowReset(true)} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-xs font-black text-amber-800"><RefreshCw className="mb-2 h-4 w-4" />進捗を初期化</button><button onClick={onLogout} className="rounded-2xl border border-stone-200 bg-white p-4 text-left text-xs font-black text-stone-700"><LogOut className="mb-2 h-4 w-4" />ログアウト</button></section>
      {showReset && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"><Trophy className="mx-auto h-8 w-8 text-amber-500" /><h3 className="mt-3 text-center text-sm font-black">登頂記録と進捗を初期化しますか？</h3><p className="mt-2 text-center text-xs leading-relaxed text-stone-500">保存済みの登頂記録、獲得XP、バッジ、クエスト進行を削除します。この操作は取り消せません。</p><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => setShowReset(false)} className="rounded-xl bg-stone-100 py-2.5 text-xs font-black">キャンセル</button><button onClick={async () => { try { await onResetProgress(); setShowReset(false); toast.success("進捗を初期化しました。"); } catch (error) { toast.error(error instanceof Error ? error.message : "初期化できませんでした。"); } }} className="rounded-xl bg-red-600 py-2.5 text-xs font-black text-white">初期化する</button></div></div></div>}
    </div>
  );
}
