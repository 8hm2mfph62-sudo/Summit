import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  ClipboardList,
  FileDown,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { exportPlanPdf } from "@/lib/planPdf";

type MountainOption = {
  id: string;
  name: string;
  elevation: number;
  prefecture: string;
};
type PlanSuggestion = {
  summary: string;
  patch: {
    title?: string;
    mountainName?: string | null;
    planDate?: string | null;
    meetingTime?: string | null;
    meetingPlace?: string | null;
    routeSummary?: string | null;
    transport?: string | null;
    notes?: string | null;
    equipmentChecklist?: string[];
    safetyNote?: string | null;
  };
};

export default function PlansView({
  mountains,
  onBack,
}: {
  mountains: MountainOption[];
  onBack: () => void;
}) {
  const utils = trpc.useUtils();
  const plansQuery = trpc.mountain.plans.list.useQuery();
  const friendsQuery = trpc.mountain.friends.me.useQuery();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<"friends" | "ai" | null>(null);
  const detailQuery = trpc.mountain.plans.get.useQuery(
    { planId: selectedPlanId || "" },
    { enabled: Boolean(selectedPlanId) }
  );
  const createFriends = trpc.mountain.plans.createFriends.useMutation();
  const createAi = trpc.mountain.plans.createAi.useMutation();
  const respondInvite = trpc.mountain.plans.respondInvite.useMutation();
  const sendMessage = trpc.mountain.plans.sendMessage.useMutation();
  const sendAiTurn = trpc.mountain.plans.aiTurn.useMutation();
  const updatePlan = trpc.mountain.plans.update.useMutation();
  const suggestFromGroup = trpc.mountain.plans.suggestFromGroup.useMutation();
  const [suggestion, setSuggestion] = useState<PlanSuggestion | null>(null);
  const [message, setMessage] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    mountainId: "",
    planDate: "",
    meetingTime: "",
    meetingPlace: "",
    routeSummary: "",
    transport: "",
    notes: "",
    equipmentChecklist: "",
    safetyNote: "",
  });

  const detail = detailQuery.data;
  const selectedMountain = useMemo(
    () => mountains.find(mountain => mountain.id === draft.mountainId),
    [draft.mountainId, mountains]
  );
  const acceptedFriends = (friendsQuery.data?.friends || []).filter(
    friend => friend.status === "accepted"
  );

  useEffect(() => {
    if (!detail) return;
    const plan = detail.plan;
    setDraft({
      title: plan.title,
      mountainId: plan.mountainId || "",
      planDate: plan.planDate || "",
      meetingTime: plan.meetingTime || "",
      meetingPlace: plan.meetingPlace || "",
      routeSummary: plan.routeSummary || "",
      transport: plan.transport || "",
      notes: plan.notes || "",
      equipmentChecklist: plan.equipmentChecklist.join("\n"),
      safetyNote: plan.safetyNote || "",
    });
    setSuggestion(null);
  }, [detail?.plan.id, detail?.plan.version]);

  async function refreshPlans(planId?: string) {
    await utils.mountain.plans.list.invalidate();
    if (planId || selectedPlanId) {
      await utils.mountain.plans.get.invalidate({
        planId: planId || selectedPlanId || "",
      });
    }
  }

  async function createGroupPlan(event: FormEvent) {
    event.preventDefault();
    if (!groupTitle.trim()) return;
    try {
      const detail = await createFriends.mutateAsync({
        title: groupTitle.trim(),
        friendIds: selectedFriendIds,
      });
      setSelectedPlanId(detail.plan.id);
      setCreateMode(null);
      setGroupTitle("");
      setSelectedFriendIds([]);
      await refreshPlans(detail.plan.id);
      toast.success("フレンドとの登山計画書を作成しました。");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "計画書を作成できませんでした。"
      );
    }
  }

  async function createAiPlan() {
    try {
      const detail = await createAi.mutateAsync();
      setSelectedPlanId(detail.plan.id);
      setCreateMode(null);
      await refreshPlans(detail.plan.id);
      toast.success("ヤマコとの計画づくりを始めます。");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "計画書を作成できませんでした。"
      );
    }
  }

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    const body = message.trim();
    if (!detail || !body) return;
    try {
      if (detail.plan.mode === "ai") {
        await sendAiTurn.mutateAsync({
          planId: detail.plan.id,
          expectedVersion: detail.plan.version,
          text: body,
        });
      } else {
        await sendMessage.mutateAsync({ planId: detail.plan.id, body });
      }
      setMessage("");
      await refreshPlans(detail.plan.id);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "メッセージを送信できませんでした。"
      );
    }
  }

  async function savePlan(overwrite?: PlanSuggestion["patch"]) {
    if (!detail) return;
    const source = overwrite
      ? {
          ...draft,
          ...overwrite,
          equipmentChecklist:
            overwrite.equipmentChecklist?.join("\n") ??
            draft.equipmentChecklist,
        }
      : draft;
    try {
      await updatePlan.mutateAsync({
        planId: detail.plan.id,
        expectedVersion: detail.plan.version,
        patch: {
          title: source.title.trim(),
          mountainId: source.mountainId || null,
          ...(overwrite?.mountainName
            ? { mountainName: overwrite.mountainName }
            : {}),
          planDate: source.planDate || null,
          meetingTime: source.meetingTime || null,
          meetingPlace: source.meetingPlace || null,
          routeSummary: source.routeSummary || null,
          transport: source.transport || null,
          notes: source.notes || null,
          equipmentChecklist: source.equipmentChecklist
            .split("\n")
            .map(item => item.trim())
            .filter(Boolean),
          safetyNote: source.safetyNote || null,
        },
      });
      setSuggestion(null);
      setIsEditing(false);
      await refreshPlans(detail.plan.id);
      toast.success(
        overwrite
          ? "会話の内容を計画書へ反映しました。"
          : "計画書を保存しました。"
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "計画書を保存できませんでした。"
      );
    }
  }

  async function makeSuggestion() {
    if (!detail) return;
    try {
      const next = await suggestFromGroup.mutateAsync({
        planId: detail.plan.id,
      });
      setSuggestion(next);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "会話を要約できませんでした。"
      );
    }
  }

  async function exportCurrentPlanPdf() {
    if (!detail) return;
    setIsExportingPdf(true);
    try {
      const result = await exportPlanPdf({
        plan: detail.plan,
        participants: detail.participants,
        missingFields: detail.missingFields,
      });
      toast.success(
        `PDFを保存しました。${result.pageCount}ページで出力しています。`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "PDFを出力できませんでした。"
      );
    } finally {
      setIsExportingPdf(false);
    }
  }

  if (selectedPlanId && detailQuery.isLoading)
    return <LoadingPlan onBack={() => setSelectedPlanId(null)} />;
  if (selectedPlanId && detail)
    return (
      <PlanDetail
        detail={detail}
        mountains={mountains}
        draft={draft}
        setDraft={setDraft}
        selectedMountain={selectedMountain}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        message={message}
        setMessage={setMessage}
        suggestion={suggestion}
        onBack={() => setSelectedPlanId(null)}
        onSubmitMessage={submitMessage}
        onSave={() => savePlan()}
        onApplySuggestion={() => suggestion && savePlan(suggestion.patch)}
        onSuggest={makeSuggestion}
        onExportPdf={exportCurrentPlanPdf}
        onRespond={async (accept: boolean) => {
          try {
            await respondInvite.mutateAsync({ planId: detail.plan.id, accept });
            await refreshPlans(detail.plan.id);
            toast.success(
              accept ? "登山計画に参加しました。" : "招待を辞退しました。"
            );
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "招待に回答できませんでした。"
            );
          }
        }}
        isSubmitting={sendMessage.isPending || sendAiTurn.isPending}
        isSaving={updatePlan.isPending}
        isSuggesting={suggestFromGroup.isPending}
        isExportingPdf={isExportingPdf}
      />
    );

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 px-4 pb-24">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-[#235a39] to-emerald-700 p-6 text-white shadow-xl">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-300/15 blur-3xl" />
        <div className="relative">
          <p className="text-[10px] font-black tracking-[0.22em] text-emerald-200">
            HIKING PLAN BOOK
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black">
            <ClipboardList className="h-6 w-6 text-amber-300" />
            登山計画書
          </h1>
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-emerald-100">
            フレンドと相談しながら、またはヤマコの質問に答えながら、安全な山行計画を一冊にまとめよう。
          </p>
        </div>
      </section>

      {!createMode ? (
        <section className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setCreateMode("friends")}
            className="rounded-2xl border border-emerald-100 bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.97]"
          >
            <Users className="h-5 w-5 text-emerald-700" />
            <p className="mt-3 text-sm font-black text-emerald-950">
              フレンドと作る
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-stone-500">
              グループで話して計画を整える
            </p>
          </button>
          <button
            onClick={() => setCreateMode("ai")}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left shadow-sm transition-transform active:scale-[0.97]"
          >
            <Bot className="h-5 w-5 text-amber-700" />
            <p className="mt-3 text-sm font-black text-amber-950">
              ヤマコと作る
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-stone-500">
              質問に答えて一人で計画を作る
            </p>
          </button>
        </section>
      ) : createMode === "friends" ? (
        <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-emerald-950">
              フレンドと計画を作る
            </h2>
            <button
              onClick={() => setCreateMode(null)}
              className="text-xs font-bold text-stone-500"
            >
              閉じる
            </button>
          </div>
          <form onSubmit={createGroupPlan} className="mt-4 space-y-4">
            <label className="block text-xs font-bold text-stone-700">
              計画書のタイトル
              <input
                value={groupTitle}
                onChange={event => setGroupTitle(event.target.value)}
                maxLength={120}
                placeholder="例：秋の大文字山ハイク"
                className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
              />
            </label>
            <div>
              <p className="text-xs font-bold text-stone-700">
                招待するフレンド
              </p>
              <div className="mt-2 space-y-2">
                {acceptedFriends.length ? (
                  acceptedFriends.map(friend => (
                    <label
                      key={friend.userId}
                      className="flex cursor-pointer items-center gap-3 rounded-xl bg-stone-50 p-3"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFriendIds.includes(friend.userId)}
                        onChange={() =>
                          setSelectedFriendIds(current =>
                            current.includes(friend.userId)
                              ? current.filter(id => id !== friend.userId)
                              : [...current, friend.userId]
                          )
                        }
                      />
                      <span className="text-lg">{friend.avatarUrl}</span>
                      <span className="text-xs font-black text-stone-700">
                        {friend.nickname}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                    参加者は後からも招待できます。まずはマイページでフレンドを追加してください。
                  </p>
                )}
              </div>
            </div>
            <button
              disabled={!groupTitle.trim() || createFriends.isPending}
              className="w-full rounded-xl bg-emerald-700 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {createFriends.isPending ? "作成中…" : "グループ計画を作成"}
            </button>
          </form>
        </section>
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-amber-950">
                ヤマコと計画を作る
              </h2>
              <p className="mt-1 text-[10px] text-amber-800">
                行き先、日程、ルート、装備を一つずつ確認します。
              </p>
            </div>
            <button
              onClick={() => setCreateMode(null)}
              className="text-xs font-bold text-stone-500"
            >
              閉じる
            </button>
          </div>
          <button
            onClick={createAiPlan}
            disabled={createAi.isPending}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-black text-amber-950 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {createAi.isPending ? "準備中…" : "ヤマコに相談を始める"}
          </button>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-emerald-950">
            保存した計画書
          </h2>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-800">
            {plansQuery.data?.length || 0}冊
          </span>
        </div>
        {plansQuery.isLoading ? (
          <p className="py-5 text-center text-xs text-stone-400">
            計画書を読み込んでいます。
          </p>
        ) : plansQuery.data?.length ? (
          plansQuery.data.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className="w-full rounded-2xl border border-stone-100 bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-black ${plan.mode === "ai" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
                    >
                      {plan.mode === "ai" ? "ヤマコと作成" : "フレンド計画"}
                    </span>
                    {plan.membershipStatus === "invited" && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-[9px] font-black text-blue-800">
                        招待が届いています
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-black text-stone-800">
                    {plan.title}
                  </p>
                  <p className="mt-1 text-[10px] text-stone-500">
                    {plan.mountainName || "行き先を相談中"}
                    {plan.planDate ? ` ・ ${plan.planDate}` : ""}
                  </p>
                </div>
                <ClipboardList className="h-5 w-5 text-emerald-700" />
              </div>
              {plan.missingFields.length > 0 && (
                <p className="mt-3 text-[10px] font-bold text-amber-700">
                  未確認：{plan.missingFields.slice(0, 2).join("・")}
                  {plan.missingFields.length > 2 ? " ほか" : ""}
                </p>
              )}
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center">
            <ClipboardList className="mx-auto h-7 w-7 text-emerald-500" />
            <p className="mt-2 text-sm font-black text-emerald-950">
              次の山行を一緒に計画しよう
            </p>
            <p className="mt-1 text-[10px] text-stone-500">
              フレンドとの会話、またはヤマコとの質問から始められます。
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function PlanDetail({
  detail,
  mountains,
  draft,
  setDraft,
  selectedMountain,
  isEditing,
  setIsEditing,
  message,
  setMessage,
  suggestion,
  onBack,
  onSubmitMessage,
  onSave,
  onApplySuggestion,
  onSuggest,
  onExportPdf,
  onRespond,
  isSubmitting,
  isSaving,
  isSuggesting,
  isExportingPdf,
}: any) {
  const plan = detail.plan;
  const isAi = plan.mode === "ai";
  const invited = detail.membershipStatus === "invited";
  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-24">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs font-black text-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" />
        計画書一覧へ
      </button>
      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-1 text-[9px] font-black ${isAi ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
              >
                {isAi ? "🐿️ ヤマコと計画" : "👥 フレンド計画"}
              </span>
              <span className="text-[10px] font-bold text-stone-400">
                ver.{plan.version}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-black text-emerald-950">
              {plan.title}
            </h1>
            <p className="mt-1 text-[10px] text-stone-500">
              {plan.status === "ready"
                ? "必要項目がそろいました。最終確認をしてください。"
                : "会話を続けて、計画を完成させましょう。"}
            </p>
          </div>
          {!invited && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={onExportPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-2 text-[10px] font-black text-amber-900 transition-transform active:scale-95 disabled:opacity-50"
                title="登山計画書をPDFで保存"
              >
                <FileDown className="h-3.5 w-3.5" />
                {isExportingPdf ? "出力中" : "PDF"}
              </button>
              {detail.isOwner && (
                <button
                  onClick={() => setIsEditing((value: boolean) => !value)}
                  className="rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700"
                >
                  {isEditing ? "閉じる" : "編集"}
                </button>
              )}
            </div>
          )}
        </div>
        {invited ? (
          <div className="mt-4 rounded-xl bg-blue-50 p-4">
            <p className="text-xs font-black text-blue-950">
              この登山計画に招待されています
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => onRespond(true)}
                className="rounded-xl bg-emerald-700 py-2.5 text-xs font-black text-white"
              >
                参加する
              </button>
              <button
                onClick={() => onRespond(false)}
                className="rounded-xl bg-white py-2.5 text-xs font-black text-stone-600"
              >
                辞退する
              </button>
            </div>
          </div>
        ) : (
          <PlanSheet
            plan={plan}
            draft={draft}
            setDraft={setDraft}
            mountains={mountains}
            selectedMountain={selectedMountain}
            isEditing={isEditing}
            isOwner={detail.isOwner}
            onSave={onSave}
            isSaving={isSaving}
          />
        )}
      </section>
      {!invited && (
        <>
          <section className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-black text-emerald-950">
                <Users className="h-4 w-4" />
                参加メンバー
              </h2>
              <span className="text-[10px] font-bold text-stone-400">
                {
                  detail.participants.filter(
                    (item: any) => item.membershipStatus === "active"
                  ).length
                }
                人参加
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {detail.participants.map((participant: any) => (
                <span
                  key={participant.userId}
                  className={`rounded-xl px-3 py-2 text-xs font-black ${participant.membershipStatus === "active" ? "bg-emerald-50 text-emerald-900" : "bg-stone-100 text-stone-500"}`}
                >
                  {participant.avatarUrl} {participant.nickname}
                  {participant.role === "owner"
                    ? "（作成者）"
                    : participant.membershipStatus === "invited"
                      ? "（招待中）"
                      : ""}
                </span>
              ))}
            </div>
          </section>
          {!isAi && detail.isOwner && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-amber-950">
                    会話から計画書へ反映
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-amber-800">
                    Geminiが会話に書かれた内容だけを整理します。内容を確認してから反映できます。
                  </p>
                </div>
                <button
                  onClick={onSuggest}
                  disabled={isSuggesting}
                  className="shrink-0 rounded-xl bg-amber-400 px-3 py-2 text-[10px] font-black text-amber-950 disabled:opacity-50"
                >
                  {isSuggesting ? "整理中…" : "会話を整理"}
                </button>
              </div>
              {suggestion && (
                <div className="mt-3 rounded-xl bg-white p-3">
                  <p className="text-xs leading-relaxed text-stone-700">
                    {suggestion.summary}
                  </p>
                  <button
                    onClick={onApplySuggestion}
                    className="mt-3 w-full rounded-lg bg-emerald-700 py-2 text-xs font-black text-white"
                  >
                    この内容を計画書へ反映
                  </button>
                </div>
              )}
            </section>
          )}
          <section className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
              <MessageCircle className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-black text-emerald-950">
                {isAi ? "ヤマコと計画を作る" : "グループメッセージ"}
              </h2>
            </div>
            <div className="max-h-[42vh] min-h-52 space-y-3 overflow-y-auto bg-stone-50/60 p-4">
              {detail.messages.map((item: any) => (
                <div
                  key={item.id}
                  className={`flex gap-2 ${item.kind === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${item.kind === "user" ? "bg-emerald-700 text-white" : item.kind === "ai" ? "border border-amber-100 bg-amber-50 text-stone-700" : "bg-stone-200 text-stone-600"}`}
                  >
                    <p
                      className={`mb-1 text-[9px] font-black ${item.kind === "user" ? "text-emerald-100" : "text-stone-400"}`}
                    >
                      {item.avatarUrl} {item.nickname}
                    </p>
                    <p className="whitespace-pre-wrap">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <form
              onSubmit={onSubmitMessage}
              className="border-t border-stone-100 p-3"
            >
              <div className="flex gap-2">
                <input
                  value={message}
                  onChange={event => setMessage(event.target.value)}
                  placeholder={
                    isAi ? "ヤマコの質問に答える" : "みんなにメッセージを送る"
                  }
                  maxLength={isAi ? 1200 : 2000}
                  className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2.5 text-xs outline-none focus:border-emerald-600"
                />
                <button
                  disabled={isSubmitting || !message.trim()}
                  className="rounded-xl bg-emerald-700 px-3 text-white disabled:opacity-50"
                  aria-label="メッセージを送信"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {isAi && (
                <p className="mt-2 text-[9px] text-stone-500">
                  ヤマコは一度に一つずつ質問し、安全情報は公式情報でも確認するよう案内します。
                </p>
              )}
            </form>
          </section>
        </>
      )}
    </div>
  );
}

function PlanSheet({
  plan,
  draft,
  setDraft,
  mountains,
  selectedMountain,
  isEditing,
  isOwner,
  onSave,
  isSaving,
}: any) {
  const set = (key: string, value: string) =>
    setDraft((current: any) => ({ ...current, [key]: value }));
  if (isEditing && isOwner)
    return (
      <div className="mt-4 space-y-3">
        <label className="block text-[10px] font-black text-stone-600">
          計画書タイトル
          <input
            value={draft.title}
            onChange={event => set("title", event.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-[10px] font-black text-stone-600">
          行き先の山
          <select
            value={draft.mountainId}
            onChange={event => set("mountainId", event.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">会話で決める</option>
            {mountains.map((mountain: any) => (
              <option key={mountain.id} value={mountain.id}>
                {mountain.name}（{mountain.prefecture}・{mountain.elevation}m）
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-[10px] font-black text-stone-600">
            登山日
            <input
              type="date"
              value={draft.planDate}
              onChange={event => set("planDate", event.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-[10px] font-black text-stone-600">
            集合・出発時刻
            <input
              type="time"
              value={draft.meetingTime}
              onChange={event => set("meetingTime", event.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block text-[10px] font-black text-stone-600">
          集合場所
          <input
            value={draft.meetingPlace}
            onChange={event => set("meetingPlace", event.target.value)}
            maxLength={255}
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-[10px] font-black text-stone-600">
          ルート・行程
          <textarea
            value={draft.routeSummary}
            onChange={event => set("routeSummary", event.target.value)}
            className="mt-1 min-h-20 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-[10px] font-black text-stone-600">
          交通手段
          <input
            value={draft.transport}
            onChange={event => set("transport", event.target.value)}
            maxLength={255}
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-[10px] font-black text-stone-600">
          必携装備（1行に1つ）
          <textarea
            value={draft.equipmentChecklist}
            onChange={event => set("equipmentChecklist", event.target.value)}
            className="mt-1 min-h-20 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-[10px] font-black text-stone-600">
          安全メモ
          <textarea
            value={draft.safetyNote}
            onChange={event => set("safetyNote", event.target.value)}
            className="mt-1 min-h-16 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
        </label>
        <button
          onClick={onSave}
          disabled={isSaving || !draft.title.trim()}
          className="w-full rounded-xl bg-emerald-700 py-3 text-xs font-black text-white disabled:opacity-50"
        >
          {isSaving ? "保存中…" : "計画書を保存"}
        </button>
      </div>
    );
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
      <Info
        label="行き先"
        value={plan.mountainName || (selectedMountain?.name ?? "相談中")}
      />
      <Info label="登山日" value={plan.planDate || "未定"} />
      <Info label="集合・出発" value={plan.meetingTime || "未定"} />
      <Info label="集合場所" value={plan.meetingPlace || "未定"} />
      <Info label="ルート" value={plan.routeSummary || "会話で決める"} wide />
      <Info label="交通" value={plan.transport || "未定"} />
      <Info
        label="必携装備"
        value={
          plan.equipmentChecklist.length
            ? plan.equipmentChecklist.join("・")
            : "未確認"
        }
        wide
      />
      <Info
        label="安全メモ"
        value={
          plan.safetyNote ||
          "天気・登山道・交通の公式情報を出発前に確認しましょう。"
        }
        wide
      />
    </div>
  );
}

function Info({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`${wide ? "col-span-2" : ""} rounded-xl bg-stone-50 p-3`}>
      <p className="text-[9px] font-black text-stone-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-xs font-bold leading-relaxed text-stone-700">
        {value}
      </p>
    </div>
  );
}
function LoadingPlan({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs font-black text-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" />
        計画書一覧へ
      </button>
      <div className="mt-5 rounded-2xl bg-white p-8 text-center text-xs text-stone-400">
        計画書を読み込んでいます。
      </div>
    </div>
  );
}
