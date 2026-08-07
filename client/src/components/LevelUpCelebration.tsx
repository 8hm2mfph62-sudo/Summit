import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Sparkles, ChevronRight, Star, Heart } from 'lucide-react';
import { getRankInfo } from '../types';

interface LevelUpCelebrationProps {
  levelUpTo: number;
  onClose: () => void;
  companionName: string;
  companionEmoji: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'star';
  velocity: { x: number; y: number };
}

export default function LevelUpCelebration({
  levelUpTo,
  onClose,
  companionName,
  companionEmoji,
}: LevelUpCelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showStats, setShowStats] = useState(false);

  const prevLevel = levelUpTo - 1;
  const prevRank = getRankInfo(prevLevel);
  const currentRank = getRankInfo(levelUpTo);
  const isRankUp = currentRank.name !== prevRank.name;

  const colors = [
    '#F59E0B', // amber-500
    '#10B981', // emerald-500
    '#3B82F6', // blue-500
    '#EC4899', // pink-500
    '#8B5CF6', // purple-500
    '#EF4444', // red-500
    '#FBBF24', // yellow-400
  ];

  const shapes: Array<'circle' | 'square' | 'triangle' | 'star'> = ['circle', 'square', 'triangle', 'star'];

  // Initialize spectacular confetti explosion
  useEffect(() => {
    const list: Particle[] = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
      // Angle and speed of initial blast
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 12;
      list.push({
        id: i,
        x: 50, // center %
        y: 50, // center %
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 1.2,
        color: colors[i % colors.length],
        shape: shapes[i % shapes.length],
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed - 3, // slightly upward bias
        },
      });
    }
    setParticles(list);

    // Staggered presentation of stats after 800ms
    const timer = setTimeout(() => {
      setShowStats(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md overflow-hidden select-none">
      {/* 1. Rotating Sunburst / Radial Background Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute w-[800px] h-[800px] opacity-[0.08]"
          style={{
            background: 'repeating-conic-gradient(from 0deg, transparent 0deg, #10B981 10deg, transparent 20deg, #FBBF24 30deg, transparent 40deg)',
          }}
        />
        {/* Subtle pulsating center radial gradient */}
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"
        />
      </div>

      {/* 2. Interactive Confetti / Exploding Star Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map(p => {
          return (
            <motion.div
              key={p.id}
              initial={{
                x: '50vw',
                y: '45vh',
                scale: 0,
                rotate: p.rotation,
                opacity: 1,
              }}
              animate={{
                x: `calc(50vw + ${p.velocity.x * 20}px)`,
                y: `calc(45vh + ${p.velocity.y * 20}px + 120px)`, // simulate gravity drop
                scale: [0, p.scale, p.scale, 0],
                rotate: p.rotation + 360,
                opacity: [1, 1, 0.8, 0],
              }}
              transition={{
                duration: 2.2 + Math.random() * 1.2,
                ease: 'easeOut',
              }}
              className="absolute"
              style={{
                width: p.shape === 'star' ? '14px' : '10px',
                height: p.shape === 'star' ? '14px' : '10px',
                backgroundColor: p.shape === 'star' ? 'transparent' : p.color,
                borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'triangle' ? '0%' : '2px',
                clipPath: p.shape === 'triangle' 
                  ? 'polygon(50% 0%, 0% 100%, 100% 100%)' 
                  : p.shape === 'star'
                  ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                  : undefined,
                background: p.shape === 'star' ? p.color : undefined,
              }}
            />
          );
        })}
      </div>

      {/* 3. Main Celebratory Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 16, stiffness: 120 }}
        className="relative w-full max-w-sm p-7 text-center bg-zinc-900 border-2 border-emerald-500/40 rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.6)] border-b-emerald-400/50"
      >
        {/* Sparkle icons floating */}
        <div className="absolute -top-4 -left-4 text-amber-400 text-2xl animate-bounce">✨</div>
        <div className="absolute -top-6 right-6 text-yellow-300 text-3xl animate-pulse">⭐</div>
        <div className="absolute bottom-24 -right-3 text-emerald-400 text-2xl animate-bounce [animation-delay:0.5s]">✨</div>

        {/* Big level circular container */}
        <div className="relative inline-flex items-center justify-center my-4">
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.2, damping: 12 }}
            className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-amber-500 p-1 shadow-[0_8px_24px_rgba(16,185,129,0.3)] flex items-center justify-center relative"
          >
            <div className="w-full h-full rounded-full bg-zinc-950 flex flex-col items-center justify-center">
              <span className="text-[10px] tracking-wider text-emerald-400/80 font-black font-mono">LEVEL</span>
              <span className="text-3xl font-black text-white font-mono leading-none">{levelUpTo}</span>
            </div>
            {/* Crown emoji floating on top */}
            <div className="absolute -top-3.5 -right-1 text-2xl select-none filter drop-shadow-md">👑</div>
          </motion.div>

          {/* Golden ring glow */}
          <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-amber-400/30 animate-ping [animation-duration:3s]" />
        </div>

        {/* Level Up Text */}
        <div className="mt-2 space-y-1">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-black bg-gradient-to-r from-amber-300 via-emerald-400 to-amber-300 bg-clip-text text-transparent font-sans tracking-wider"
          >
            {isRankUp ? 'ギルドランク昇格！' : 'レベルアップ！'}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-zinc-400 font-mono tracking-widest uppercase"
          >
            LEVEL UP COMPLETED
          </motion.p>
        </div>

        {/* 4. Stat comparison section with smooth staggered appearance */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 space-y-4"
            >
              {/* Before -> After Comparison Row */}
              <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800 flex items-center justify-around">
                <div className="text-center">
                  <span className="text-[9px] text-zinc-500 block font-mono">BEFORE</span>
                  <div className="text-sm font-bold text-zinc-400 flex items-center gap-1 mt-1 justify-center">
                    <span>{prevRank.emoji}</span>
                    <span className="text-xs">{prevRank.name}</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">Lv.{prevLevel}</span>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <ChevronRight className="w-5 h-5 text-emerald-500 animate-pulse" />
                </div>

                <div className="text-center">
                  <span className="text-[9px] text-amber-400 block font-mono font-bold">AFTER</span>
                  <div className={`text-sm font-black flex items-center gap-1 mt-1 justify-center bg-gradient-to-r ${currentRank.badgeColor} bg-clip-text text-transparent`}>
                    <span>{currentRank.emoji}</span>
                    <span className="text-xs">{currentRank.name}</span>
                  </div>
                  <span className="text-xs font-black font-mono text-emerald-400">Lv.{levelUpTo}</span>
                </div>
              </div>

              {/* Companion's Congratulatory Bubble */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="relative bg-emerald-950/30 border border-emerald-900/40 p-3 rounded-2xl flex items-start gap-2.5 text-left"
              >
                {/* Companion Avatar */}
                <div className="text-2xl mt-0.5 select-none filter drop-shadow-sm shrink-0 bg-emerald-950/60 p-1 rounded-xl">
                  {companionEmoji}
                </div>
                {/* Bubble speech */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-emerald-400 block tracking-wide">{companionName}</span>
                  <p className="text-[11px] text-emerald-100/90 font-medium leading-relaxed font-sans">
                    「レベルアップおめでとうございます！冒険者としての一歩が実を結びましたね。これからも一緒にたくさんのスタンプを集めましょう！」
                  </p>
                </div>

                {/* Sparkling detail badge */}
                <div className="absolute -bottom-1.5 -right-1.5 text-xs bg-amber-400 text-zinc-950 px-1.5 py-0.5 font-bold rounded-md font-mono scale-90 flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>XP+</span>
                </div>
              </motion.div>

              {/* Dynamic achievements unlocked list */}
              <div className="space-y-1.5 text-left px-1">
                <span className="text-[10px] font-bold text-zinc-500 block font-mono tracking-wider">UNLOCKED REWARDS</span>
                <div className="text-[11px] text-zinc-300 space-y-1 font-sans">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                    <span>新しい山々への冒険者ギルド推薦状</span>
                  </div>
                  {isRankUp && (
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>上位ギルドランク「{currentRank.name}」の称号</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Heart className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>コンパニオン「{companionName}」の親愛度が上昇！</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. Close Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          className="w-full mt-7 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-black tracking-widest text-xs rounded-xl shadow-[0_4px_16px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_24px_rgba(16,185,129,0.4)] border border-emerald-400/40 text-center uppercase transition-all duration-200 cursor-pointer"
        >
          冒険を続ける
        </motion.button>
      </motion.div>
    </div>
  );
}
