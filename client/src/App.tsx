import { useMemo, useState, type ReactNode } from "react";
import { Mountain, Home, Search, User, LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "./const";
import { trpc } from "./lib/trpc";
import HomeView from "./components/HomeView";
import SearchView from "./components/SearchView";
import AlbumView from "./components/AlbumView";
import MyPageView from "./components/MyPageView";
import MountainDetailModal from "./components/MountainDetailModal";
import PostRecordView from "./components/PostRecordView";
import StampAnimation from "./components/StampAnimation";
import LevelUpCelebration from "./components/LevelUpCelebration";
import CompanionChat, { ANIMAL_METAS } from "./components/CompanionChat";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

type Tab = "home" | "search" | "album" | "mypage";

function MountainApp() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();
  const catalogueQuery = trpc.catalogue.get.useQuery();
  const dashboardQuery = trpc.mountain.dashboard.useQuery(undefined, { enabled: isAuthenticated });
  const updateProfile = trpc.mountain.profile.update.useMutation();
  const createRecord = trpc.mountain.records.create.useMutation();
  const uploadPhoto = trpc.mountain.photos.upload.useMutation();
  const resetProgress = trpc.mountain.progress.reset.useMutation();
  const completeChallenge = trpc.mountain.challenges.complete.useMutation();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [selectedMountainId, setSelectedMountainId] = useState<string | null>(null);
  const [recordingMountainId, setRecordingMountainId] = useState<string | null>(null);
  const [showCompanionChat, setShowCompanionChat] = useState(false);
  const [recentRecord, setRecentRecord] = useState<any | null>(null);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const catalogue = catalogueQuery.data;
  const dashboard = dashboardQuery.data;
  const selectedMountain = useMemo(() => catalogue?.mountains.find((mountain) => mountain.id === selectedMountainId) ?? null, [catalogue?.mountains, selectedMountainId]);
  const isClimbed = (id: string) => dashboard?.records.some((record) => record.mountainId === id) ?? false;
  const refresh = async () => { await Promise.all([utils.mountain.dashboard.invalidate(), utils.catalogue.get.invalidate()]); };

  if (authLoading || catalogueQuery.isLoading || !catalogue) return <LoadingScreen />;
  if (catalogueQuery.error) return <FailureScreen message={catalogueQuery.error.message} />;
  if (!isAuthenticated || !user) return <WelcomeScreen onLogin={startLogin} />;
  if (dashboardQuery.isLoading || !dashboard) return <LoadingScreen />;
  if (dashboardQuery.error) return <FailureScreen message={dashboardQuery.error.message} />;

  const handleRecord = async (mountainId: string, climbDate: string, memo: string, photos: string[], weather?: string, companions?: string, companionSkillUsed?: string, companionSkillName?: string, _companionBonusXp?: number, hasRainbowGlow?: boolean, luckyFortune?: string, triviaText?: string) => {
    const uploaded = await Promise.all(photos.map(async (photo) => (await uploadPhoto.mutateAsync({ dataUrl: photo })).url));
    const result = await createRecord.mutateAsync({ mountainId, climbDate, memo, photos: uploaded, weather, companions, companionSkillUsed, companionSkillName, hasRainbowGlow, luckyFortune, triviaText });
    await refresh();
    setRecentRecord(result.record as never);
    setLevelUpTo(result.levelUp ? result.level : null);
    setRecordingMountainId(null);
    toast.success(`登頂記録を保存しました。+${result.xpEarned} XP`);
  };

  const renderContent = () => {
    if (recordingMountainId) return <PostRecordView mountains={catalogue.mountains} mountainId={recordingMountainId} onBack={() => setRecordingMountainId(null)} userProfile={dashboard.profile} onSubmit={handleRecord} />;
    if (activeTab === "home") return <HomeView mountains={catalogue.mountains} albums={catalogue.albums} userProfile={dashboard.profile} records={dashboard.records} challenges={dashboard.challenges} onSelectMountain={setSelectedMountainId} onNavigateTab={setActiveTab} completeChallenge={async (templateId) => { try { await completeChallenge.mutateAsync({ templateId }); await refresh(); toast.success("クエスト報酬を保存しました。"); } catch (error) { toast.error(error instanceof Error ? error.message : "クエストを完了できませんでした。"); } }} onOpenCompanion={() => setShowCompanionChat(true)} />;
    if (activeTab === "search") return <SearchView mountains={catalogue.mountains} records={dashboard.records} onSelectMountain={setSelectedMountainId} isClimbed={isClimbed} userProfile={dashboard.profile} />;
    if (activeTab === "album") return <AlbumView mountains={catalogue.mountains} albums={catalogue.albums} records={dashboard.records} isClimbed={isClimbed} onSelectMountain={setSelectedMountainId} onBack={() => setActiveTab("home")} userProfile={dashboard.profile} />;
    return <MyPageView badges={catalogue.badges} userProfile={dashboard.profile} records={dashboard.records} onUpdateProfile={async (input) => { await updateProfile.mutateAsync(input); await refresh(); }} onResetProgress={async () => { await resetProgress.mutateAsync(); await refresh(); }} onLogout={logout} />;
  };

  const companion = ANIMAL_METAS[dashboard.profile.companionAnimal || "squirrel"] || ANIMAL_METAS.squirrel;
  return <div id="app-root" className="h-screen bg-stone-100 flex justify-center text-gray-800 overflow-hidden"><div className="w-full max-w-md bg-[#FDFBF4] h-screen flex flex-col shadow-2xl relative border-x border-[#EAE2D1]/60 overflow-hidden"><header className="sticky top-0 bg-[#FDFBF4]/95 backdrop-blur-md px-5 py-3.5 border-b-2 border-[#EAE2D1] flex items-center justify-between z-30 shrink-0"><div className="flex items-center gap-2"><span className="text-xl">🏔️</span><div><h1 className="text-sm font-black tracking-wider text-[#2D5A27] font-display-heavy">Peak Album</h1><span className="text-[8px] font-bold text-emerald-700">データを安全に保存中</span></div></div><button onClick={() => setActiveTab("mypage")} className="text-sm transition-transform active:scale-95" title="マイページ">{dashboard.profile.avatarUrl}</button></header><main className="flex-1 overflow-y-auto scroll-smooth py-5">{renderContent()}</main>{!recordingMountainId && <nav className="absolute bottom-4 left-4 right-4 h-16 bg-white/95 backdrop-blur-md border-2 border-[#EAE2D1] rounded-2xl flex items-center justify-around px-2 z-35 shadow-[0_8px_24px_rgba(26,47,26,0.12)]"><TabButton icon={<Home className="w-5 h-5" />} label="ホーム" active={activeTab === "home"} onClick={() => setActiveTab("home")} /><TabButton icon={<Mountain className="w-5 h-5" />} label="山を探す" active={activeTab === "search"} onClick={() => setActiveTab("search")} /><button onClick={() => setShowCompanionChat(true)} className="flex flex-col items-center gap-1 py-1 px-3 transition-transform active:scale-95"><span className="text-xl leading-none">{companion.emoji}</span><span className="text-[10px] font-black text-[#2D5A27]">{dashboard.profile.companionName || "ヤマコ"}</span></button><TabButton icon={<User className="w-5 h-5" />} label="マイページ" active={activeTab === "mypage"} onClick={() => setActiveTab("mypage")} /></nav>}<MountainDetailModal mountain={selectedMountain} onClose={() => setSelectedMountainId(null)} isClimbed={selectedMountain ? isClimbed(selectedMountain.id) : false} historyRecords={selectedMountain ? dashboard.records.filter((record) => record.mountainId === selectedMountain.id) : []} onRecord={(id) => { setRecordingMountainId(id); setSelectedMountainId(null); }} />{recentRecord && <StampAnimation mountains={catalogue.mountains} record={recentRecord as never} levelUpTo={levelUpTo} onComplete={() => { setRecentRecord(null); if (levelUpTo) setShowLevelUp(true); else setActiveTab("album"); }} />}{showLevelUp && levelUpTo && <LevelUpCelebration levelUpTo={levelUpTo} onClose={() => { setShowLevelUp(false); setLevelUpTo(null); setActiveTab("album"); }} companionName={dashboard.profile.companionName || "ヤマコ"} companionEmoji={companion.emoji} />}<CompanionChat userProfile={dashboard.profile} records={dashboard.records} isOpen={showCompanionChat} setIsOpen={setShowCompanionChat} isOnline /></div></div>;
}

function TabButton({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) { return <button onClick={onClick} className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-colors active:scale-95 ${active ? "text-emerald-700" : "text-gray-400 hover:text-gray-600"}`}>{icon}<span className="text-[10px] font-bold">{label}</span></button>; }
function LoadingScreen() { return <div className="min-h-screen bg-[#FDFBF4] flex flex-col items-center justify-center gap-3 text-emerald-800"><Loader2 className="h-7 w-7 animate-spin" /><p className="text-xs font-black">Peak Album を準備しています</p></div>; }
function FailureScreen({ message }: { message: string }) { return <div className="min-h-screen bg-[#FDFBF4] flex flex-col items-center justify-center p-6 text-center"><p className="text-sm font-black text-stone-800">データを読み込めませんでした。</p><p className="mt-2 text-xs text-stone-500">{message}</p></div>; }
function WelcomeScreen({ onLogin }: { onLogin: () => void }) { return <div className="min-h-screen bg-stone-100 flex justify-center"><div className="w-full max-w-md bg-[#FDFBF4] flex flex-col justify-center p-7 text-center"><div className="forest-gradient rounded-[32px] px-6 py-10 text-white shadow-xl"><p className="text-5xl">🏔️</p><p className="mt-4 text-[10px] font-black tracking-[0.24em] text-green-200">YOUR CLIMBING JOURNAL</p><h1 className="mt-2 text-3xl font-black font-display-heavy">Peak Album</h1><p className="mt-4 text-sm leading-relaxed text-green-100">登った山、写真、思い出をあなた専用のアルバムに記録します。データはログインしたアカウントに安全に保存されます。</p><button onClick={onLogin} className="mt-7 w-full rounded-2xl bg-[#FFD700] px-5 py-3.5 text-sm font-black text-emerald-950 shadow-md transition-transform active:scale-[0.97]"><LogIn className="mr-1.5 inline h-4 w-4" />Manusでログインしてはじめる</button></div></div></div>; }

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><MountainApp /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
