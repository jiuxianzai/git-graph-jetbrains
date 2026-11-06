/**
 * Height math for the commit message area at the bottom of the commit view.
 *
 * The area defaults to one third of the view and can be dragged; the chosen
 * height is remembered in localStorage. The subtle part is that a webview which
 * is hidden (view switched away, or re-created while hidden) reports a viewport
 * of 0 — clamping a remembered height against that viewport is what used to
 * collapse the area to its minimum and "forget" the drag.
 */

export const MIN_AREA_HEIGHT = 150;
export const AREA_HEIGHT_STORAGE_KEY = "jetgit.commitMessageAreaHeight";
/** The area never eats more than this share of the view. */
export const MAX_AREA_RATIO = 0.72;
/** Above this the view is definitely measurable (a hidden webview reports 0). */
export const MIN_MEASURABLE_VIEWPORT = 1;

export function isMeasurableViewport(viewport: number): boolean {
  return Number.isFinite(viewport) && viewport >= MIN_MEASURABLE_VIEWPORT;
}

/**
 * Upper bound for the area height. Unmeasurable viewport → no upper bound, so
 * we never clamp a good height down to the minimum just because we cannot see
 * the view.
 */
export function maxAreaHeight(viewport: number): number {
  if (!isMeasurableViewport(viewport)) return Number.POSITIVE_INFINITY;
  return Math.max(MIN_AREA_HEIGHT, Math.round(viewport * MAX_AREA_RATIO));
}

export function clampAreaHeight(height: number, viewport: number): number {
  const bounded = Number.isFinite(height) ? height : MIN_AREA_HEIGHT;
  return Math.min(
    maxAreaHeight(viewport),
    Math.max(MIN_AREA_HEIGHT, Math.round(bounded)),
  );
}

/** Default height: one third of the view, as the drag handle advertises. */
export function defaultAreaHeight(viewport: number): number {
  if (!isMeasurableViewport(viewport)) return MIN_AREA_HEIGHT;
  return clampAreaHeight(viewport / 3, viewport);
}

/**
 * Height to apply on mount. A remembered height is only clamped against a
 * viewport we can actually measure; when the view is hidden we keep the raw
 * value and let the resize handler clamp it once the view reports a size.
 */
export function initialAreaHeight(
  saved: number | null,
  viewport: number,
): number {
  if (saved === null || !Number.isFinite(saved) || saved <= 0) {
    return defaultAreaHeight(viewport);
  }
  return isMeasurableViewport(viewport)
    ? clampAreaHeight(saved, viewport)
    : Math.max(MIN_AREA_HEIGHT, Math.round(saved));
}
