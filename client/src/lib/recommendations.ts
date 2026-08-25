import { matchesPrefecture } from './prefectures';

export function getPrefectureRecommendationScore(mountainPrefecture: string, activityPrefecture: string) {
  return matchesPrefecture(mountainPrefecture, activityPrefecture) ? 100 : 0;
}
