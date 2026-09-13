import { describe, expect, it } from "vitest";
import { buildParticipantRows } from "./db";

describe("climb record participants", () => {
  it("creates unique participant rows for a shared climb record", () => {
    expect(buildParticipantRows("record-1", [7, 7, 12])).toEqual([
      { recordId: "record-1", userId: 7 },
      { recordId: "record-1", userId: 12 },
    ]);
  });
});
