export const PREFECTURE_ORDER = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
] as const;

export function toOfficialPrefecture(value: string) {
  const trimmed = value.trim();
  if (trimmed === '北海道') return trimmed;
  if (trimmed === '東京' || trimmed === '東京都') return '東京都';
  if (trimmed === '京都' || trimmed === '京都府') return '京都府';
  if (trimmed === '大阪' || trimmed === '大阪府') return '大阪府';
  return trimmed.endsWith('県') ? trimmed : `${trimmed}県`;
}

export function matchesPrefecture(value: string, target: string) {
  return value.split('・').some((part) => toOfficialPrefecture(part) === target);
}
