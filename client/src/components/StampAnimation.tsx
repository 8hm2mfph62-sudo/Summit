/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClimbRecord, Mountain, getRankInfo } from '../types';

interface StampAnimationProps {
  mountains: Mountain[];
  record: ClimbRecord | null;
  onComplete: () => void;
  levelUpTo: number | null;
}

export default function StampAnimation({ mountains, record, onComplete, levelUpTo }: StampAnimationProps) {
  const [stage, setStage] = useState<'stamp' | 'levelup' | 'closed'>('stamp');
  const [isStamped, setIsStamped] = useState(false);

  const mountain: Mountain | undefined = record
    ? mountains.find(m => m.id === record.mountainId)
    : undefined;

  useEffect(() => {
    if (!record) return;

    setStage('stamp');
    setIsStamped(false);

    // 1. Trigger the stamp press "slam" after 400ms
    const stampTimer = setTimeout(() => {
      setIsStamped(true);
    }, 600);

    // 2. Stay on stamp stage for 3.2s total, then trigger completion
    const stageTimer = setTimeout(() => {
      setStage('closed');
      onComplete();
    }, 3200);

    return () => {
      clearTimeout(stampTimer);
      clearTimeout(stageTimer);
    };
  }, [record]);

  if (!record || !mountain || stage === 'closed') return null;

  // Generate some simple confetti elements
  const confettiCount = 30;
  const colors = ['#F4C430', '#D4AF37', '#2D5A27', '#4A90E2', '#FF6B6B', '#F7B731', '#10AC84'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <AnimatePresence mode="wait">
        {stage === 'stamp' && (
          <motion.div
            key="stamp-panel"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-md p-6 overflow-hidden shadow-2xl rounded-2xl bg-[#FAF6EE] border-4 border-amber-900/10 text-center"
          >
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#2d5a27_1px,transparent_1px)] [background-size:16px_16px]"></div>

            <span className="inline-block px-3 py-1 mb-2 text-xs font-bold tracking-wider text-amber-800 rounded-full bg-amber-100 font-mono">
              ADVENTURE UNLOCKED
            </span>

            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {mountain.name} 登破！
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              標高 {mountain.elevation}m ({mountain.prefecture}エリア)
            </p>

            {/* Stamp Card Area */}
            <div className="relative flex items-center justify-center w-52 h-52 mx-auto my-6 border-4 border-dashed border-amber-800/20 rounded-full bg-amber-50/50">
              {/* Stamped Ink Result */}
              {isStamped && (
                <motion.div
                  initial={{ opacity: 0, scale: 3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 150 }}
                  className={`flex flex-col items-center justify-center w-40 h-40 rounded-full p-4 rotate-[-12deg] shadow-md relative ${
                    record.hasRainbowGlow 
                      ? 'border-4 border-transparent shadow-[0_0_25px_rgba(251,191,36,0.65)]' 
                      : `border-4 border-double ${mountain.stampDesign.borderColor} ${mountain.stampDesign.bgColor}`
                  } ${mountain.stampDesign.color}`}
                  style={record.hasRainbowGlow ? {
                    backgroundImage: 'linear-gradient(#FAF6EE, #FAF6EE), linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #6366f1, #a855f7)',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                  } : undefined}
                >
                  {record.hasRainbowGlow && (
                    <span className="absolute -top-3.5 -right-2 text-2xl animate-bounce" style={{ animationDuration: '2s' }}>
                      🌈
                    </span>
                  )}
                  <span className="text-5xl mb-1 filter drop-shadow-sm select-none">
                    {mountain.stampDesign.icon}
                  </span>
                  <span className="text-sm font-black tracking-widest font-sans border-t border-b border-current py-0.5 px-2">
                    {mountain.stampDesign.text}
                  </span>
                  <span className="text-[10px] font-mono mt-1 font-bold">
                    {record.climbDate.replace(/-/g, '.')}
                  </span>
                </motion.div>
              )}

              {/* Physical Stamp Handle Hovering & Pressing */}
              {!isStamped && (
                <motion.div
                  initial={{ y: -120, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute pointer-events-none flex flex-col items-center"
                >
                  {/* Stamp handle illustration */}
                  <div className="w-10 h-14 bg-amber-850 rounded-t-xl border border-amber-950 shadow-md"></div>
                  <div className="w-16 h-4 bg-amber-700 rounded-md shadow-xs"></div>
                  <div className="text-4xl mt-1 select-none opacity-80">{mountain.stampDesign.icon}</div>
                </motion.div>
              )}
            </div>

            {/* Text notifications */}
            <div className="mt-6 min-h-12 flex flex-col justify-center">
              <AnimatePresence>
                {isStamped && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-amber-900 flex items-center justify-center gap-1">
                        <span>🎉</span>
                        <span>踏破スタンプをコレクションしました！</span>
                      </p>
                      <p className="text-xs font-bold text-emerald-700 font-mono">
                        経験値 +{record.xpEarned} XP 獲得！
                      </p>
                    </div>

                    {record.companionBonusMessage && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="p-3 rounded-xl bg-gradient-to-r from-emerald-550/10 to-teal-550/10 border border-emerald-500/20 text-[11px] text-stone-850 font-bold leading-relaxed shadow-xs text-center"
                      >
                        {record.companionBonusMessage}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Simulated Confetti behind the stamp card */}
            {isStamped && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: confettiCount }).map((_, i) => {
                  const left = Math.random() * 100;
                  const delay = Math.random() * 0.5;
                  const duration = 1.5 + Math.random() * 1.5;
                  const size = 6 + Math.random() * 8;
                  const color = colors[i % colors.length];
                  return (
                    <motion.div
                      key={i}
                      initial={{ y: '100%', x: `${left}%`, opacity: 1, scale: 0 }}
                      animate={{
                        y: '-10%',
                        x: `${left + (Math.random() * 20 - 10)}%`,
                        opacity: 0,
                        scale: [0, 1, 1, 0],
                        rotate: Math.random() * 360
                      }}
                      transition={{
                        duration,
                        delay,
                        ease: 'easeOut',
                        repeat: 0
                      }}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        width: size,
                        height: size,
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                        backgroundColor: color,
                        zIndex: -1
                      }}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
