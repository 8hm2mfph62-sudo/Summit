import { describe, expect, it } from "vitest";
import { matchesPrefecture, PREFECTURE_ORDER, toOfficialPrefecture } from "@/lib/prefectures";
import { prepareProfileUpdate } from "@/lib/profileSettings";
import { getPrefectureRecommendationScore } from "@/lib/recommendations";

describe("都道府県単位の検索絞り込み", () => {
  it("都・道・府・県を公式表記へ正規化する", () => {
    expect(toOfficialPrefecture("東京")).toBe("東京都");
    expect(toOfficialPrefecture("京都")).toBe("京都府");
    expect(toOfficialPrefecture("大阪")).toBe("大阪府");
    expect(toOfficialPrefecture("北海道")).toBe("北海道");
    expect(toOfficialPrefecture("秋田県")).toBe("秋田県");
  });

  it("複数の府県にまたがる山を各都道府県で絞り込める", () => {
    expect(matchesPrefecture("京都・大阪", "京都府")).toBe(true);
    expect(matchesPrefecture("京都・大阪", "大阪府")).toBe(true);
    expect(matchesPrefecture("京都・大阪", "兵庫県")).toBe(false);
  });

  it("選択肢を公式の都道府県表記で保持する", () => {
    expect(PREFECTURE_ORDER).toEqual(expect.arrayContaining(["北海道", "東京都", "京都府", "大阪府"]));
    expect(PREFECTURE_ORDER).not.toContain("京都");
    expect(PREFECTURE_ORDER).not.toContain("大阪");
  });

  it("活動エリア保存時に公式の都道府県名をプロフィール更新ペイロードへ渡す", () => {
    expect(prepareProfileUpdate({ homePrefecture: "大阪", nickname: "登山者" })).toEqual({
      homePrefecture: "大阪府",
      nickname: "登山者",
    });
  });

  it("保存された活動エリアに一致する山だけがおすすめの都道府県加点を得る", () => {
    expect(getPrefectureRecommendationScore("大阪", "大阪府")).toBe(100);
    expect(getPrefectureRecommendationScore("京都・大阪", "大阪府")).toBe(100);
    expect(getPrefectureRecommendationScore("京都", "大阪府")).toBe(0);
  });
});
