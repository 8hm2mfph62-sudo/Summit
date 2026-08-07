/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface RankInfo {
  name: string;
  emoji: string;
  color: string;       // Tailwind text color
  bgColor: string;     // Tailwind bg color
  borderColor: string; // Tailwind border color
  badgeColor: string;  // Gradation badge gradient classes
}

export function getRankInfo(level: number): RankInfo {
  if (level >= 10) {
    return {
      name: 'ダイヤモンド級',
      emoji: '💎',
      color: 'text-indigo-600 font-extrabold',
      bgColor: 'bg-indigo-50/80',
      borderColor: 'border-indigo-200 shadow-xs',
      badgeColor: 'from-blue-500 via-indigo-500 to-purple-600',
    };
  }
  if (level >= 7) {
    return {
      name: 'プラチナ級',
      emoji: '✨',
      color: 'text-cyan-600 font-bold',
      bgColor: 'bg-cyan-50/80',
      borderColor: 'border-cyan-200',
      badgeColor: 'from-cyan-500 to-blue-500',
    };
  }
  if (level >= 5) {
    return {
      name: 'ゴールド級',
      emoji: '🥇',
      color: 'text-yellow-600 font-bold',
      bgColor: 'bg-yellow-50/80',
      borderColor: 'border-yellow-200',
      badgeColor: 'from-yellow-400 to-yellow-600',
    };
  }
  if (level >= 3) {
    return {
      name: 'シルバー級',
      emoji: '🥈',
      color: 'text-slate-500 font-bold',
      bgColor: 'bg-slate-50/80',
      borderColor: 'border-slate-200',
      badgeColor: 'from-slate-400 to-slate-500',
    };
  }
  return {
    name: 'ブロンズ級',
    emoji: '🥉',
    color: 'text-amber-800 font-semibold',
    bgColor: 'bg-amber-50/80',
    borderColor: 'border-amber-200',
    badgeColor: 'from-amber-600 to-amber-800',
  };
}

export interface StampDesign {
  text: string;
  icon: string;      // E.g., '🔥', '🌸', '❄️', '☀️'
  color: string;     // E.g., 'text-red-600'
  bgColor: string;   // E.g., 'bg-orange-50'
  borderColor: string; // E.g., 'border-orange-200'
}

export interface Mountain {
  id: string;
  name: string;
  elevation: number;
  location: string;
  prefecture: string; // 京都, 滋賀, 奈良, etc.
  difficulty: Difficulty;
  description: string;
  recommendedSeason: string;
  estimatedTime: string;
  imageUrl: string;
  stampDesign: StampDesign;
}

export interface ClimbRecord {
  id: string;
  mountainId: string;
  climbDate: string;
  memo: string;
  weather?: string;
  companions?: string;
  photos: string[]; // List of base64 images or local assets
  stampId: string; // ID of the unlocked stamp
  createdAt: string;
  xpEarned: number;
  companionSkillUsed?: string;
  companionSkillName?: string;
  companionBonusXp?: number;
  hasRainbowGlow?: boolean;
  luckyFortune?: string;
  triviaText?: string;
  companionBonusMessage?: string;
}

export interface CompanionEvolution {
  stage: number; // 1 to 5
  title: string;
  emoji: string;
  desc: string;
  specialSkill: string;
  bonusText: string;
}

export function getCompanionEvolutionList(animalId: string): CompanionEvolution[] {
  const norm = animalId || 'squirrel';
  switch (norm) {
    case 'squirrel':
      return [
        {
          stage: 1,
          title: '新米スカウト・リス',
          emoji: '🐿️',
          desc: 'まだまだ未熟な子供のリスガイド。どんぐりが何よりの大好物！',
          specialSkill: 'どんぐり探知センサー',
          bonusText: '山林の道が分かりやすくなるのだ！',
        },
        {
          stage: 2,
          title: '見習いバックパッカー',
          emoji: '🐿️🎒',
          desc: '小さなザックを背負して一端の登山者を気取る。荷物整理が得意！',
          specialSkill: '超軽量パッキング術',
          bonusText: '登頂時の疲労を10%軽減するのだ！',
        },
        {
          stage: 3,
          title: '森の道案内エリート',
          emoji: '🐿️🧭',
          desc: '森の地理を完全に把握したガイド。方位磁針を使いこなす！',
          specialSkill: 'ネイチャー・ナビゲート',
          bonusText: '獲得登頂XPが+10%増量されるのだ！',
        },
        {
          stage: 4,
          title: '山岳警備隊・チーフ',
          emoji: '🐿️🛡️',
          desc: 'レンジャーの装備を纏い、山岳の安全を命がけで守る誇り高きリス。',
          specialSkill: 'セーフティ・フィールド',
          bonusText: '雨天の登山でも滑らなくなるのだ！',
        },
        {
          stage: 5,
          title: '伝説のゴールド・キング',
          emoji: '🐿️👑',
          desc: '山々の精霊に選ばれし王。その黄金の王冠から溢れる輝きは幸運を呼ぶ。',
          specialSkill: '精霊王 of 福音',
          bonusText: 'すべての山のスタンプから特別な輝きが溢れるのだ！',
        },
        {
          stage: 6,
          title: '【プレミアム】超黄金王ゴルディ・ヤマコ',
          emoji: '🐿️✨👑',
          desc: '純金に光り輝くプレミアム・ガイド。触れる者すべてに極上の豊穣と登山の祝福を授ける。',
          specialSkill: 'アルティメット・ゴールド・シャワー',
          bonusText: '【PRO限定】全山でレインボースタンプが確定し、XP獲得量が＋50%に超増量！',
        }
      ];
    case 'fox':
      return [
        {
          stage: 1,
          title: 'こぎつね新兵',
          emoji: '🦊',
          desc: '森の探検に興味津々な幼いキツネ。ちょっといたずら好き。',
          specialSkill: 'かくれんぼの達人',
          bonusText: '隠れた山道の発見が上手になるコン！',
        },
        {
          stage: 2,
          title: '旅するあかぎつね',
          emoji: '🦊🎒',
          desc: '各地の街道を巡って知識をたくわえた旅慣れキツネ。',
          specialSkill: '絶景マップ解析',
          bonusText: '未踏の山の場所がわかるようになるコン！',
        },
        {
          stage: 3,
          title: '幻術の絶景ガイド',
          emoji: '🦊🔮',
          desc: '木の葉の幻術を使って、霧深い日でも美しい景色を再現できる。',
          specialSkill: '五色のフォグ・ランプ',
          bonusText: '悪天候でも最高の写真が撮れるコン！',
        },
        {
          stage: 4,
          title: '山の神使・大キツネ',
          emoji: '🦊🏮',
          desc: '山の神様にお仕えし、荘厳なオーラを纏った白きキツネ。',
          specialSkill: '霊峰の道標',
          bonusText: '獲得登頂XPが+15%増量されるコン！',
        },
        {
          stage: 5,
          title: '九尾 of 稲荷大神',
          emoji: '🦊👑',
          desc: '九つの尾を広げ、森羅万象の山岳を守護する至高の狐神。',
          specialSkill: '天照の大神徳',
          bonusText: '登山の安全を100%約束し、大幸運をもたらすコン！',
        },
        {
          stage: 6,
          title: '【プレミアム】黄金九尾・天照瑞獣',
          emoji: '🦊✨👑',
          desc: '全身が白金と黄金で満たされた、最上位の奇跡の瑞獣。福徳と天変地異すら操る神。',
          specialSkill: '極光・八百万の神託',
          bonusText: '【PRO限定】全山でレインボースタンプが確定し、XP獲得量が＋50%に超増量！',
        }
      ];
    case 'bear':
      return [
        {
          stage: 1,
          title: 'のんびり子グマ',
          emoji: '🐻',
          desc: 'はちみつを夢中で食べる可愛い子グマ。力持ちの素質を秘める。',
          specialSkill: 'はちみつ探知機',
          bonusText: 'お腹が空きにくくなるクマ！',
        },
        {
          stage: 2,
          title: '森 of 薪集め隊員',
          emoji: '🐻🌲',
          desc: '大きな丸太を楽々と運んでキャンプファイヤーの準備をする。',
          specialSkill: 'ウッディ・クラフト',
          bonusText: '山での野営の快適さが2倍になるクマ！',
        },
        {
          stage: 3,
          title: 'マウンテン・シェフ',
          emoji: '🐻🏕️',
          desc: '山の食材を使いこなす豪快な料理人。美味しいスープを振る舞う。',
          specialSkill: 'ギルド・グルメ飯',
          bonusText: '獲得登頂XPが+10%増量されるクマ！',
        },
        {
          stage: 4,
          title: '鉄壁のガードベア',
          emoji: '🐻🛡️',
          desc: '強靭な盾を構え、どんな野生の脅威からも登山者を完全に守る。',
          specialSkill: 'アイアン・シェル',
          bonusText: '過酷なルートでもケガを一切防ぐクマ！',
        },
        {
          stage: 5,
          title: '山嶺の覇王・ベアキング',
          emoji: '🐻👑',
          desc: 'すべての山脈の主として君臨する誇り高き覇王。その背中はあまりに大きい。',
          specialSkill: 'ギガント・キャリー',
          bonusText: 'すべての登山ルートが平坦に感じられるクマ！',
        },
        {
          stage: 6,
          title: '【プレミアム】黄金守護大帝ベアオーディン',
          emoji: '🐻✨👑',
          desc: '全身を伝説のオリハルコン製ゴールデン・アーマーで包んだ守護帝。その力は大地を砕く。',
          specialSkill: '天界大帝のアバランチ・バスター',
          bonusText: '【PRO限定】全山でレインボースタンプが確定し、XP獲得量が＋50%に超増量！',
        }
      ];
    case 'rabbit':
      return [
        {
          stage: 1,
          title: 'かけだしウサギ',
          emoji: '🐰',
          desc: '野原をピョンピョン跳ね回る、元気いっぱいなウサギ。',
          specialSkill: 'ハイテンション・ホップ',
          bonusText: '疲れを忘れて歩けるピョン！',
        },
        {
          stage: 2,
          title: '山野草の採集スカウト',
          emoji: '🐰🌸',
          desc: '山の珍しいハーブや薬草を見つける名手。花冠を作るのが得意。',
          specialSkill: 'ボタニカル・アイ',
          bonusText: 'レアなお花スポットを見つけられるピョン！',
        },
        {
          stage: 3,
          title: '俊足トレイルランナー',
          emoji: '🐰🧭',
          desc: '山道を軽快に駆け抜ける韋駄天。彼の後ろを追えばコースタイムは半分に！',
          specialSkill: 'ソニック・トレイル',
          bonusText: '登山にかかる時間を20%短縮するピョン！',
        },
        {
          stage: 4,
          title: '霊峰のムーンウサギ',
          emoji: '🐰💫',
          desc: '神秘的な月の魔力を帯び、暗い夜道でも輝く光で進路を照らす。',
          specialSkill: 'ルナ・グレイス',
          bonusText: '獲得登頂XPが+15%増量されるピョン！',
        },
        {
          stage: 5,
          title: '天空のラビットエンペラー',
          emoji: '🐰👑',
          desc: '神々の住まう頂に君臨する天空の支配者。跳躍力は宇宙に届くという。',
          specialSkill: 'インフィニティ・ジャンプ',
          bonusText: 'どんな峻険な崖も一蹴りで飛び越えるピョン！',
        },
        {
          stage: 6,
          title: '【プレミアム】輝夜月宮のゴールドマジェスティ',
          emoji: '🐰✨👑',
          desc: '極美の月に輝く黄金の月宮殿を治める女帝。星屑のステップで時空を越えて導く。',
          specialSkill: 'コスミック・ギャラクシー・ステップ',
          bonusText: '【PRO限定】全山でレインボースタンプが確定し、XP獲得量が＋50%に超増量！',
        }
      ];
    case 'owl':
      return [
        {
          stage: 1,
          title: 'ひよっこフクロウ',
          emoji: '🦉',
          desc: '大きな目で世界を見つめる、おとなしいフクロウの赤ちゃん。',
          specialSkill: 'ナイトビジョン',
          bonusText: '薄暗い林道がはっきり見えるホゥ。',
        },
        {
          stage: 2,
          title: '歴史の語り手',
          emoji: '🦉👓',
          desc: '山の由来や歴史、伝説にとても詳しい知性派ガイド。',
          specialSkill: '山岳クロニクル',
          bonusText: '山名やトリビア情報が満載ホゥ！',
        },
        {
          stage: 3,
          title: '気象予報・大賢者',
          emoji: '🦉📖',
          desc: '雲の動きや風の匂いから、数時間後の天気を100%的中させる大賢者。',
          specialSkill: 'ウェザー・フォアキャスト',
          bonusText: '雨に濡れる心配がゼロになるホゥ！',
        },
        {
          stage: 4,
          title: '星読みのコズミックフクロウ',
          emoji: '🦉🔮',
          desc: '銀河の運航と山の地脈を同調させ、無限の叡智を授ける。',
          specialSkill: 'アストラル・ガイダンス',
          bonusText: '獲得登頂XPが+15%増量されるホゥ！',
        },
        {
          stage: 5,
          title: '神域の知恵守護神',
          emoji: '🦉👑',
          desc: '山々の超常の知識をすべて記憶した神の化身。全知全能のオーラを纏う。',
          specialSkill: 'コスミック・インサイト',
          bonusText: '未踏峰の登頂ルートを完璧に解き明かすホゥ！',
        },
        {
          stage: 6,
          title: '【プレミアム】全知黄金神オーディン・ホゥ',
          emoji: '🦉✨👑',
          desc: '全宇宙の時間を司る、最高位の黄金叡智神。その瞳は過去・現在・未来のすべてを透視する。',
          specialSkill: 'クロノス・ゴールド・アカシックレコード',
          bonusText: '【PRO限定】全山でレインボースタンプが確定し、XP獲得量が＋50%に超増量！',
        }
      ];
    case 'deer':
      return [
        {
          stage: 1,
          title: 'バンビ・シカ',
          emoji: '🦌',
          desc: 'まだ角が生えていない、足元がおぼつかないシカの子。',
          specialSkill: 'スウィート・歩行',
          bonusText: '誰もが応援したくなるしか！',
        },
        {
          stage: 2,
          title: '草原のスピードスター',
          emoji: '🦌🌿',
          desc: 'しなやかな脚で野山を優雅に駆け抜ける、俊足のシカ。',
          specialSkill: 'ギャロップ・ステップ',
          bonusText: '登山のペース配分が良くなるしか！',
        },
        {
          stage: 3,
          title: '岩壁の登山マスター',
          emoji: '🦌🏔️',
          desc: 'どんな険しい急勾配や鎖場も、蹄の力でスマートに登りきる。',
          specialSkill: 'クリフ・アタック',
          bonusText: '急勾配も階段のように登れるしか！',
        },
        {
          stage: 4,
          title: '七彩の角の霊獣',
          emoji: '🦌💎',
          desc: '七色に輝く水晶の角を持ち、歩いた場所には美しい花が咲くという。',
          specialSkill: 'プリズム・バリア',
          bonusText: '獲得登頂XPが+15%増量されるしか！',
        },
        {
          stage: 5,
          title: '北斗の森の大霊神',
          emoji: '🦌👑',
          desc: '星々の輝きを宿した角を持ち、山々の命を司るいにしえの守護神. 誰もが平伏す。',
          specialSkill: 'アストラル・ブレス',
          bonusText: '一歩進むごとに世界が光り輝くしか！',
        },
        {
          stage: 6,
          title: '【プレミアム】黄金神鹿・プリズムエルド',
          emoji: '🦌✨👑',
          desc: '五色の光背と黄金の角を持つ、悠久の神鹿。その足跡からは万物を再生する花の園が広がる。',
          specialSkill: 'アストラル・レインボー・ガーデン',
          bonusText: '【PRO限定】全山でレインボースタンプが確定し、XP獲得量が＋50%に超増量！',
        }
      ];
    case 'cat':
      return [
        {
          stage: 1,
          title: '気まぐれ子猫',
          emoji: '🐱',
          desc: '何をするにもマイペース。気分屋だが登山のモチベーションは高い。',
          specialSkill: 'ニャンキャッチ',
          bonusText: 'のんびりペースで歩けるにゃ！',
        },
        {
          stage: 2,
          title: 'きままな旅猫',
          emoji: '🐱🎒',
          desc: '小さな風呂敷を首に巻き、気ままに旅をして回る猫。',
          specialSkill: '抜け道の直感',
          bonusText: '隠れた絶景ポイントを教えてくれるにゃ！',
        },
        {
          stage: 3,
          title: '忍びのキャットガイド',
          emoji: '🐱🐾',
          desc: '足音を一切立てずに険路をすり抜ける。驚異のバランス感覚。',
          specialSkill: '忍び足の極意',
          bonusText: 'どんな危険な崖でも平気になるにゃ！',
        },
        {
          stage: 4,
          title: '招福のマウンテン招き猫',
          emoji: '🐱✨',
          desc: '右手を挙げ、登山客に極上の幸運と快適な天気をもたらす。',
          specialSkill: '招福千両ラッキー',
          bonusText: '獲得登頂XPが+15%増量されるにゃ！',
        },
        {
          stage: 5,
          title: '天空のネコ大将軍',
          emoji: '🐱👑',
          desc: '小判で作られた鎧を纏い、最高峰から天下を見渡す誇り高きボス猫。',
          specialSkill: '天下無双ゴロゴロ',
          bonusText: 'すべての山々が我が庭のようになるにゃ！',
        },
        {
          stage: 6,
          title: '【プレミアム】招福黄金猫・大黒天マネキ',
          emoji: '🐱✨💰',
          desc: '全身が小判を敷き詰めた純金でできた幸福猫。手招き一つで無尽蔵の財宝と経験を引き寄せる。',
          specialSkill: '大黒天・百万両ウルトラドリーム',
          bonusText: '【PRO限定】全山でレインボースタンプが確定し、XP獲得量が＋50%に超増量！',
        }
      ];
    case 'dog':
      return [
        {
          stage: 1,
          title: 'わんぱくワンちゃん',
          emoji: '🐶',
          desc: 'シッポをちぎれんばかりに振る元気な子犬。いつでも主人の味方！',
          specialSkill: 'エナジー・バーク',
          bonusText: '元気ハツラツで山を登れるワン！',
        },
        {
          stage: 2,
          title: 'レスキュー見習い',
          emoji: '🐶🧣',
          desc: '赤いマフラーを巻き、遭難者を救助する訓練を始めた優秀な犬。',
          specialSkill: '嗅覚コンパス',
          bonusText: '絶対に道に迷わなくなるワン！',
        },
        {
          stage: 3,
          title: 'マウンテン・パトロール犬',
          emoji: '🐶🍖',
          desc: '山道の安全を日々確認して回る、頼もしいパトロール隊長。',
          specialSkill: 'ギルド・セキュリティ',
          bonusText: '過酷なルートでも絶対に安心ワン！',
        },
        {
          stage: 4,
          title: '極地探検のキャプテンドッグ',
          emoji: '🐶🛡️',
          desc: '極寒の雪山や峻険な荒野をも踏破した、歴戦の冒険犬。',
          specialSkill: 'ブリザード・ブレイブ',
          bonusText: '獲得登頂XPが+15%増量されるワン！',
        },
        {
          stage: 5,
          title: '聖地を統べる王者の牙',
          emoji: '🐶👑',
          desc: 'すべての山の頂を極め、冒険者と共に歩む至高の忠義の王獣。',
          specialSkill: 'アルティメット・ロイヤルティ',
          bonusText: '主人のポテンシャルを無限に引き出すワン！',
        },
        {
          stage: 6,
          title: '【プレミアム】神域黄金獣・ハチ公ゴールド',
          emoji: '🐶✨👑',
          desc: '不滅の忠誠と勇気を金色の鎧に宿した、究極 of 守護神犬。主人の手を離さない。',
          specialSkill: 'ブレイブ・ゴールド・レゾナンス',
          bonusText: '【PRO限定】全山でレインボースタンプが確定し、XP獲得量が＋50%に超増量！',
        }
      ];
    default:
      return [];
  }
}

export function getCompanionEvolutionForLevel(animalId: string, level: number): CompanionEvolution {
  const list = getCompanionEvolutionList(animalId);
  if (level >= 10) return list[4];
  if (level >= 7) return list[3];
  if (level >= 5) return list[2];
  if (level >= 3) return list[1];
  return list[0];
}

export function getCompanionXpMultiplier(animalId: string, stage: number): number {
  // Multiply overall climbing XP based on the Companion's Evolution Stage
  if (stage === 6) return 1.50; // +50% PRO premium multiplier!
  if (stage === 5) return 1.25; // +25%
  if (stage === 4) return 1.15; // +15%
  if (stage === 3) return 1.10; // +10%
  return 1.0;
}

export interface UserProfile {
  nickname: string;
  avatarUrl: string;
  bio: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  unlockedBadges: string[]; // List of badge IDs
  email?: string; // Add optional email to profile
  companionName?: string;
  companionAnimal?: string;
  companionSkinStage?: number; // Chosen skin stage (1-5), defaults to highest unlocked if undefined
  isBanned?: boolean;
  homePrefecture?: string; // e.g. 京都, 滋賀, 奈良, etc.
  preferredCondition?: string; // e.g. 景色重視, 体力づくり, 初心者向け, 歴史・寺社巡り, 大自然・秘境
  isPremium?: boolean; // Premium subscriber flag
}

export interface UserAccount {
  email: string;
  password?: string;
  nickname: string;
  avatarUrl: string;
  bio: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  unlockedBadges: string[];
  records: ClimbRecord[];
  challenges: DailyChallenge[];
  companionName?: string;
  companionAnimal?: string;
  companionSkinStage?: number;
  isBanned?: boolean;
  homePrefecture?: string;
  preferredCondition?: string;
  isPremium?: boolean; // Premium subscriber flag
}

export interface Album {
  id: string;
  title: string;
  description: string;
  coverColor: string; // Tailind class for book cover (e.g. 'bg-emerald-800')
  accentColor: string; // E.g., 'text-emerald-300'
  mountainIds: string[];
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  isCompleted: boolean;
}
