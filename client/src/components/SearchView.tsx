/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Mountain, ClimbRecord, UserProfile } from '../types';
import { Search, SlidersHorizontal, ArrowUpDown, CheckCircle, Compass, MapPin } from 'lucide-react';
import { matchesPrefecture, PREFECTURE_ORDER, toOfficialPrefecture } from '@/lib/prefectures';
import { getPrefectureRecommendationScore } from '@/lib/recommendations';

export { matchesPrefecture, PREFECTURE_ORDER, toOfficialPrefecture } from '@/lib/prefectures';

interface SearchViewProps {
  mountains: Mountain[];
  records: ClimbRecord[];
  onSelectMountain: (id: string) => void;
  isClimbed: (id: string) => boolean;
  userProfile?: UserProfile;
}

export default function SearchView({ mountains, records, onSelectMountain, isClimbed, userProfile }: SearchViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('すべて');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('すべて');
  const [selectedElevationRange, setSelectedElevationRange] = useState<string>('すべて');
  const [sortBy, setSortBy] = useState<string>('id'); // 'id' (default), 'elevation-desc', 'elevation-asc', 'name'
  const [showFilters, setShowFilters] = useState(false);

  // Show only official prefecture labels that have mountain data in the catalogue.
  const prefectures = useMemo(() => {
    const available = new Set(
      mountains.flatMap((mountain) => mountain.prefecture.split('・').map(toOfficialPrefecture)),
    );
    return ['すべて', ...PREFECTURE_ORDER.filter((prefecture) => available.has(prefecture))];
  }, [mountains]);

  // Difficulty translations
  const difficulties = [
    { label: 'すべて', value: 'すべて' },
    { label: '初級 (★☆☆)', value: 'beginner' },
    { label: '中級 (★★☆)', value: 'intermediate' },
    { label: '上級 (★★★)', value: 'advanced' },
  ];

  // Elevation filter choices
  const elevationRanges = [
    { label: 'すべて', value: 'すべて' },
    { label: '500m 未満 (低山ハイク)', value: 'under-500' },
    { label: '500m〜1000m (ハイキング)', value: '500-1000' },
    { label: '1000m 以上 (本格登山)', value: 'over-1000' },
  ];

  // Sorting choices
  const sortOptions = [
    { label: '標準順', value: 'id' },
    { label: '標高の高い順', value: 'elevation-desc' },
    { label: '標高の低い順', value: 'elevation-asc' },
    { label: '山名順 (あいうえお)', value: 'name' },
  ];

  // Compute filtered & sorted mountains
  const processedMountains = useMemo(() => {
    let result = [...mountains];

    // 1. Text Search Filter (name or location or description)
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      );
    }

    // 2. Prefecture filter
    if (selectedPrefecture !== 'すべて') {
      result = result.filter((mountain) => matchesPrefecture(mountain.prefecture, selectedPrefecture));
    }

    // 3. Difficulty Filter
    if (selectedDifficulty !== 'すべて') {
      result = result.filter(m => m.difficulty === selectedDifficulty);
    }

    // 4. Elevation Range Filter
    if (selectedElevationRange !== 'すべて') {
      if (selectedElevationRange === 'under-500') {
        result = result.filter(m => m.elevation < 500);
      } else if (selectedElevationRange === '500-1000') {
        result = result.filter(m => m.elevation >= 500 && m.elevation <= 1000);
      } else if (selectedElevationRange === 'over-1000') {
        result = result.filter(m => m.elevation > 1000);
      }
    }

    // 5. Sort application
    result.sort((a, b) => {
      if (sortBy === 'elevation-desc') {
        return b.elevation - a.elevation;
      }
      if (sortBy === 'elevation-asc') {
        return a.elevation - b.elevation;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'ja');
      }
      // default: ID sequence
      return 0;
    });

    return result;
  }, [mountains, searchQuery, selectedPrefecture, selectedDifficulty, selectedElevationRange, sortBy]);

  // Compute 3 recommended mountains based on user's homePrefecture and preferredCondition
  const recommendedMountains = useMemo(() => {
    const pref = toOfficialPrefecture(userProfile?.homePrefecture || '京都府');
    const cond = userProfile?.preferredCondition || '景色重視';

    const scored = mountains.map(m => {
      let score = 0;

      // 1. Prefecture match
      score += getPrefectureRecommendationScore(m.prefecture, pref);

      // 2. Condition match
      const desc = m.description || '';
      const name = m.name || '';
      if (cond === '景色重視') {
        const scenicWords = ['眺望', '絶景', '一望', 'パノラマ', '見渡せ', '海が見', '景色', '大展望', '360度'];
        const hasScenicWord = scenicWords.some(w => desc.includes(w) || name.includes(w));
        const knownScenic = ['daimonji', 'otowa', 'shogunzuka', 'yuragatake', 'kuroi_castle', 'oiwayama'];
        if (hasScenicWord || knownScenic.includes(m.id)) {
          score += 50;
        }
      } else if (cond === '体力づくり') {
        const fitnessWords = ['健脚', '急登', '登りごたえ', '体力', '急坂', 'ロング', '急な登り'];
        const hasFitnessWord = fitnessWords.some(w => desc.includes(w));
        if (hasFitnessWord || m.difficulty === 'intermediate' || m.difficulty === 'advanced' || m.elevation >= 500) {
          score += 50;
        }
      } else if (cond === '初心者向け') {
        const beginnerWords = ['初心者', 'ファミリー', '登りやすい', 'なだらか', '手軽', '整備', '子供', '安心', '散歩'];
        const hasBeginnerWord = beginnerWords.some(w => desc.includes(w));
        if (hasBeginnerWord || (m.difficulty === 'beginner' && m.elevation < 400)) {
          score += 50;
        }
      } else if (cond === '歴史・寺社巡り') {
        const historyWords = ['寺', '社', '歴史', '伝説', '信仰', '城跡', '天台宗', '光秀', '秀吉', '本陣', '神聖', '修行', '跡', '神社', '戦国', 'ロマン'];
        const hasHistoryWord = historyWords.some(w => desc.includes(w) || name.includes(w));
        if (hasHistoryWord) {
          score += 50;
        }
      } else if (cond === '大自然・秘境') {
        const wildWords = ['静か', '原生', '自然林', '秘境', '手つかず', '巨木', '森林浴', '深呼吸', '沢沿い', '雑木林', '山深く', '静寂'];
        const hasWildWord = wildWords.some(w => desc.includes(w));
        if (hasWildWord) {
          score += 50;
        }
      }

      // 3. Prioritize unclimbed mountains
      if (!isClimbed(m.id)) {
        score += 30;
      }

      return { mountain: m, score };
    });

    // Sort by score descending, then by mountain ID sequence
    scored.sort((a, b) => b.score - a.score || a.mountain.id.localeCompare(b.mountain.id));

    // Return the top 3 recommendations
    return scored.slice(0, 3).map(s => s.mountain);
  }, [mountains, userProfile?.homePrefecture, userProfile?.preferredCondition, isClimbed]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-24 px-4">
      {/* Page Header */}
      <div>
        <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block font-mono">
          STAGE SEARCH
        </span>
        <h1 className="text-xl font-extrabold text-gray-900">
          冒険の山を探す
        </h1>
      </div>

      {/* Personalized Recommendations Section */}
      <div className="bg-gradient-to-br from-emerald-50/75 to-amber-50/40 rounded-2xl border border-emerald-100/80 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">✨</span>
            <h2 className="text-xs font-black text-emerald-950 uppercase tracking-widest flex items-center gap-1">
              <span>あなたへのおすすめの山</span>
              <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-sans font-black scale-90">
                RECOMMEND
              </span>
            </h2>
          </div>
          {/* Settings Indicator */}
          <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-lg border border-gray-150">
            <span>📍{userProfile?.homePrefecture ? `${userProfile.homePrefecture}府/県` : '京都府'} ・ {userProfile?.preferredCondition || '景色重視'}</span>
          </div>
        </div>

        <p className="text-[11px] text-gray-650 leading-relaxed text-left">
          お住まいの地域「<strong className="text-emerald-950">{userProfile?.homePrefecture ? `${userProfile.homePrefecture}府/県` : '京都府（デフォルト）'}</strong>」と、求める条件「<strong className="text-emerald-950">{userProfile?.preferredCondition || '景色重視'}</strong>」にマッチする山を、ヤマコが厳選したのだ！🗺️✨
        </p>

        {/* Grid of recommended mountains */}
        <div className="grid grid-cols-3 gap-2.5">
          {recommendedMountains.map((m) => {
            const climbed = isClimbed(m.id);
            return (
              <div
                key={`rec-${m.id}`}
                onClick={() => onSelectMountain(m.id)}
                className="bg-white rounded-xl overflow-hidden border border-emerald-900/10 hover:border-emerald-600 transition-all cursor-pointer group flex flex-col shadow-2xs relative"
              >
                {/* Stamp overlay if climbed */}
                {climbed && (
                  <div className="absolute top-1 left-1 z-10 flex items-center justify-center w-5 h-5 rounded-full border border-emerald-600 bg-emerald-50 text-emerald-700 shadow-3xs text-[10px] rotate-[-5deg]">
                    <span>{m.stampDesign.icon}</span>
                  </div>
                )}
                <div className="h-16 bg-emerald-950 overflow-hidden relative shrink-0">
                  <img
                    src={m.imageUrl}
                    alt={m.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <span className="absolute bottom-1 right-1 text-[8px] font-mono text-white/90 bg-black/40 px-1 py-0.2 rounded font-bold">
                    {m.elevation}m
                  </span>
                </div>
                <div className="p-1.5 flex-1 flex flex-col justify-between text-left">
                  <h4 className="text-[10px] font-black text-gray-850 line-clamp-1 group-hover:text-emerald-800 transition-colors">
                    {m.name}
                  </h4>
                  <div className="flex items-center justify-between text-[8px] text-gray-400 mt-1 font-bold pt-1 border-t border-gray-100">
                    <span className="truncate max-w-[40px]">{m.prefecture}</span>
                    <span className="text-amber-500 font-mono">
                      {m.difficulty === 'beginner' ? '★1' : m.difficulty === 'intermediate' ? '★2' : '★3'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!userProfile?.email && (
          <div className="text-[9.5px] text-gray-400 text-center leading-normal">
            💡 マイページからギルド会員に無料登録するか、プロフィール編集からお住まいやこだわり条件をいつでも変更できるようになるのだ！
          </div>
        )}
      </div>

      {/* Search Input and Filter Toggle Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="山名、地域、紹介ワードで検索..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3.5 py-2 border rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
            showFilters || selectedPrefecture !== 'すべて' || selectedDifficulty !== 'すべて' || selectedElevationRange !== 'すべて'
              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/20'
              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">絞り込み</span>
        </button>
      </div>

      {/* Filter and Sorting Selection Drawer/Panel */}
      {showFilters && (
        <div className="p-4 bg-white rounded-xl border border-amber-900/5 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in text-left">
          {/* Prefecture Selection */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              エリア地域
            </span>
            <select
              value={selectedPrefecture}
              onChange={(e) => setSelectedPrefecture(e.target.value)}
              className="w-full text-xs font-medium px-2 py-1.5 border border-gray-350 rounded-lg bg-white"
            >
              {prefectures.map(pref => (
              <option key={pref} value={pref}>{pref === 'すべて' ? 'すべての都道府県' : pref}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Level Selection */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              難易度レベル
            </span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full text-xs font-medium px-2 py-1.5 border border-gray-350 rounded-lg bg-white"
            >
              {difficulties.map(diff => (
                <option key={diff.value} value={diff.value}>{diff.label}</option>
              ))}
            </select>
          </div>

          {/* Elevation Filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              山の標高
            </span>
            <select
              value={selectedElevationRange}
              onChange={(e) => setSelectedElevationRange(e.target.value)}
              className="w-full text-xs font-medium px-2 py-1.5 border border-gray-350 rounded-lg bg-white"
            >
              {elevationRanges.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>

          {/* Sort selection */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              <span>並び替え</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full text-xs font-medium px-2 py-1.5 border border-gray-350 rounded-lg bg-white"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Results Count Summary */}
      <div className="flex items-center justify-between text-xs text-gray-500 font-bold px-1">
        <span>見つかった山: {processedMountains.length} 座</span>
        {(selectedPrefecture !== 'すべて' || selectedDifficulty !== 'すべて' || selectedElevationRange !== 'すべて' || searchQuery.trim().length > 0) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedPrefecture('すべて');
              setSelectedDifficulty('すべて');
              setSelectedElevationRange('すべて');
              setSortBy('id');
            }}
            className="text-[10px] text-emerald-700 hover:underline cursor-pointer"
          >
            フィルターをリセット
          </button>
        )}
      </div>

      {/* Mountains Grid */}
      {processedMountains.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-amber-900/5 text-gray-400 space-y-2">
          <p className="text-sm font-bold">条件に合う山が見つかりませんでした。</p>
          <p className="text-xs">検索キーワードやフィルターを変更してください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {processedMountains.map((mountain) => {
            const climbed = isClimbed(mountain.id);

            return (
              <div
                key={mountain.id}
                onClick={() => onSelectMountain(mountain.id)}
                className="bg-white rounded-2xl overflow-hidden border border-amber-900/5 shadow-xs hover:shadow-md cursor-pointer group flex flex-col justify-between transition-shadow relative"
              >
                {/* Stamp overlay if climbed */}
                {climbed && (
                  <div className="absolute top-3 left-3 z-15 flex items-center justify-center w-8 h-8 rounded-full border border-double border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs rotate-[-8deg]">
                    <span className="text-sm">{mountain.stampDesign.icon}</span>
                  </div>
                )}

                {/* Banner image */}
                <div className="h-32 bg-emerald-950 overflow-hidden relative shrink-0">
                  <img
                    src={mountain.imageUrl}
                    alt={mountain.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                  {/* Elevation & difficulty label */}
                  <div className="absolute bottom-2 left-3 right-3 flex items-baseline justify-between text-white">
                    <h3 className="font-black text-lg line-clamp-1">{mountain.name}</h3>
                    <span className="text-xs font-mono font-bold">{mountain.elevation}m</span>
                  </div>
                </div>

                {/* Details body */}
                <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between text-left">
                  <p className="text-[11px] text-gray-500 line-clamp-2">
                    {mountain.description}
                  </p>

                  <div className="flex items-center justify-between pt-1.5 border-t border-amber-900/5 text-[10px] text-gray-400">
                    <span className="flex items-center gap-0.5 font-bold">
                      <MapPin className="w-3 h-3 text-red-500" />
                      <span className="truncate max-w-[100px]">{mountain.prefecture}</span>
                    </span>
                    <span className="font-bold flex gap-0.5 text-amber-500">
                      {mountain.difficulty === 'beginner' ? '★☆☆' : mountain.difficulty === 'intermediate' ? '★★☆' : '★★★'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
