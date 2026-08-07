/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { Mountain, ClimbRecord } from '../types';
import { X, MapPin, Compass, Clock, Calendar, CheckCircle2, History, CloudRain, Sun } from 'lucide-react';

interface MountainDetailModalProps {
  mountain: Mountain | null;
  onClose: () => void;
  isClimbed: boolean;
  historyRecords: ClimbRecord[];
  onRecord: (mountainId: string) => void;
}

export default function MountainDetailModal({
  mountain,
  onClose,
  isClimbed,
  historyRecords,
  onRecord,
}: MountainDetailModalProps) {
  if (!mountain) return null;

  // Render difficulty rating stars
  const renderDifficulty = (difficulty: Mountain['difficulty']) => {
    const total = 3;
    const filled = difficulty === 'beginner' ? 1 : difficulty === 'intermediate' ? 2 : 3;
    const labels = {
      beginner: '初級者向け (ハイキングレベル)',
      intermediate: '中級者向け (しっかりした登山道)',
      advanced: '上級者向け (本格的な山岳装備推奨)'
    };

    return (
      <div className="space-y-1">
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`text-xl ${i < filled ? 'text-amber-500' : 'text-gray-300'}`}
            >
              ★
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-500">{labels[difficulty]}</p>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
        {/* Background Click Shield */}
        <div className="absolute inset-0" onClick={onClose}></div>

        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 150 }}
          className="relative w-full sm:max-w-xl md:max-w-2xl bg-[#FAF6EE] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border-t-4 border-amber-900/10 max-h-[92vh] sm:max-h-[85vh] flex flex-col"
        >
          {/* Header Image Cover */}
          <div className="relative h-48 sm:h-64 shrink-0 bg-emerald-950">
            <img
              src={mountain.imageUrl}
              alt={mountain.name}
              className="w-full h-full object-cover opacity-85"
              referrerPolicy="no-referrer"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#FAF6EE] via-black/20 to-black/30"></div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/45 hover:bg-black/60 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Checked Stamp Badge if Climbed */}
            {isClimbed && (
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-650 text-white text-xs font-bold tracking-wide shadow-md">
                <CheckCircle2 className="w-4 h-4" />
                <span>登頂済み</span>
              </div>
            )}

            {/* Title Overlay */}
            <div className="absolute bottom-4 left-6 right-6">
              <span className="inline-block px-2.5 py-0.5 mb-1.5 text-[10px] font-bold tracking-wider uppercase text-emerald-900 bg-emerald-100 rounded-md">
                {mountain.prefecture}エリア
              </span>
              <h2 className="text-3xl font-black text-gray-900 filter drop-shadow-sm flex items-baseline gap-2">
                {mountain.name}
                <span className="text-lg font-mono font-medium text-gray-700">
                  {mountain.elevation}m
                </span>
              </h2>
            </div>
          </div>

          {/* Modal Content Scrollable Area */}
          <div className="overflow-y-auto p-6 space-y-6 flex-1">
            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                <span>冒険ステージ概要</span>
              </h4>
              <p className="text-sm leading-relaxed text-gray-700 bg-white/65 p-4 rounded-xl border border-amber-900/5">
                {mountain.description}
              </p>
            </div>

            {/* Specifications Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/80 rounded-xl border border-amber-900/5 space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">
                  難易度レベル
                </span>
                {renderDifficulty(mountain.difficulty)}
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-amber-900/5 space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">
                  所在地
                </span>
                <p className="text-xs font-bold text-gray-800 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span>{mountain.location}</span>
                </p>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-amber-900/5 space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">
                  おすすめ時期
                </span>
                <p className="text-sm font-bold text-gray-800 flex items-center gap-1">
                  <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{mountain.recommendedSeason}</span>
                </p>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-amber-900/5 space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">
                  標準所要時間
                </span>
                <p className="text-sm font-bold text-gray-800 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{mountain.estimatedTime}</span>
                </p>
              </div>
            </div>

            {/* Stamp Design Preview */}
            <div className="p-4 bg-amber-50/40 rounded-xl border border-dashed border-amber-800/20 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-800">獲得できる踏破の証</span>
                <h5 className="text-sm font-bold text-gray-900">
                  {mountain.stampDesign.text}
                </h5>
                <p className="text-xs text-gray-500">
                  登頂の記録をアルバムに綴ると、このスタンプが押印されます。
                </p>
              </div>
              <div className={`flex items-center justify-center w-14 h-14 rounded-full border-2 border-double shrink-0 shadow-xs rotate-[-6deg] ${mountain.stampDesign.borderColor} ${mountain.stampDesign.bgColor} ${mountain.stampDesign.color}`}>
                <span className="text-2xl">{mountain.stampDesign.icon}</span>
              </div>
            </div>

            {/* Climbing History */}
            {historyRecords.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                  <History className="w-4 h-4" />
                  <span>この山の冒険の記録 ({historyRecords.length}回)</span>
                </h4>
                <div className="space-y-3">
                  {historyRecords.map((rec, index) => (
                    <div key={rec.id} className="p-3 bg-white rounded-xl border border-amber-900/5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          {rec.climbDate}
                        </span>
                        {rec.weather && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            天気: {rec.weather}
                          </span>
                        )}
                      </div>
                      {rec.memo && (
                        <p className="text-xs text-gray-700 italic border-l-2 border-amber-700/20 pl-2 leading-relaxed">
                          「{rec.memo}」
                        </p>
                      )}
                      {rec.companionBonusMessage && (
                        <div className="text-[10px] bg-emerald-50 text-stone-850 border border-emerald-100 rounded-lg p-2.5 flex items-start gap-1.5 leading-relaxed mt-1.5 font-bold">
                          <span className="text-xs shrink-0">✨</span>
                          <span>{rec.companionBonusMessage}</span>
                        </div>
                      )}
                      {rec.photos.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {rec.photos.map((photo, pIdx) => (
                            <img
                              key={pIdx}
                              src={photo}
                              alt={`登頂写真 ${pIdx + 1}`}
                              className="w-14 h-14 object-cover rounded-md shrink-0 border border-gray-100"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CTA Action Area */}
          <div className="p-4 sm:p-6 bg-white border-t border-amber-900/5 shrink-0 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-colors text-sm cursor-pointer"
            >
              閉じる
            </button>
            <button
              onClick={() => {
                onRecord(mountain.id);
                onClose();
              }}
              className="flex-2 py-3 px-4 bg-emerald-650 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>⛰️</span>
              <span>
                {isClimbed ? '登頂をもう一度記録する' : 'この山を記録する'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
