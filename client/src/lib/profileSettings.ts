import { toOfficialPrefecture } from './prefectures';

export function prepareProfileUpdate<T extends { homePrefecture: string }>(input: T): T {
  return {
    ...input,
    homePrefecture: toOfficialPrefecture(input.homePrefecture),
  };
}
