import { describe, expect, it } from "vitest";
import {
  clampAreaHeight,
  defaultAreaHeight,
  initialAreaHeight,
  MAX_AREA_RATIO,
  MIN_AREA_HEIGHT,
} from "./message-area-height";

const VIEWPORT = 900;

describe("defaultAreaHeight", () => {
  it("defaults to one third of the view", () => {
    expect(defaultAreaHeight(VIEWPORT)).toBe(300);
  });

  it("never goes below the minimum on a short view", () => {
    expect(defaultAreaHeight(300)).toBe(MIN_AREA_HEIGHT);
  });

  it("falls back to the minimum when the view is not measurable", () => {
    expect(defaultAreaHeight(0)).toBe(MIN_AREA_HEIGHT);
  });
});

describe("clampAreaHeight", () => {
  it("keeps a height that fits", () => {
    expect(clampAreaHeight(300, VIEWPORT)).toBe(300);
  });

  it("honours the minimum", () => {
    expect(clampAreaHeight(20, VIEWPORT)).toBe(MIN_AREA_HEIGHT);
  });

  it("honours the maximum share of the view", () => {
    expect(clampAreaHeight(10_000, VIEWPORT)).toBe(
      Math.round(VIEWPORT * MAX_AREA_RATIO),
    );
  });

  it("does not clamp a good height against an unmeasurable viewport", () => {
    // Regression: a hidden webview reports innerHeight === 0 and used to drag
    // every remembered height down to the minimum.
    expect(clampAreaHeight(420, 0)).toBe(420);
  });

  it("survives a non-finite height", () => {
    expect(clampAreaHeight(Number.NaN, VIEWPORT)).toBe(MIN_AREA_HEIGHT);
  });
});

describe("initialAreaHeight", () => {
  it("restores a remembered height", () => {
    expect(initialAreaHeight(420, VIEWPORT)).toBe(420);
  });

  it("restores a remembered height while the view is hidden", () => {
    // Regression: this returned MIN_AREA_HEIGHT, so a drag was "forgotten"
    // after switching views.
    expect(initialAreaHeight(420, 0)).toBe(420);
  });

  it("clamps a remembered height that no longer fits", () => {
    expect(initialAreaHeight(900, 400)).toBe(Math.round(400 * MAX_AREA_RATIO));
  });

  it("uses the default when nothing is remembered", () => {
    expect(initialAreaHeight(null, VIEWPORT)).toBe(300);
  });

  it("ignores garbage from storage", () => {
    expect(initialAreaHeight(0, VIEWPORT)).toBe(300);
    expect(initialAreaHeight(-10, VIEWPORT)).toBe(300);
    expect(initialAreaHeight(Number.NaN, VIEWPORT)).toBe(300);
  });
});
