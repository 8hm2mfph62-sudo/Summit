import { FormEvent, useState } from "react";
import { LockKeyhole, LogIn, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { APP_LOGO_URL, APP_NAME } from "@/lib/brand";

export default function AuthEntryScreen({
  onAuthenticated,
}: {
  onAuthenticated: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const login = trpc.auth.login.useMutation();
  const register = trpc.auth.register.useMutation();
  const isPending = login.isPending || register.isPending;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "register" && password !== confirmPassword) {
      toast.error("確認用パスワードが一致しません。");
      return;
    }
    try {
      if (mode === "login") await login.mutateAsync({ email, password });
      else await register.mutateAsync({ email, password });
      await onAuthenticated();
      toast.success(
        mode === "login" ? "ログインしました。" : "アカウントを作成しました。"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "ログインできませんでした。"
      );
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 flex justify-center">
      <main className="flex w-full max-w-md flex-col justify-center p-6">
        <section className="forest-gradient rounded-[32px] p-6 text-white shadow-xl">
          <img
            src={APP_LOGO_URL}
            alt="Summit"
            className="mx-auto h-20 w-20 rounded-2xl bg-white object-contain shadow-lg"
          />
          <p className="mt-4 text-center text-[10px] font-black tracking-[0.24em] text-green-200">
            YOUR CLIMBING JOURNAL
          </p>
          <h1 className="mt-2 text-center text-3xl font-black font-display-heavy">
            {APP_NAME}
          </h1>
          <p className="mt-4 text-center text-sm leading-relaxed text-green-100">
            登頂記録、フレンド、登山計画書を、あなたのアカウントに安全に保存します。
          </p>
          <div className="mt-7 grid grid-cols-2 rounded-xl bg-black/10 p-1 text-xs font-black">
            <button
              onClick={() => setMode("login")}
              className={`rounded-lg py-2 transition ${mode === "login" ? "bg-white text-emerald-950 shadow" : "text-green-100"}`}
            >
              ログイン
            </button>
            <button
              onClick={() => setMode("register")}
              className={`rounded-lg py-2 transition ${mode === "register" ? "bg-white text-emerald-950 shadow" : "text-green-100"}`}
            >
              新規登録
            </button>
          </div>
          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block text-xs font-bold text-green-50">
              メールアドレス
              <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-stone-800">
                <Mail className="h-4 w-4 text-emerald-700" />
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="min-w-0 flex-1 text-sm outline-none"
                />
              </div>
            </label>
            <label className="block text-xs font-bold text-green-50">
              パスワード
              <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-stone-800">
                <LockKeyhole className="h-4 w-4 text-emerald-700" />
                <input
                  required
                  type="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="8文字以上"
                  className="min-w-0 flex-1 text-sm outline-none"
                />
              </div>
            </label>
            {mode === "register" && (
              <label className="block text-xs font-bold text-green-50">
                パスワード（確認）
                <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-stone-800">
                  <LockKeyhole className="h-4 w-4 text-emerald-700" />
                  <input
                    required
                    type="password"
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    placeholder="もう一度入力"
                    className="min-w-0 flex-1 text-sm outline-none"
                  />
                </div>
              </label>
            )}
            <button
              disabled={isPending}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD700] py-3 text-sm font-black text-emerald-950 disabled:opacity-50"
            >
              {mode === "login" ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isPending
                ? "処理中…"
                : mode === "login"
                  ? "メールアドレスでログイン"
                  : "アカウントを作成"}
            </button>
          </form>
        </section>
        <p className="mt-4 text-center text-[10px] leading-relaxed text-stone-500">
          メールの認証コード送信は行いません。パスワードは安全に暗号化して保存されます。
        </p>
      </main>
    </div>
  );
}
