/**
 * Helpers for the branch comparison mode.
 *
 * The comparison always runs against the merge base (three-dot semantics):
 * - commits: `<other>..<side>` (only what `side` added since the merge base)
 * - files:   `git diff mergeBase <side>`
 *
 * `side` is the branch being inspected: `target` is the branch picked in the
 * branch tree, `base` is the branch that was checked out when comparison began.
 */

export type CompareFilesSide = "target" | "base";

export interface CompareBranches {
  baseBranch: string;
  targetBranch: string;
  mergeBase?: string | null;
}

/** Commits only reachable from `side`, expressed as a `git log` range. */
export function commitsRangeForSide(
  baseBranch: string,
  targetBranch: string,
  side: CompareFilesSide,
): string {
  return side === "target"
    ? `${baseBranch}..${targetBranch}`
    : `${targetBranch}..${baseBranch}`;
}

/** Branch whose commits/file changes are shown for `side`. */
export function branchForSide(
  refs: CompareBranches,
  side: CompareFilesSide,
): string {
  return side === "target" ? refs.targetBranch : refs.baseBranch;
}

/** Branch used as the left-hand side when `side` changes are inspected. */
export function otherBranchForSide(
  refs: CompareBranches,
  side: CompareFilesSide,
): string {
  return side === "target" ? refs.baseBranch : refs.targetBranch;
}

/**
 * Left-hand revision for the file diff. Prefer the merge base so files that
 * only changed on the other branch never show up as reverse changes.
 * Falls back to the other branch tip for unrelated histories.
 */
export function compareBaseRef(
  refs: CompareBranches,
  side: CompareFilesSide,
): string {
  return refs.mergeBase || otherBranchForSide(refs, side);
}

/** Number of commits the comparison reported for `side`. */
export function countForSide(
  refs: { ahead: number; behind: number },
  side: CompareFilesSide,
): number {
  return side === "target" ? refs.ahead : refs.behind;
}
