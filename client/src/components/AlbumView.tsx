/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Album, Mountain, ClimbRecord, UserProfile } from '../types';
import { BookOpen, X, ChevronLeft, ChevronRight, Calendar, Cloud, Compass, Sparkles, AlertCircle, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AlbumViewProps {
  mountains: Mountain[];
  albums: Album[];
  records: ClimbRecord[];
  isClimbed: (id: string) => boolean;
  onSelectMountain: (id: string) => void;
  onBack?: () => void;
  userProfile?: UserProfile;
}

export default function AlbumView({ mountains, albums, records, isClimbed, onSelectMountain, onBack, userProfile }: AlbumViewProps) {
  const [openedAlbumId, setOpenedAlbumId] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  const isPremium = userProfile?.isPremium === true;

  const openedAlbum = albums.find(a => a.id === openedAlbumId);
  const albumMountains = openedAlbum ? openedAlbum.mountainIds.map(mId => mountains.find(m => m.id === mId)).filter((mountain): mountain is Mountain => Boolean(mountain)) : [];

  const handleOpenAlbum = (albumId: string) => {
    setOpenedAlbumId(albumId);
    setCurrentPageIndex(0);
  };

  const handleNextPage = () => {
    if (openedAlbum && currentPageIndex < albumMountains.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (openedAlbum && currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  // Check if a specific album is completely finished (all mountains climbed)
  const isAlbumCompleted = (album: Album) => {
    return album.mountainIds.every(mId => isClimbed(mId));
  };

  // Count stamps in a specific album
  const getAlbumStampsCount = (album: Album) => {
    return album.mountainIds.filter(mId => isClimbed(mId)).length;
  };

  // Get current active page mountain and records
  const currentMountain = openedAlbum ? albumMountains[currentPageIndex] : null;
  const currentMountainRecord = currentMountain
    ? records.filter(r => r.mountainId === currentMountain.id).sort((a, b) => new Date(b.climbDate).getTime() - new Date(a.climbDate).getTime())[0]
    : null;

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 pb-24 px-4 text-center">
      {/* Header */}
      <div className="flex items-center gap-3 text-left">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 rounded-xl text-gray-600 transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
            title="ホームに戻る"
          >
            <ChevronLeft className="w-4.5 h-4.5 stroke-[2.5]" />
          </button>
        )}
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block font-mono">
            DIGITAL BOOKSHELF
          </span>
          <h1 className="text-xl font-extrabold text-gray-900">
            冒険日誌・アルバム本棚
          </h1>
        </div>
      </div>

      {/* Album Wood Shelf Container */}
      <div className="relative mt-8 select-none">
        {/* Wall background wrapper */}
        <div className="p-6 bg-stone-50 rounded-3xl border border-stone-200/60 shadow-inner relative flex flex-col items-center">
          {/* Bookshelf wooden shelves */}
          <div className="w-full flex justify-around items-end px-2 pt-16 pb-1 relative z-10">
            {albums.map((album, idx) => {
              const completed = isAlbumCompleted(album);
              const stampsCount = getAlbumStampsCount(album);

              // Match colors to themes
              const coverColors: { [key: string]: string } = {
                higashiyama_album: 'from-emerald-700 to-emerald-900 shadow-emerald-950/45 border-emerald-950',
                kitayama_album: 'from-teal-700 to-teal-900 shadow-teal-950/45 border-teal-950',
                nishiyama_album: 'from-amber-700 to-amber-900 shadow-amber-950/45 border-amber-950',
                tanba_album: 'from-stone-700 to-stone-900 shadow-stone-950/45 border-stone-950',
                yamashiro_album: 'from-orange-700 to-orange-900 shadow-orange-950/45 border-orange-950',
                tango_album: 'from-indigo-800 to-indigo-950 shadow-indigo-950/45 border-indigo-950',
                hokkaido_top10_album: 'from-indigo-900 to-purple-950 shadow-indigo-950/55 border-indigo-950',
                hokkaido_daisetsu_tokachi_album: 'from-emerald-800 to-emerald-950 shadow-emerald-950/55 border-emerald-950',
                hokkaido_hidaka_album: 'from-zinc-800 to-zinc-950 shadow-zinc-950/55 border-zinc-950',
                hokkaido_shiretoko_akan_album: 'from-blue-800 to-blue-950 shadow-blue-950/55 border-blue-950',
                hokkaido_central_south_album: 'from-amber-800 to-amber-950 shadow-amber-950/55 border-amber-950',
              };

              return (
                <motion.div
                  key={album.id}
                  whileHover={{ y: -15, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleOpenAlbum(album.id)}
                  className="cursor-pointer flex flex-col items-center relative group"
                >
                  {/* Book Spine */}
                  <div className={`w-9 h-32 bg-gradient-to-r ${coverColors[album.id] || 'from-stone-700 to-stone-900'} rounded-t-md rounded-b-xs border-r border-t border-l border-white/10 shadow-[4px_-2px_6px_rgba(0,0,0,0.3)] relative flex flex-col justify-between py-4 text-center shrink-0`}>
                    {/* Gold Foil Top Accents */}
                    <div className="border-t border-b border-yellow-400/50 mx-1.5 h-1"></div>

                    {/* Vertical Title (Gold Foil) */}
                    <div className="text-[10px] leading-tight font-black font-sans text-yellow-300 tracking-wider [writing-mode:vertical-rl] mx-auto select-none opacity-85 select-none font-display">
                      {album.title.split(' ')[0]}
                    </div>

                    {/* Book Badge (unlocked count) */}
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-bold text-white/90 leading-none">
                        {stampsCount}/{album.mountainIds.length}
                      </span>
                      {completed && (
                        <span className="text-[8px] text-yellow-300 animate-pulse font-mono font-black">★</span>
                      )}
                    </div>
                  </div>

                  {/* Ribbon bookmark hanging down */}
                  {completed && (
                    <div className="absolute -bottom-2 w-1.5 h-4 bg-amber-400 rounded-b-sm shadow-xs pointer-events-none"></div>
                  )}

                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 scale-0 group-hover:scale-100 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-md transition-all shadow-md pointer-events-none w-28 text-center z-20">
                    <p className="truncate">{album.title}</p>
                    <p className="text-[9px] text-yellow-400">進捗: {stampsCount}/{album.mountainIds.length}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Wooden Shelf Board */}
          <div className="w-full h-4 bg-gradient-to-b from-amber-800 to-amber-950 rounded-md border-b-4 border-amber-950 shadow-[0_8px_16px_rgba(0,0,0,0.2)]"></div>
          {/* Wood details */}
          <div className="w-11/12 h-2 bg-amber-950/20 mx-auto rounded-b-md blur-[1px]"></div>
        </div>

        <p className="text-xs font-bold text-stone-500 mt-4 leading-relaxed">
          📖 本棚からアルバムをタップすると、中に記録した登山の思い出やスタンプが閲覧できます。
        </p>
      </div>

      {/* Album Opening Modal View */}
      <AnimatePresence>
        {openedAlbum && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
            {/* Click outer mask to close */}
            <div className="absolute inset-0" onClick={() => setOpenedAlbumId(null)}></div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 22, stiffness: 160 }}
              className="relative w-full max-w-4xl bg-amber-900/10 rounded-3xl p-3 sm:p-5 flex flex-col max-h-[94vh]"
            >
              {/* Actual physical double-page scrapbook */}
              <div className="relative w-full bg-[#FAF6EE] rounded-2xl shadow-2xl border-x-[12px] border-amber-900/90 flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden md:h-[650px] border-y-4">
                {/* Physical Book spine line down the middle in landscape */}
                <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1.5 bg-gradient-to-r from-black/25 via-black/10 to-transparent -ml-0.75 z-25"></div>

                {/* Left Page (Polaroid Photo and details) */}
                <div className="w-full md:w-1/2 p-6 flex flex-col justify-between items-center bg-[#FAF6EE] relative min-h-[350px]">
                  {/* Photo Section */}
                  <div className="w-full flex-1 flex flex-col items-center justify-center">
                    <h3 className="text-xs uppercase font-black tracking-widest text-emerald-800 mb-4 font-mono flex items-center gap-1">
                      <Bookmark className="w-4 h-4 text-amber-500" />
                      <span>{openedAlbum.title} • PAGE {currentPageIndex + 1}/{albumMountains.length}</span>
                    </h3>

                    {/* Polaroid Styled Card container */}
                    <div className="bg-white p-4 pb-6 rounded-xs shadow-[0_6px_12px_rgba(0,0,0,0.1)] border border-gray-150 rotate-[-2deg] max-w-[280px] w-full relative">
                      {/* Fake tape holding card */}
                      <div className="absolute -top-3 left-1/2 -ml-8 w-16 h-5 bg-amber-150/40 border-dashed border-t border-b border-amber-200/50 backdrop-blur-xs rotate-[3deg] shadow-xs"></div>

                      {currentMountainRecord ? (
                        /* Climbed Photo Display */
                        <div className="aspect-square w-full bg-stone-900 rounded-xs overflow-hidden relative">
                          <img
                            src={currentMountainRecord.photos.length > 0 ? currentMountainRecord.photos[0] : currentMountain?.imageUrl}
                            alt={currentMountain?.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        /* Unexplored Mountain sketch display */
                        <div
                          onClick={() => currentMountain && onSelectMountain(currentMountain.id)}
                          className="aspect-square w-full bg-stone-100 rounded-xs border-2 border-dashed border-stone-200 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-stone-50 transition-colors"
                        >
                          <span className="text-3xl text-gray-300 mb-2">🏔️</span>
                          <span className="text-xs font-bold text-gray-400">未登頂の冒険ステージ</span>
                          <span className="text-[9px] text-gray-400 mt-1 px-2.5 py-1 rounded-md bg-stone-200/50 leading-tight">
                            タップして山の情報を見る
                          </span>
                        </div>
                      )}

                      {/* Polaroid text signature */}
                      <div className="mt-4 text-center">
                        <span className="font-sans font-black text-gray-800 text-sm tracking-wide">
                          {currentMountain?.name}
                        </span>
                        <p className="text-[9px] font-mono font-bold text-gray-400 mt-0.5">
                          標高 {currentMountain?.elevation}m ({currentMountain?.prefecture}エリア)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Close button in absolute corner or bottom for mobile */}
                  <button
                    onClick={() => setOpenedAlbumId(null)}
                    className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-stone-200 text-gray-500 cursor-pointer md:hidden"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Right Page (The Diary handwritten logs, weather, date, stamps) */}
                <div className="w-full md:w-1/2 p-6 flex flex-col justify-between bg-[#FCFAF5] relative min-h-[380px] border-t md:border-t-0 md:border-l border-amber-900/10">
                  <div className="space-y-4">
                    {/* Page header with Album statistics */}
                    <div className="flex items-center justify-between border-b border-amber-900/10 pb-2">
                      <span className="text-[10px] font-bold text-amber-900 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{openedAlbum.title}</span>
                      </span>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        スタンプ: {getAlbumStampsCount(openedAlbum)} / {openedAlbum.mountainIds.length}
                      </span>
                    </div>

                    {currentMountainRecord && currentMountain ? (
                      /* If climbed, show complete journal log entry */
                      <div className="space-y-4 text-left">
                        {/* Title of peak */}
                        <div className="space-y-1">
                          <h4 className="text-2xl font-black text-gray-800 tracking-wide font-sans flex items-baseline gap-2">
                            {currentMountain.name}
                            <span className="text-xs font-medium text-gray-500 font-mono">
                              登頂記録
                            </span>
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-bold">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                              {currentMountainRecord.climbDate}
                            </span>
                            {currentMountainRecord.weather && (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-150">
                                天気: {currentMountainRecord.weather}
                              </span>
                            )}
                            {currentMountainRecord.companions && (
                              <span className="text-[11px] text-gray-500">
                                同行者: {currentMountainRecord.companions}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Journal Handwritten Memories Box */}
                        <div className="relative p-4 rounded-xl bg-amber-50/20 border border-amber-900/5 min-h-[120px] shadow-inner">
                          {/* Ruled lines bg */}
                          <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(transparent,transparent_23px,#000_23px,#000_24px)] pointer-events-none"></div>
                          
                          <p className="text-sm text-gray-800 font-serif leading-[24px] tracking-wide relative z-10 whitespace-pre-wrap italic">
                            {currentMountainRecord.memo || '山を登った思い出が記されていません。登頂時の出来事や、心に残った風景を書き留めておきましょう！'}
                          </p>
                        </div>

                        {/* Dynamic Stamp Placement */}
                        <div className="flex items-center justify-between gap-4 pt-3">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                              踏破スタンプ
                            </span>
                            <p className="text-xs font-bold text-gray-700">
                              {currentMountain.stampDesign.text}
                            </p>
                          </div>

                          {/* Stamp graphic slightly tilted */}
                          <motion.div
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: -10 }}
                            className={`flex flex-col items-center justify-center w-16 h-16 rounded-full select-none shadow-xs rotate-[-10deg] relative ${
                              (currentMountainRecord.hasRainbowGlow || isPremium)
                                ? 'border-2 border-transparent shadow-[0_0_15px_rgba(251,191,36,0.7)] animate-pulse'
                                : `border-2 border-double ${currentMountain.stampDesign.borderColor} ${currentMountain.stampDesign.bgColor}`
                            } ${currentMountain.stampDesign.color}`}
                            style={(currentMountainRecord.hasRainbowGlow || isPremium) ? {
                              backgroundImage: 'linear-gradient(#FAF6EE, #FAF6EE), linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #6366f1, #a855f7)',
                              backgroundOrigin: 'border-box',
                              backgroundClip: 'padding-box, border-box',
                            } : undefined}
                          >
                            {(currentMountainRecord.hasRainbowGlow || isPremium) && (
                              <span className="absolute -top-2.5 -right-2 text-md select-none animate-bounce" style={{ animationDuration: '2s' }}>
                                🌈
                              </span>
                            )}
                            <span className="text-2xl mb-0.5">{currentMountain.stampDesign.icon}</span>
                            <span className="text-[8px] font-black tracking-widest border-t border-b border-current leading-tight px-1 uppercase">
                              {(currentMountainRecord.hasRainbowGlow || isPremium) ? 'RAINBOW!' : 'OK!'}
                            </span>
                          </motion.div>
                        </div>
                      </div>
                    ) : (
                      /* Unexplored Peak Journal Placeholder */
                      currentMountain && (
                        <div className="py-12 px-4 text-center space-y-4 text-left flex flex-col justify-center h-72">
                          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto" />
                          <div className="space-y-1">
                            <h4 className="text-lg font-black text-gray-800">
                              まだ登頂記録がありません
                            </h4>
                            <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                              「{currentMountain.name}」を踏破して、写真や日記、思い出を記録し、このスタンプ帳を満たしましょう！
                            </p>
                          </div>
                          <button
                            onClick={() => onSelectMountain(currentMountain.id)}
                            className="px-4 py-2 bg-emerald-650 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer mx-auto"
                          >
                            この山の冒険情報を見る 🏔️
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  {/* Album Navigation Buttons */}
                  <div className="flex justify-between items-center pt-4 border-t border-amber-900/10">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPageIndex === 0}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                        currentPageIndex === 0
                          ? 'border-gray-200 text-gray-300 bg-gray-50'
                          : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>前のページ</span>
                    </button>

                    <span className="text-xs font-mono font-bold text-gray-400">
                      PAGE {currentPageIndex + 1} / {albumMountains.length}
                    </span>

                    <button
                      onClick={handleNextPage}
                      disabled={currentPageIndex === albumMountains.length - 1}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                        currentPageIndex === albumMountains.length - 1
                          ? 'border-gray-200 text-gray-300 bg-gray-50'
                          : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      <span>次のページ</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Close Scrapbook Banner Button */}
              <button
                onClick={() => setOpenedAlbumId(null)}
                className="mt-4 px-6 py-2.5 bg-amber-950 hover:bg-amber-900 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer self-center"
              >
                アルバムを閉じる (本棚に戻る)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
