import { describe, expect, it } from "vitest";
import {
  applyCommitType,
  COMMIT_TYPES,
  detectCommitType,
} from "./commit-prefix";

describe("applyCommitType", () => {
  it("prefixes an empty message", () => {
    expect(applyCommitType("", "feat")).toBe("feat: ");
  });

  it("prefixes a plain message", () => {
    expect(applyCommitType("add login page", "feat")).toBe(
      "feat: add login page",
    );
  });

  it("replaces an existing type and keeps the message", () => {
    expect(applyCommitType("feat: add login page", "fix")).toBe(
      "fix: add login page",
    );
  });

  it("preserves scope and breaking-change bang", () => {
    expect(applyCommitType("feat(ui)!: drop old API", "refactor")).toBe(
      "refactor(ui)!: drop old API",
    );
  });

  it("removes the prefix when type is empty", () => {
    expect(applyCommitType("feat(ui): add login", "")).toBe("add login");
    expect(applyCommitType("", "")).toBe("");
  });

  it("does not duplicate a prefix when re-selecting the same type", () => {
    expect(applyCommitType("feat: add login", "feat")).toBe("feat: add login");
  });

  it("keeps unfamiliar prefixes and prepends the selected type", () => {
    expect(applyCommitType("JIRA-123: fix crash", "fix")).toBe(
      "fix: JIRA-123: fix crash",
    );
    expect(applyCommitType("JIRA-123: fix crash", "")).toBe(
      "JIRA-123: fix crash",
    );
  });

  it("handles a message that is only a prefix", () => {
    expect(applyCommitType("feat: ", "fix")).toBe("fix: ");
  });
});

describe("detectCommitType", () => {
  it("detects known types", () => {
    expect(detectCommitType("feat: x")).toBe("feat");
    expect(detectCommitType("FIX(ui): x")).toBe("fix");
  });

  it("ignores unknown or missing prefixes", () => {
    expect(detectCommitType("feature: x")).toBe("");
    expect(detectCommitType("plain message")).toBe("");
    expect(detectCommitType("")).toBe("");
  });

  it("has unique option values", () => {
    const values = COMMIT_TYPES.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
  });
});
