/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Mountain, UserProfile, getCompanionEvolutionList } from '../types';
import { Camera, Calendar, Cloud, Compass, Image as ImageIcon, Sparkles, Trash2, Users, ArrowLeft, Sun, CloudRain, Snowflake } from 'lucide-react';
import { trpc } from "@/lib/trpc";

interface PostRecordViewProps {
  mountains: Mountain[];
  mountainId: string;
  onBack: () => void;
  userProfile: UserProfile;
  onSubmit: (
    mountainId: string,
    climbDate: string,
    memo: string,
    photos: string[],
    weather?: string,
    companions?: string,
    companionSkillUsed?: string,
    companionSkillName?: string,
    companionBonusXp?: number,
    hasRainbowGlow?: boolean,
    luckyFortune?: string,
    triviaText?: string,
    friendIds?: number[]
  ) => Promise<void>;
}

export default function PostRecordView({ mountains, mountainId, onBack, userProfile, onSubmit }: PostRecordViewProps) {
  const mountain = mountains.find(m => m.id === mountainId);

  // Companion state derivation
  const activeSkinStage = userProfile.companionSkinStage !== undefined
    ? userProfile.companionSkinStage
    : (userProfile.level >= 10 ? 5 : userProfile.level >= 7 ? 4 : userProfile.level >= 5 ? 3 : userProfile.level >= 3 ? 2 : 1);

  const companionAnimal = userProfile.companionAnimal || 'squirrel';
  const evolutionStages = getCompanionEvolutionList(companionAnimal);
  const activeSkin = evolutionStages[activeSkinStage - 1] || evolutionStages[0];

  // Companion interactive skill states
  const [skillUsed, setSkillUsed] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [bonusXp, setBonusXp] = useState(0);
  const [hasRainbowGlow, setHasRainbowGlow] = useState(false);
  const [luckyFortune, setLuckyFortune] = useState('');
  const [triviaText, setTriviaText] = useState('');

  // Form states
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [climbDate, setClimbDate] = useState<string>(getTodayString());
  const [memo, setMemo] = useState('');
  const [weather, setWeather] = useState('晴れ');
  const [companions, setCompanions] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const friendsQuery = trpc.mountain.friends.me.useQuery();
  const [photos, setPhotos] = useState<string[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleActivateSkill = () => {
    if (skillUsed) return;
    
    setSkillUsed(true);
    setSkillName(activeSkin.specialSkill);
    
    let addedText = '';
    let extraXp = 20; // default skill XP bonus
    
    switch (companionAnimal) {
      case 'squirrel':
        addedText = `\n\n🌲 登山ガイド「${userProfile.companionName || 'ヤマコ'}」が案内してくれた山林の隠れ小道。道端に可愛らしい高山植物が咲いていました。`;
        extraXp = 10;
        break;
      case 'fox':
        addedText = `\n\n🦊 登山ガイド「${userProfile.companionName || 'ヤマコ'}」が山頂の深い霧を晴らしてくれたおかげで、眼下には言葉を失うほどの美しい雲海が広がっていました！`;
        setWeather('晴れ');
        extraXp = 15;
        break;
      case 'bear':
        addedText = `\n\n🐻 登山ガイド「${userProfile.companionName || 'ヤマコ'}」が作ってくれたギルド特製グルメ山飯「ハニーベア・パンケーキと濃厚ココア」を食べて元気がみなぎりました！`;
        extraXp = 20;
        break;
      case 'rabbit':
        addedText = `\n\n🐰 登山ガイド「${userProfile.companionName || 'ヤマコ'}」の軽快なスピードジャンプに先導され、通常よりもかなり早いペースで登頂を達成しました！`;
        extraXp = 20;
        break;
      case 'owl':
        const trivias = [
          "この山は数億年前の地殻変動によって隆起した地層からできており、太古の歴史を感じる場所なのだそうです！",
          "この山頂付近には、ここにしか自生しない非常に珍しい高山植物が静かに息づいているのだそうです！",
          "いにしえの修験者たちが精神を研ぎ澄ますために修行を行った、神聖な霊山としての歴史があるそうです！"
        ];
        const selectedTrivia = trivias[Math.floor(Math.random() * trivias.length)];
        addedText = `\n\n🦉 登山ガイド「${userProfile.companionName || 'ヤマコ'}」が教えてくれた山の豆知識：${selectedTrivia}`;
        setTriviaText(selectedTrivia);
        extraXp = 20;
        break;
      case 'deer':
        addedText = `\n\n🦌 登山ガイド「${userProfile.companionName || 'ヤマコ'}」の歩いた跡から美しい虹色の結晶（プリズム・クリスタル）が溢れ出し、登頂スタンプに魔法の輝きが宿りました！`;
        setHasRainbowGlow(true);
        extraXp = 25;
        break;
      case 'cat':
        const fortunes = [
          { name: '【大吉】', text: '「今日は驚くほど幸運な登山になるにゃ！」', xp: 35 },
          { name: '【中吉】', text: '「山道で素敵な出会いがある予感がするにゃ！」', xp: 25 },
          { name: '【吉】', text: '「焦らず一歩ずつ進めば、必ず素晴らしい景色が見えるにゃ！」', xp: 15 },
        ];
        const drawn = fortunes[Math.floor(Math.random() * fortunes.length)];
        addedText = `\n\n🐱 招き猫おみくじ：${drawn.name} ${drawn.text}`;
        setLuckyFortune(`${drawn.name} ${drawn.text}`);
        extraXp = drawn.xp;
        break;
      case 'dog':
        addedText = `\n\n🐶 登山ガイド「${userProfile.companionName || 'ヤマコ'}」の頼もしいパトロール先導のおかげで、1つの危険もなく、完全に安全かつ快適なルートで登りきることができました！`;
        extraXp = 20;
        break;
      default:
        addedText = `\n\n✨ 登山ガイド「${userProfile.companionName || 'ヤマコ'}」が特別な魔法で、楽しい登山の思い出に彩りを加えてくれました！`;
        extraXp = 15;
        break;
    }
    
    setMemo(prev => prev + addedText);
    setBonusXp(extraXp);
    
    alert(`${userProfile.companionName || 'ヤマコ'}が特別スキル「${activeSkin.specialSkill}」を発動したのだ！\nメモ帳に思い出が自動追加され、XPが＋${extraXp}加算されるのだ！✨`);
  };

  if (!mountain) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-amber-900/10">
        <p className="text-gray-500 font-bold">山が見つかりませんでした。</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl">戻る</button>
      </div>
    );
  }

  // Handle image conversion to Base64 (for client local storage)
  const handleFiles = (files: FileList) => {
    const maxFiles = 5;
    const remainingSlots = maxFiles - photos.length;
    if (remainingSlots <= 0) return;

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        return;
      }

      // Check size (compress or restrict if huge, e.g., limit to 2MB for storage performance)
      if (file.size > 3 * 1024 * 1024) {
        alert('画像サイズは3MB未満にしてください。');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          setPhotos(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!climbDate) {
      alert('登頂日を入力してください。');
      return;
    }
    await onSubmit(
      mountainId,
      climbDate,
      memo,
      photos,
      weather,
      companions || friendsQuery.data?.friends.filter((friend) => selectedFriendIds.includes(friend.userId)).map((friend) => friend.nickname).join('、'),
      skillUsed ? 'true' : undefined,
      skillUsed ? skillName : undefined,
      skillUsed ? bonusXp : undefined,
      hasRainbowGlow ? true : undefined,
      luckyFortune ? luckyFortune : undefined,
      triviaText ? triviaText : undefined,
      selectedFriendIds
    );
  };

  const weatherOptions = [
    { label: '晴れ', icon: <Sun className="w-4 h-4 text-amber-500" />, emoji: '☀️' },
    { label: '曇り', icon: <Cloud className="w-4 h-4 text-slate-500" />, emoji: '☁️' },
    { label: '雨', icon: <CloudRain className="w-4 h-4 text-sky-600" />, emoji: '🌧️' },
    { label: '雪', icon: <Snowflake className="w-4 h-4 text-sky-200" />, emoji: '❄️' },
  ];

  return (
    <div className="w-full max-w-lg mx-auto pb-24 px-4">
      {/* Back button and title */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border border-amber-900/5 hover:bg-amber-50 text-gray-700 transition-colors shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block font-mono">
            ADVENTURE RECORD
          </span>
          <h1 className="text-xl font-extrabold text-gray-900">
            登頂記録の作成
          </h1>
        </div>
      </div>

      {/* Mountain Banner Card */}
      <div className="relative h-28 rounded-2xl overflow-hidden mb-6 shadow-sm border border-amber-900/5 bg-emerald-900 flex items-center">
        <img
          src={mountain.imageUrl}
          alt={mountain.name}
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/80 to-transparent"></div>
        <div className="relative z-10 px-6">
          <span className="text-[10px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
            {mountain.prefecture}
          </span>
          <h2 className="text-2xl font-black text-white mt-1">
            {mountain.name}
          </h2>
          <p className="text-xs text-green-300 font-mono font-bold">
            標高 {mountain.elevation}m • {mountain.estimatedTime}
          </p>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photos Block */}
        <div className="bg-white p-5 rounded-2xl border border-amber-900/5 shadow-xs space-y-4">
          <label className="block text-sm font-bold text-emerald-950 flex items-center gap-1.5">
            <Camera className="w-4 h-4" />
            <span>登頂写真の追加 (最大5枚)</span>
          </label>

          {/* Photo Grid Preview */}
          {photos.length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden group border border-gray-100">
                  <img src={photo} alt="Upload preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-650 hover:bg-red-700 text-white shadow-xs cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-emerald-900/10 hover:border-emerald-950/30 flex flex-col items-center justify-center bg-amber-50/20 text-emerald-800 transition-colors cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-emerald-700" />
                  <span className="text-[9px] font-bold mt-1">追加</span>
                </button>
              )}
            </div>
          )}

          {/* Drag & Drop Box */}
          {photos.length === 0 && (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-emerald-600 bg-emerald-50/40 text-emerald-900'
                  : 'border-emerald-900/10 hover:border-emerald-950/30 bg-amber-50/15 text-emerald-800'
              }`}
            >
              <ImageIcon className="w-8 h-8 text-emerald-700/60" />
              <p className="text-xs font-bold">登頂時の写真をここにドロップ</p>
              <p className="text-[10px] text-gray-400">または、クリックして写真を選択</p>
              <p className="text-[9px] text-gray-400 mt-1">※最大5枚、各3MB以内</p>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple
            className="hidden"
          />
        </div>

        {/* Date and Weather */}
        <div className="bg-white p-5 rounded-2xl border border-amber-900/5 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-emerald-950 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>登頂日</span>
            </label>
            <input
              type="date"
              value={climbDate}
              onChange={(e) => setClimbDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-emerald-950 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>山頂の天気</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {weatherOptions.map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setWeather(opt.label)}
                  className={`py-2 px-1 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    weather === opt.label
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Companions */}
        <div className="bg-white p-5 rounded-2xl border border-amber-900/5 shadow-xs space-y-2">
          <label className="text-xs font-black text-emerald-950 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>同行者 (いなければ空欄)</span>
          </label>
          {friendsQuery.data?.friends.filter((friend) => friend.status === "accepted").length ? <div className="space-y-2 rounded-xl bg-emerald-50/60 p-3"><p className="text-[10px] font-bold text-emerald-800">山仲間と一緒に登った場合は選択してください</p>{friendsQuery.data.friends.filter((friend) => friend.status === "accepted").map((friend) => <label key={friend.userId} className="flex items-center gap-2 text-xs font-bold text-stone-700"><input type="checkbox" checked={selectedFriendIds.includes(friend.userId)} onChange={(event) => setSelectedFriendIds((ids) => event.target.checked ? [...ids, friend.userId] : ids.filter((id) => id !== friend.userId))} className="h-4 w-4 rounded border-stone-300 text-emerald-700" /><span>{friend.avatarUrl} {friend.nickname}</span></label>)}</div> : null}
          <input
            type="text"
            value={companions}
            onChange={(e) => setCompanions(e.target.value)}
            placeholder="例: サークルの友人、家族と、ソロ"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          />
        </div>

        {/* Companion Support Dashboard */}
        <div className="bg-gradient-to-br from-[#1b3e1b] to-[#0f240f] p-5 rounded-2xl text-white shadow-md space-y-3.5 relative overflow-hidden border-2 border-emerald-500/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl select-none animate-bounce" style={{ animationDuration: '3.5s' }}>{activeSkin.emoji}</span>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-black text-emerald-300 uppercase tracking-widest block">COMPANION SUPPORT</span>
                  <span className="bg-amber-400 text-stone-900 text-[8px] font-black px-1.5 py-0.2 rounded font-mono">
                    Lv.{activeSkin.stage}
                  </span>
                </div>
                <h3 className="text-sm font-black text-white">
                  {userProfile.companionName || 'ヤマコ'} ({activeSkin.title})
                </h3>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-[8px] text-emerald-300 block font-black uppercase tracking-wider">PASSIVE XP BOOST</span>
              <span className="text-xs font-black text-amber-300 font-mono">
                {activeSkinStage === 3 ? '+10%' : activeSkinStage === 4 ? '+15%' : activeSkinStage === 5 ? '+25%' : '+0%'}
              </span>
            </div>
          </div>

          <div className="bg-white/10 p-3 rounded-xl border border-white/10 relative z-10 text-xs text-emerald-50 leading-relaxed">
            <p className="font-bold text-[10.5px] text-amber-300 flex items-center gap-1">
              <span>🧬 特別スキル: {activeSkin.specialSkill}</span>
            </p>
            <p className="mt-1 text-[11px] opacity-90 leading-normal">
              効果: {activeSkin.bonusText}。スキルを発動すると、自動で特別な思い出を記録し、追加XPボーナスを獲得できます！
            </p>
          </div>

          <button
            type="button"
            onClick={handleActivateSkill}
            disabled={skillUsed}
            className={`w-full py-3.5 px-4 rounded-xl text-xs font-black relative z-10 transition-all shadow-xs flex items-center justify-center gap-2 ${
              skillUsed
                ? 'bg-emerald-950/60 text-emerald-350 border border-emerald-800/60 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-900 hover:from-amber-300 hover:to-amber-400 active:scale-98 cursor-pointer'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${skillUsed ? '' : 'animate-pulse text-stone-950'}`} />
            <span>
              {skillUsed
                ? `スキル発動済 (＋${bonusXp} XP 獲得！)`
                : `特別スキル「${activeSkin.specialSkill}」を発動するのだ！`
              }
            </span>
          </button>
        </div>

        {/* Note / Memo */}
        <div className="bg-white p-5 rounded-2xl border border-amber-900/5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>一言メモ・冒険の思い出</span>
            </label>
            <span className={`text-[10px] font-mono font-bold ${memo.length >= 15 ? 'text-emerald-600' : 'text-gray-400'}`}>
              {memo.length} 文字 (チャレンジ目標 15字以上: {memo.length >= 15 ? '達成！' : 'あと' + Math.max(0, 15 - memo.length) + '字'})
            </span>
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
            placeholder="山頂からの景色、楽しかったこと、大変だったこと、道中の出来事など、思い出を一言残しましょう！"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white resize-none"
          ></textarea>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-4 bg-emerald-650 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 text-center flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>アルバムにスタンプを押す！</span>
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-2">
            ※投稿すると、登山スタンプを獲得し、経験値 (XP) が加算されます。
          </p>
        </div>
      </form>
    </div>
  );
}
