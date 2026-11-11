import { describe, expect, it } from "vitest";
import {
  branchForSide,
  commitsRangeForSide,
  compareBaseRef,
  countForSide,
  otherBranchForSide,
} from "./compare";

describe("commitsRangeForSide", () => {
  it("shows commits the target branch added", () => {
    expect(commitsRangeForSide("main", "feature/login", "target")).toBe(
      "main..feature/login",
    );
  });

  it("shows commits the base branch added", () => {
    expect(commitsRangeForSide("main", "feature/login", "base")).toBe(
      "feature/login..main",
    );
  });
});

describe("branchForSide / otherBranchForSide", () => {
  const refs = { baseBranch: "main", targetBranch: "feature/login" };

  it("resolves both sides", () => {
    expect(branchForSide(refs, "target")).toBe("feature/login");
    expect(branchForSide(refs, "base")).toBe("main");
    expect(otherBranchForSide(refs, "target")).toBe("main");
    expect(otherBranchForSide(refs, "base")).toBe("feature/login");
  });
});

describe("compareBaseRef", () => {
  const refs = {
    baseBranch: "main",
    targetBranch: "feature/login",
    mergeBase: "abc123",
  };

  it("prefers the merge base for three-dot semantics", () => {
    expect(compareBaseRef(refs, "target")).toBe("abc123");
    expect(compareBaseRef(refs, "base")).toBe("abc123");
  });

  it("falls back to the other branch for unrelated histories", () => {
    expect(compareBaseRef({ ...refs, mergeBase: null }, "target")).toBe("main");
    expect(compareBaseRef({ ...refs, mergeBase: null }, "base")).toBe(
      "feature/login",
    );
  });
});

describe("countForSide", () => {
  it("maps ahead/behind to the visible side", () => {
    expect(countForSide({ ahead: 3, behind: 1 }, "target")).toBe(3);
    expect(countForSide({ ahead: 3, behind: 1 }, "base")).toBe(1);
  });
});
