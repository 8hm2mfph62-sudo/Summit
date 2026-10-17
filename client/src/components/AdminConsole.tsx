import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BellRing,
  Crown,
  Eye,
  EyeOff,
  FileWarning,
  KeyRound,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Category = "info" | "safety" | "maintenance" | "event";
type Player = {
  id: number;
  name: string;
  nickname: string;
  avatarUrl: string;
  email: string | null;
  friendCode: string | null;
  role: "user" | "admin";
  isBanned: boolean;
  isPremium: boolean;
  level: number;
  totalXp: number;
  climbCount: number;
  createdAt: string | null;
  lastSignedIn: string | null;
};
type Announcement = {
  id: string;
  title: string;
  body: string;
  category: Category;
  isPublished: boolean;
  publishedAt: string | null;
  authorName: string;
  updatedAt: string | null;
};

type NoticeDraft = {
  title: string;
  body: string;
  category: Category;
  isPublished: boolean;
};

const emptyNotice: NoticeDraft = {
  title: "",
  body: "",
  category: "info",
  isPublished: true,
};

const categoryLabels: Record<Category, string> = {
  info: "お知らせ",
  safety: "安全",
  maintenance: "メンテナンス",
  event: "イベント",
};

const categoryStyles: Record<Category, string> = {
  info: "bg-sky-100 text-sky-800",
  safety: "bg-amber-100 text-amber-900",
  maintenance: "bg-violet-100 text-violet-800",
  event: "bg-rose-100 text-rose-800",
};

function dateText(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default function AdminConsole({ onBack }: { onBack: () => void }) {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeDraft>(emptyNotice);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<number[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState("");

  const playersQuery = trpc.admin.players.list.useQuery({ query });
  const noticesQuery = trpc.admin.announcements.list.useQuery();
  const refreshPlayers = async () => {
    const result = await playersQuery.refetch();
    const latestPlayers = (result.data ?? []) as Player[];
    setSelectedPlayer(current =>
      current
        ? (latestPlayers.find(player => player.id === current.id) ?? null)
        : null
    );
  };
  const refreshNotices = async () => {
    await Promise.all([
      noticesQuery.refetch(),
      utils.announcements.latest.invalidate(),
    ]);
  };

  const setRole = trpc.admin.players.setRole.useMutation({
    onSuccess: async () => {
      await refreshPlayers();
      toast.success("プレイヤーの権限を更新しました。");
    },
    onError: error => toast.error(error.message),
  });
  const setBanStatus = trpc.admin.players.setBanStatus.useMutation({
    onSuccess: async () => {
      await refreshPlayers();
      toast.success("プレイヤーの利用状態を更新しました。");
    },
    onError: error => toast.error(error.message),
  });
  const grantXp = trpc.admin.players.grantXp.useMutation({
    onSuccess: async () => {
      await refreshPlayers();
      toast.success("ボーナスXPを付与しました。");
    },
    onError: error => toast.error(error.message),
  });
  const resetProgress = trpc.admin.players.resetProgress.useMutation({
    onSuccess: async () => {
      await refreshPlayers();
      toast.success("プレイヤーの登頂記録と進捗を初期化しました。");
    },
    onError: error => toast.error(error.message),
  });
  const resetPassword = trpc.admin.players.resetPassword.useMutation({
    onSuccess: async () => {
      await refreshPlayers();
      setTemporaryPassword("");
      setShowTemporaryPassword(false);
      toast.success(
        "仮パスワードを設定し、対象の既存ログインを無効化しました。"
      );
    },
    onError: error => toast.error(error.message),
  });
  const bulkDelete = trpc.admin.players.bulkDelete.useMutation({
    onSuccess: async result => {
      setBulkSelection([]);
      setBulkDeleteConfirmation("");
      setBulkDeleteOpen(false);
      setSelectedPlayer(current =>
        current && result.deletedUserIds.includes(current.id) ? null : current
      );
      await refreshPlayers();
      toast.success(
        `${result.deletedCount}人のプレイヤーを完全に削除しました。`
      );
    },
    onError: error => toast.error(error.message),
  });
  const createNotice = trpc.admin.announcements.create.useMutation({
    onSuccess: async () => {
      await refreshNotices();
      setNotice(emptyNotice);
      toast.success("お知らせを保存しました。");
    },
    onError: error => toast.error(error.message),
  });
  const updateNotice = trpc.admin.announcements.update.useMutation({
    onSuccess: async () => {
      await refreshNotices();
      setEditingNoticeId(null);
      setNotice(emptyNotice);
      toast.success("お知らせを更新しました。");
    },
    onError: error => toast.error(error.message),
  });

  const players = (playersQuery.data ?? []) as Player[];
  const notices = (noticesQuery.data ?? []) as Announcement[];
  const selectedPlayers = players.filter(player =>
    bulkSelection.includes(player.id)
  );
  const visibleUserPlayers = players.filter(player => player.role === "user");
  const allVisibleUsersSelected =
    visibleUserPlayers.length > 0 &&
    visibleUserPlayers.every(player => bulkSelection.includes(player.id));
  const activePlayers = players.filter(player => !player.isBanned).length;
  const adminPlayers = players.filter(player => player.role === "admin").length;
  const pending =
    setRole.isPending ||
    setBanStatus.isPending ||
    grantXp.isPending ||
    resetProgress.isPending ||
    resetPassword.isPending ||
    bulkDelete.isPending;

  function selectPlayer(player: Player) {
    setSelectedPlayer(player);
    setTemporaryPassword("");
    setShowTemporaryPassword(false);
  }

  function toggleBulkSelection(player: Player) {
    if (player.role === "admin") {
      toast.error("管理者アカウントは一括削除できません。");
      return;
    }
    setBulkSelection(current => {
      if (current.includes(player.id)) {
        return current.filter(id => id !== player.id);
      }
      if (current.length >= 100) {
        toast.error("一度に選択できるのは100人までです。");
        return current;
      }
      return [...current, player.id];
    });
  }

  function selectVisiblePlayers() {
    const eligibleIds = players
      .filter(player => player.role === "user")
      .map(player => player.id);
    setBulkSelection(current => {
      const next = Array.from(new Set([...current, ...eligibleIds]));
      if (next.length > 100) {
        toast.error("一度に選択できるのは100人までです。");
      }
      return next.slice(0, 100);
    });
  }

  function beginNoticeEdit(item?: Announcement) {
    if (!item) {
      setEditingNoticeId(null);
      setNotice(emptyNotice);
      return;
    }
    setEditingNoticeId(item.id);
    setNotice({
      title: item.title,
      body: item.body,
      category: item.category,
      isPublished: item.isPublished,
    });
  }

  async function saveNotice() {
    const payload = {
      title: notice.title.trim(),
      body: notice.body.trim(),
      category: notice.category,
      isPublished: notice.isPublished,
    };
    if (!payload.title || !payload.body) {
      toast.error("お知らせの件名と本文を入力してください。");
      return;
    }
    if (editingNoticeId) {
      await updateNotice.mutateAsync({ id: editingNoticeId, ...payload });
    } else {
      await createNotice.mutateAsync(payload);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 px-4 pb-28 text-left">
      <section className="relative overflow-hidden rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-[#142f22] via-[#22583b] to-[#0d251a] p-6 text-white shadow-xl">
        <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(#fef3c7_1px,transparent_1px)] [background-size:14px_14px]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <button
              onClick={onBack}
              className="mb-4 flex items-center gap-1 text-[10px] font-black text-amber-100 transition-opacity hover:opacity-80"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              マイページへ戻る
            </button>
            <p className="text-[10px] font-black tracking-[0.24em] text-amber-200">
              MOUNTAIN SANCTUARY
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-black font-display-heavy">
              <Crown className="h-6 w-6 text-amber-300" />
              管理者コンソール
            </h1>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-emerald-100">
              プレイヤー、進捗、お知らせを管理する専用画面です。
            </p>
          </div>
          <ShieldCheck className="h-11 w-11 shrink-0 text-amber-300 drop-shadow" />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Metric icon={<Users />} label="表示中" value={`${players.length}人`} />
        <Metric
          icon={<Sparkles />}
          label="利用可能"
          value={`${activePlayers}人`}
        />
        <Metric icon={<Crown />} label="管理者" value={`${adminPlayers}人`} />
      </section>

      <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-1.5 text-sm font-black text-emerald-950">
            <UserCog className="h-4 w-4 text-emerald-700" />
            プレイヤー管理
          </h2>
          <span className="text-[10px] font-bold text-stone-400">
            メールを表示・パスワードを再設定
          </span>
        </div>
        <label className="relative mt-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setBulkSelection([]);
            }}
            placeholder="名前・メール・フレンドコードで検索"
            maxLength={160}
            className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-100 bg-red-50/60 px-3 py-2.5">
          <p className="text-[10px] font-black text-red-900">
            一括削除対象: {bulkSelection.length}人
            <span className="ml-1 font-medium text-red-700/80">
              （管理者は対象外）
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending || visibleUserPlayers.length === 0}
              onClick={() => {
                if (allVisibleUsersSelected) setBulkSelection([]);
                else selectVisiblePlayers();
              }}
              className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-red-800 transition active:scale-95 disabled:opacity-50"
            >
              {allVisibleUsersSelected ? "選択解除" : "表示中を選択"}
            </button>
            <button
              type="button"
              disabled={pending || bulkSelection.length === 0}
              onClick={() => {
                setBulkDeleteConfirmation("");
                setBulkDeleteOpen(true);
              }}
              className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-[10px] font-black text-white transition active:scale-95 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              一括削除
            </button>
          </div>
        </div>
        <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
          {playersQuery.isLoading ? (
            <p className="py-5 text-center text-xs text-stone-400">
              プレイヤーを読み込んでいます。
            </p>
          ) : players.length ? (
            players.map(player => {
              const isBulkSelected = bulkSelection.includes(player.id);
              const isAdmin = player.role === "admin";
              return (
                <div key={player.id} className="flex items-stretch gap-2">
                  <label
                    className={`flex w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                      isAdmin
                        ? "cursor-not-allowed border-stone-100 bg-stone-50 text-stone-300"
                        : isBulkSelected
                          ? "border-red-300 bg-red-100 text-red-700"
                          : "border-stone-200 bg-white text-stone-500"
                    }`}
                    title={
                      isAdmin
                        ? "管理者アカウントは一括削除できません"
                        : "一括削除対象に選択"
                    }
                  >
                    <input
                      type="checkbox"
                      checked={isBulkSelected}
                      disabled={isAdmin || pending}
                      onChange={() => toggleBulkSelection(player)}
                      className="h-4 w-4 accent-red-600"
                      aria-label={`${player.nickname}を一括削除対象に選択`}
                    />
                  </label>
                  <button
                    onClick={() => selectPlayer(player)}
                    className={`min-w-0 flex-1 rounded-xl border p-3 text-left transition active:scale-[0.99] ${
                      selectedPlayer?.id === player.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-stone-100 bg-stone-50 hover:border-emerald-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{player.avatarUrl}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-xs font-black text-stone-800">
                            {player.nickname}
                          </p>
                          {isAdmin && (
                            <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          )}
                          {player.isBanned && (
                            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-red-500" />
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[10px] text-stone-500">
                          {player.email || "メール未設定"}
                        </p>
                      </div>
                      <div className="text-right text-[10px] font-bold text-stone-500">
                        <p>Lv.{player.level}</p>
                        <p>{player.climbCount}回登頂</p>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })
          ) : (
            <p className="py-5 text-center text-xs text-stone-400">
              該当するプレイヤーはいません。
            </p>
          )}
        </div>

        {selectedPlayer && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-emerald-950">
                  {selectedPlayer.avatarUrl} {selectedPlayer.nickname}
                </p>
                <p className="mt-2 text-[9px] font-black tracking-wide text-stone-400">
                  メールアドレス
                </p>
                <p className="mt-1 break-all text-[10px] text-stone-600">
                  {selectedPlayer.email || "メール未設定"}
                </p>
                <p className="mt-1 font-mono text-[10px] text-emerald-700">
                  {selectedPlayer.friendCode || "フレンドコード未発行"}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-black ${selectedPlayer.isBanned ? "bg-red-100 text-red-700" : "bg-white text-emerald-700"}`}
              >
                {selectedPlayer.isBanned ? "利用停止中" : "利用可能"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white p-2 text-center">
              <Info label="登頂" value={`${selectedPlayer.climbCount}回`} />
              <Info label="経験値" value={`${selectedPlayer.totalXp} XP`} />
              <Info
                label="最終利用"
                value={dateText(selectedPlayer.lastSignedIn)}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                disabled={pending}
                onClick={() =>
                  grantXp.mutate({ userId: selectedPlayer.id, amount: 100 })
                }
                className="rounded-xl bg-emerald-700 py-2.5 text-xs font-black text-white transition active:scale-95 disabled:opacity-50"
              >
                +100 XPを付与
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  const nextRole =
                    selectedPlayer.role === "admin" ? "user" : "admin";
                  const label =
                    nextRole === "admin"
                      ? "管理者に昇格"
                      : "一般プレイヤーへ変更";
                  if (
                    window.confirm(
                      `「${selectedPlayer.nickname}」を${label}しますか？`
                    )
                  ) {
                    setRole.mutate({
                      userId: selectedPlayer.id,
                      role: nextRole,
                    });
                  }
                }}
                className="rounded-xl border border-amber-300 bg-amber-50 py-2.5 text-xs font-black text-amber-900 transition active:scale-95 disabled:opacity-50"
              >
                {selectedPlayer.role === "admin"
                  ? "管理者を解除"
                  : "管理者にする"}
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  const action = selectedPlayer.isBanned
                    ? "利用停止を解除"
                    : "利用停止";
                  if (
                    window.confirm(
                      `「${selectedPlayer.nickname}」を${action}しますか？`
                    )
                  ) {
                    setBanStatus.mutate({
                      userId: selectedPlayer.id,
                      isBanned: !selectedPlayer.isBanned,
                    });
                  }
                }}
                className="rounded-xl border border-stone-300 bg-white py-2.5 text-xs font-black text-stone-700 transition active:scale-95 disabled:opacity-50"
              >
                {selectedPlayer.isBanned ? "利用停止を解除" : "利用を停止"}
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  if (
                    window.confirm(
                      `「${selectedPlayer.nickname}」の登頂記録・XP・バッジ・クエストを初期化します。この操作は取り消せません。`
                    )
                  ) {
                    resetProgress.mutate({ userId: selectedPlayer.id });
                  }
                }}
                className="rounded-xl bg-red-600 py-2.5 text-xs font-black text-white transition active:scale-95 disabled:opacity-50"
              >
                進捗を初期化
              </button>
            </div>
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black text-amber-950">
                    仮パスワードを設定
                  </p>
                  <p className="mt-0.5 text-[9px] leading-relaxed text-amber-900/80">
                    現在のパスワードは一方向暗号化されており閲覧できません。新しい仮パスワードを設定すると、既存のログインはすべて無効になります。
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <label className="relative min-w-0 flex-1">
                  <input
                    type={showTemporaryPassword ? "text" : "password"}
                    value={temporaryPassword}
                    onChange={event => setTemporaryPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    placeholder="8文字以上の仮パスワード"
                    className="w-full rounded-lg border border-amber-200 bg-white py-2 pl-2.5 pr-9 text-[10px] outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowTemporaryPassword(current => !current)
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-700"
                    aria-label={
                      showTemporaryPassword
                        ? "仮パスワードを隠す"
                        : "仮パスワードを表示する"
                    }
                  >
                    {showTemporaryPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </label>
                <button
                  disabled={pending || temporaryPassword.length < 8}
                  onClick={() => {
                    if (
                      window.confirm(
                        `「${selectedPlayer.nickname}」の仮パスワードを設定します。対象の既存ログインはすべて無効になります。`
                      )
                    ) {
                      resetPassword.mutate({
                        userId: selectedPlayer.id,
                        temporaryPassword,
                      });
                    }
                  }}
                  className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-[10px] font-black text-white transition active:scale-95 disabled:opacity-50"
                >
                  設定する
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={open => {
          setBulkDeleteOpen(open);
          if (!open) setBulkDeleteConfirmation("");
        }}
      >
        <AlertDialogContent className="border-red-200 bg-[#fffaf8]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-900">
              <Trash2 className="h-5 w-5" />
              {bulkSelection.length}人のプレイヤーを完全に削除
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed text-red-900/80">
              アカウント、登頂記録、フレンド関係、登山計画、会話、進捗などの関連データを完全に削除します。この操作は取り消せません。管理者アカウントは削除されません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl border border-red-100 bg-white p-3">
            <p className="text-[10px] font-black text-red-900">削除対象</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-700">
              {selectedPlayers.map(player => player.nickname).join("、") ||
                "選択したプレイヤー"}
            </p>
          </div>
          <label className="block text-xs font-bold text-red-950">
            続行するには「削除」と入力してください
            <input
              value={bulkDeleteConfirmation}
              onChange={event => setBulkDeleteConfirmation(event.target.value)}
              autoComplete="off"
              placeholder="削除"
              maxLength={8}
              className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                bulkDelete.isPending ||
                bulkSelection.length === 0 ||
                bulkDeleteConfirmation !== "削除"
              }
              onClick={() => bulkDelete.mutate({ userIds: bulkSelection })}
              className="bg-red-600 text-white hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50"
            >
              {bulkDelete.isPending
                ? "削除中…"
                : `${bulkSelection.length}人を完全に削除`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-1.5 text-sm font-black text-emerald-950">
            <BellRing className="h-4 w-4 text-amber-600" />
            お知らせ管理
          </h2>
          <button
            onClick={() => beginNoticeEdit()}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-black text-white transition active:scale-95"
          >
            新規作成
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-stone-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black text-stone-800">
              {editingNoticeId ? "お知らせを編集" : "新しいお知らせ"}
            </p>
            {editingNoticeId && (
              <button
                onClick={() => beginNoticeEdit()}
                className="text-[10px] font-bold text-stone-500"
              >
                キャンセル
              </button>
            )}
          </div>
          <input
            value={notice.title}
            onChange={event =>
              setNotice(current => ({ ...current, title: event.target.value }))
            }
            placeholder="件名"
            maxLength={160}
            className="mt-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs"
          />
          <textarea
            value={notice.body}
            onChange={event =>
              setNotice(current => ({ ...current, body: event.target.value }))
            }
            placeholder="アプリ内に表示する本文"
            maxLength={10_000}
            className="mt-2 min-h-24 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs leading-relaxed"
          />
          <div className="mt-2 flex items-center gap-2">
            <select
              value={notice.category}
              onChange={event =>
                setNotice(current => ({
                  ...current,
                  category: event.target.value as Category,
                }))
              }
              className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-2 text-xs"
            >
              {(Object.keys(categoryLabels) as Category[]).map(category => (
                <option key={category} value={category}>
                  {categoryLabels[category]}
                </option>
              ))}
            </select>
            <label className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-2 py-2 text-[10px] font-bold text-stone-600">
              <input
                type="checkbox"
                checked={notice.isPublished}
                onChange={event =>
                  setNotice(current => ({
                    ...current,
                    isPublished: event.target.checked,
                  }))
                }
              />
              今すぐ公開
            </label>
          </div>
          <button
            disabled={createNotice.isPending || updateNotice.isPending}
            onClick={saveNotice}
            className="mt-3 w-full rounded-xl bg-emerald-700 py-2.5 text-xs font-black text-white transition active:scale-95 disabled:opacity-50"
          >
            {createNotice.isPending || updateNotice.isPending
              ? "保存中…"
              : editingNoticeId
                ? "更新を保存"
                : "お知らせを保存"}
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {noticesQuery.isLoading ? (
            <p className="py-4 text-center text-xs text-stone-400">
              お知らせを読み込んでいます。
            </p>
          ) : notices.length ? (
            notices.map(item => (
              <button
                key={item.id}
                onClick={() => beginNoticeEdit(item)}
                className="w-full rounded-xl border border-stone-100 p-3 text-left transition hover:border-emerald-200 active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${categoryStyles[item.category]}`}
                    >
                      {categoryLabels[item.category]}
                    </span>
                    <p className="truncate text-xs font-black text-stone-800">
                      {item.title}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[9px] font-bold ${item.isPublished ? "text-emerald-700" : "text-stone-400"}`}
                  >
                    {item.isPublished ? "公開中" : "下書き"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-stone-500">
                  {item.body}
                </p>
                <p className="mt-1 text-[9px] text-stone-400">
                  最終更新 {dateText(item.updatedAt)} ／ {item.authorName}
                </p>
              </button>
            ))
          ) : (
            <p className="py-4 text-center text-xs text-stone-400">
              まだお知らせはありません。
            </p>
          )}
        </div>
      </section>

      <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <p className="text-[10px] leading-relaxed">
          一括削除・進捗初期化・権限変更・利用停止・仮パスワード設定は影響の大きい操作です。一括削除は対象確認と「削除」の入力を必須にし、管理者アカウントは対象外です。既存パスワードやハッシュ値は管理画面・APIのどちらにも返しません。
        </p>
      </section>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-900/5 bg-white p-3 text-center shadow-xs">
      <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <p className="mt-1 text-base font-black text-stone-800">{value}</p>
      <p className="text-[9px] font-bold text-stone-400">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold text-stone-400">{label}</p>
      <p className="mt-0.5 truncate text-[10px] font-black text-stone-700">
        {value}
      </p>
    </div>
  );
}
