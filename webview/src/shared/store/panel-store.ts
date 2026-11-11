import { create } from "zustand";
import {
  branchForSide,
  type CompareFilesSide,
  commitsRangeForSide,
  compareBaseRef,
} from "../../panel/utils/compare";
import { bridge } from "../bridge";
import type { SelectionMode } from "../hooks/useModifierClickSelection";
import type {
  BranchComparison,
  BranchInfo,
  Commit,
  DiffFile,
  LaneInfo,
  LaneSnapshot,
  TagInfo,
} from "../types/git";

interface PanelFilter {
  searchQuery: string;
  branch: string;
  author: string;
  dateRange: string;
  file: string;
}

export interface CompareState {
  baseBranch: string;
  targetBranch: string;
  mergeBase: string | null;
  /** Commits only reachable from the target branch. */
  ahead: number;
  /** Commits only reachable from the base branch. */
  behind: number;
  /** Commits only reachable from the base (current) branch. */
  baseCommits: Commit[];
  baseGraph: Record<string, LaneInfo>;
  /** Commits only reachable from the target branch. */
  targetCommits: Commit[];
  targetGraph: Record<string, LaneInfo>;
  loading: boolean;
  filesTarget: DiffFile[];
  filesBase: DiffFile[];
  /** Which side the details pane's file list shows. */
  filesSide: CompareFilesSide;
  filesLoading: boolean;
}

export type DetailTab = "commit" | "compare";

/** Per-side cap for comparison commit lists (matches git log page sizes). */
const COMPARE_COMMIT_LIMIT = 1000;

interface GraphPayload {
  graphData: { commits: Commit[]; lanes: Record<string, LaneInfo> };
  snapshot: LaneSnapshot;
}

interface PanelStore {
  commits: Commit[];
  /** Commits filtered by search/author (client-side). Graph layout uses full `commits`. */
  visibleCommits: Commit[];
  branches: BranchInfo[];
  tags: TagInfo[];
  currentBranch: string;
  graphLayout: Record<string, LaneInfo>;
  laneSnapshot: LaneSnapshot | null;

  selectedCommitHash: string | null;
  selectedCommitHashes: string[];
  lastSelectedCommitHash: string | null;
  hoveredColumn: number | null;
  commitFiles: DiffFile[];
  selectedFilePath: string | null;
  /** Column visibility for the commit list */
  visibleColumns: { author: boolean; date: boolean; hash: boolean };
  /** When multiple commits are selected, stores the oldest/newest for range diff */
  rangeOldest: string | null;
  rangeNewest: string | null;
  selectedBranches: string[];
  lastSelectedBranch: string | null;
  branchGroupByDirectory: boolean;

  filter: PanelFilter;
  /** Active branch comparison, null when browsing the normal log. */
  compare: CompareState | null;
  /** Filter that was active before entering comparison mode. */
  filterBeforeCompare: PanelFilter | null;
  /** Which tab the details pane shows while a comparison is active. */
  detailTab: DetailTab;
  /** Hashes to restore after clearing a filter */
  pendingSelectionFromFilter: string[];
  /** Collapsed sequence IDs */
  collapsedSequenceIds: Set<string>;
  /** sequenceId → intermediate hashes that are hidden */
  collapsedIntermediates: Map<string, string[]>;

  loading: boolean;
  hasMore: boolean;
  operationInProgress: boolean;
  /** Optional label describing the current operation (e.g. "Pushing branch…"). */
  operationLabel: string | null;

  fetchInitialData: () => Promise<void>;
  loadMore: () => Promise<void>;
  selectCommit: (
    hash: string,
    mode?: SelectionMode,
    allVisibleCommits?: string[],
  ) => Promise<void>;
  selectFile: (filePath: string) => void;
  openDiffEditor: (commitHash: string, file: DiffFile) => Promise<void>;
  setFilter: (filter: Partial<PanelFilter>) => void;
  selectBranch: (
    name: string,
    mode: "single" | "toggle" | "range",
    allVisibleBranches: string[],
  ) => void;
  setHoveredColumn: (column: number | null) => void;
  toggleColumnVisibility: (column: "author" | "date" | "hash") => void;
  toggleSequenceCollapse: (sequenceId: string, intermediates: string[]) => void;
  toggleBranchGroupByDirectory: () => void;
  enterCompare: (targetBranch: string) => Promise<void>;
  exitCompare: () => Promise<void>;
  setDetailTab: (tab: DetailTab) => void;
  setCompareFilesSide: (side: CompareFilesSide) => void;
  loadCompareCommits: () => Promise<void>;
  loadCompareFiles: () => Promise<void>;
  openCompareFile: (file: DiffFile) => Promise<void>;
  refreshCompare: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface SelectionSnapshot {
  selectedCommitHash: string | null;
  selectedCommitHashes: string[];
  lastSelectedCommitHash: string | null;
  rangeOldest: string | null;
  rangeNewest: string | null;
}

function filterCommits(
  commits: Commit[],
  filter: PanelFilter,
  collapsedIntermediates: Map<string, string[]>,
): Commit[] {
  const hiddenSet = new Set<string>();
  for (const hashes of collapsedIntermediates.values()) {
    for (const h of hashes) hiddenSet.add(h);
  }

  // Compute date cutoff for dateRange filter
  let dateCutoff: Date | null = null;
  if (filter.dateRange) {
    const now = new Date();
    if (filter.dateRange === "today") {
      dateCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filter.dateRange === "7days") {
      dateCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (filter.dateRange === "30days") {
      dateCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (filter.dateRange === "90days") {
      dateCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }
  }

  return commits.filter((c) => {
    if (hiddenSet.has(c.hash)) return false;

    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      if (
        !c.subject.toLowerCase().includes(q) &&
        !c.body.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (filter.author) {
      if (!c.authorName.toLowerCase().includes(filter.author.toLowerCase())) {
        return false;
      }
    }
    if (dateCutoff) {
      const commitDate = new Date(c.authorDate);
      if (commitDate < dateCutoff) {
        return false;
      }
    }
    return true;
  });
}

function deriveSelectionFromVisible(
  visibleCommits: Commit[],
  selectedCommitHashes: string[],
  selectedCommitHash: string | null,
  lastSelectedCommitHash: string | null,
): SelectionSnapshot {
  const visibleHashes = visibleCommits.map((c) => c.hash);
  const visibleSet = new Set(visibleHashes);
  const nextSelected = selectedCommitHashes.filter((h) => visibleSet.has(h));

  if (nextSelected.length === 0) {
    const fallback = visibleCommits[0]?.hash ?? null;
    if (!fallback) {
      return {
        selectedCommitHash: null,
        selectedCommitHashes: [],
        lastSelectedCommitHash: null,
        rangeOldest: null,
        rangeNewest: null,
      };
    }
    return {
      selectedCommitHash: fallback,
      selectedCommitHashes: [fallback],
      lastSelectedCommitHash: fallback,
      rangeOldest: fallback,
      rangeNewest: fallback,
    };
  }

  const ordered = visibleHashes.filter((h) => nextSelected.includes(h));
  const preferredFocus =
    selectedCommitHash && visibleSet.has(selectedCommitHash);
  const nextFocus = preferredFocus ? selectedCommitHash : ordered[0];
  const nextAnchor =
    lastSelectedCommitHash && visibleSet.has(lastSelectedCommitHash)
      ? lastSelectedCommitHash
      : ordered[0];

  return {
    selectedCommitHash: nextFocus,
    selectedCommitHashes: ordered,
    lastSelectedCommitHash: nextAnchor,
    rangeOldest: ordered[ordered.length - 1],
    rangeNewest: ordered[0],
  };
}

export const usePanelStore = create<PanelStore>((set, get) => ({
  commits: [],
  visibleCommits: [],
  branches: [],
  tags: [],
  currentBranch: "",
  graphLayout: {},
  laneSnapshot: null,

  selectedCommitHash: null,
  selectedCommitHashes: [],
  lastSelectedCommitHash: null,
  hoveredColumn: null,
  commitFiles: [],
  selectedFilePath: null,
  // Hash is noisy on small screens; enabled from the column menu when needed.
  visibleColumns: { author: true, date: true, hash: false },
  rangeOldest: null,
  rangeNewest: null,
  selectedBranches: [],
  lastSelectedBranch: null,
  // WebStorm-style: group branches by their `/` prefix (feature/foo → feature ▸ foo)
  // by default. Users who explicitly flattened the list keep that preference.
  branchGroupByDirectory: (() => {
    try {
      return localStorage.getItem("branchGroupByDirectory") !== "false";
    } catch {
      return true;
    }
  })(),

  filter: { searchQuery: "", branch: "", author: "", dateRange: "", file: "" },
  compare: null,
  filterBeforeCompare: null,
  detailTab: "commit",
  pendingSelectionFromFilter: [],
  collapsedSequenceIds: new Set(),
  collapsedIntermediates: new Map(),

  loading: false,
  hasMore: true,
  operationInProgress: false,
  operationLabel: null,

  async fetchInitialData() {
    set({ loading: true });
    const start = Date.now();
    try {
      const { filter } = get();
      const [graphResult, branches, tags] = await Promise.all([
        bridge.request("getGraphData", {
          maxCount: 200,
          branch: filter.branch || undefined,
          file: filter.file || undefined,
        }) as Promise<{
          graphData: { commits: Commit[]; lanes: Record<string, LaneInfo> };
          snapshot: LaneSnapshot;
        } | null>,
        bridge.request("getBranches") as Promise<BranchInfo[] | null>,
        bridge.request("getTags") as Promise<TagInfo[] | null>,
      ]);

      const commits = graphResult?.graphData?.commits ?? [];
      const lanes = graphResult?.graphData?.lanes ?? {};
      const snapshot = graphResult?.snapshot ?? null;
      const branchList = branches ?? [];
      const tagList = tags ?? [];
      const current = branchList.find((b) => b.isCurrent)?.name ?? "";

      const { pendingSelectionFromFilter, collapsedIntermediates } = get();

      const visible = filterCommits(commits, filter, collapsedIntermediates);

      // Check if we need to restore selection from a cleared filter
      if (pendingSelectionFromFilter.length > 0) {
        const validHashes = pendingSelectionFromFilter.filter((h) =>
          commits.some((c) => c.hash === h),
        );
        if (validHashes.length > 0) {
          set({
            commits,
            visibleCommits: visible,
            graphLayout: lanes,
            laneSnapshot: snapshot,
            branches: branchList,
            tags: tagList,
            currentBranch: current,

            hasMore: commits.length >= 200,
            selectedCommitHash: validHashes[0],
            selectedCommitHashes: validHashes,
            lastSelectedCommitHash: validHashes[0],
            commitFiles: [],
            selectedFilePath: null,
            rangeOldest: validHashes[validHashes.length - 1],
            rangeNewest: validHashes[0],
            pendingSelectionFromFilter: [],
          });

          const files = (await bridge.request("getCommitRangeFiles", {
            hashes: validHashes,
          })) as DiffFile[] | null;
          set({ commitFiles: files ?? [] });
          return;
        }
      }

      const firstVisible = visible[0];
      set({
        commits,
        visibleCommits: visible,
        graphLayout: lanes,
        laneSnapshot: snapshot,
        branches: branchList,
        tags: tagList,
        currentBranch: current,

        hasMore: commits.length >= 200,
        selectedCommitHash: firstVisible?.hash ?? null,
        selectedCommitHashes: firstVisible ? [firstVisible.hash] : [],
        lastSelectedCommitHash: firstVisible?.hash ?? null,
        commitFiles: [],
        selectedFilePath: null,
        rangeOldest: null,
        rangeNewest: null,
        pendingSelectionFromFilter: [],
      });

      // Auto-select first visible commit
      if (firstVisible) {
        const hash = firstVisible.hash;
        const files = (await bridge.request("getCommitRangeFiles", {
          hashes: [hash],
        })) as DiffFile[] | null;
        set({ commitFiles: files ?? [], rangeOldest: hash, rangeNewest: hash });
      }
    } catch (err) {
      console.error("fetchInitialData failed:", err);
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 1000) {
        await new Promise((r) => setTimeout(r, 1000 - elapsed));
      }
      set({ loading: false });
    }
  },

  async loadMore() {
    const { commits, laneSnapshot, hasMore, loading, filter } = get();
    if (!hasMore || loading) return;

    set({ loading: true });
    try {
      const result = (await bridge.request("loadMoreLog", {
        skip: commits.length,
        count: 200,
        snapshot: laneSnapshot,
        branch: filter.branch || undefined,
        file: filter.file || undefined,
      })) as {
        graphData: { commits: Commit[]; lanes: Record<string, LaneInfo> };
        snapshot: LaneSnapshot;
      } | null;

      if (result?.graphData?.commits?.length) {
        const newCommits = result.graphData.commits;
        const allCommits = [...commits, ...newCommits];
        set({
          commits: allCommits,
          visibleCommits: filterCommits(
            allCommits,
            get().filter,
            get().collapsedIntermediates,
          ),
          graphLayout: { ...get().graphLayout, ...result.graphData.lanes },
          laneSnapshot: result.snapshot,
          hasMore: newCommits.length >= 200,
          loading: false,
        });
      } else {
        set({ hasMore: false, loading: false });
      }
    } catch (err) {
      console.error("loadMore failed:", err);
      set({ loading: false });
    }
  },

  async selectCommit(
    hash: string,
    mode: SelectionMode = "single",
    allVisibleCommits: string[] = [],
  ) {
    const { selectedCommitHashes, lastSelectedCommitHash } = get();
    let nextSelected: string[] = [];
    let nextAnchor = lastSelectedCommitHash;

    if (mode === "single") {
      nextSelected = [hash];
      nextAnchor = hash;
    } else if (mode === "toggle") {
      if (selectedCommitHashes.includes(hash)) {
        nextSelected = selectedCommitHashes.filter((h) => h !== hash);
        if (nextSelected.length === 0) {
          nextSelected = [hash];
        }
      } else {
        nextSelected = [...selectedCommitHashes, hash];
      }
      nextAnchor = hash;
    } else {
      const anchor = lastSelectedCommitHash;
      if (!anchor || allVisibleCommits.length === 0) {
        nextSelected = [hash];
        nextAnchor = hash;
      } else {
        const anchorIdx = allVisibleCommits.indexOf(anchor);
        const targetIdx = allVisibleCommits.indexOf(hash);
        if (anchorIdx === -1 || targetIdx === -1) {
          nextSelected = [hash];
          nextAnchor = hash;
        } else {
          const start = Math.min(anchorIdx, targetIdx);
          const end = Math.max(anchorIdx, targetIdx);
          nextSelected = allVisibleCommits.slice(start, end + 1);
        }
      }
    }

    const focusHash = nextSelected.includes(hash)
      ? hash
      : (nextSelected[nextSelected.length - 1] ?? hash);

    // Sort selected hashes by visible list order (newest first)
    const selected = new Set(nextSelected);
    const orderedHashes =
      allVisibleCommits.length > 0
        ? allVisibleCommits.filter((h) => selected.has(h))
        : nextSelected;

    set({
      selectedCommitHash: focusHash,
      selectedCommitHashes: nextSelected,
      lastSelectedCommitHash: nextAnchor,
      commitFiles: [],
      selectedFilePath: null,
      rangeOldest: orderedHashes[orderedHashes.length - 1],
      rangeNewest: orderedHashes[0],
      // Selecting a commit in comparison mode shows its details; the compare
      // tab stays one click away.
      ...(get().compare ? { detailTab: "commit" as const } : {}),
    });
    try {
      const files = (await bridge.request("getCommitRangeFiles", {
        hashes: orderedHashes,
      })) as DiffFile[] | null;
      set({ commitFiles: files ?? [] });
    } catch (err) {
      console.error("selectCommit failed:", err);
    }
  },

  selectFile(filePath: string) {
    set({ selectedFilePath: filePath });
  },

  async openDiffEditor(commitHash: string, file: DiffFile) {
    try {
      const { selectedCommitHashes, commitFiles } = get();
      const filePath = file.newPath || file.oldPath;
      const isMulti = selectedCommitHashes.length > 1;

      if (isMulti) {
        await bridge.request("openDiffEditor", {
          commit: selectedCommitHashes[0],
          filePath,
          file,
          cherryPickHashes: selectedCommitHashes,
          fileList: commitFiles,
        });
      } else {
        await bridge.request("openDiffEditor", {
          commit: commitHash,
          filePath,
          file,
          fileList: commitFiles,
        });
      }
    } catch (err) {
      console.error("openDiffEditor failed:", err);
    }
  },

  setFilter(partial: Partial<PanelFilter>) {
    const { filter: current, selectedCommitHashes, commits } = get();
    const next = { ...current, ...partial };

    // Branch or file filter changes require a backend re-fetch
    if (
      (partial.branch !== undefined && partial.branch !== current.branch) ||
      (partial.file !== undefined && partial.file !== current.file)
    ) {
      set({
        filter: next,
        // Changing the branch/file scope leaves comparison mode; the two
        // filters would otherwise fight over what the log query means.
        ...(get().compare
          ? { compare: null, detailTab: "commit" as const }
          : {}),
        pendingSelectionFromFilter: [],
        collapsedSequenceIds: new Set(),
        collapsedIntermediates: new Map(),
      });
      get().fetchInitialData();
      return;
    }

    // Search/author filter: client-side only
    const wasFiltered = !!(
      current.searchQuery ||
      current.author ||
      current.dateRange
    );
    const isNowFiltered = !!(next.searchQuery || next.author || next.dateRange);
    const visible = filterCommits(commits, next, get().collapsedIntermediates);

    if (wasFiltered && !isNowFiltered) {
      // Clearing filter → save current selection for restoration
      set({
        filter: next,
        visibleCommits: visible,
        pendingSelectionFromFilter: selectedCommitHashes,
      });
    } else {
      set({
        filter: next,
        visibleCommits: visible,
        pendingSelectionFromFilter: [],
      });
    }
  },

  selectBranch(
    name: string,
    mode: "single" | "toggle" | "range",
    allVisibleBranches: string[],
  ) {
    if (mode === "single") {
      set({ selectedBranches: [name], lastSelectedBranch: name });
    } else if (mode === "toggle") {
      const current = get().selectedBranches;
      if (current.includes(name)) {
        set({
          selectedBranches: current.filter((b) => b !== name),
          lastSelectedBranch: name,
        });
      } else {
        set({ selectedBranches: [...current, name], lastSelectedBranch: name });
      }
    } else {
      // range
      const anchor = get().lastSelectedBranch;
      if (!anchor) {
        set({ selectedBranches: [name], lastSelectedBranch: name });
        return;
      }
      const anchorIdx = allVisibleBranches.indexOf(anchor);
      const targetIdx = allVisibleBranches.indexOf(name);
      if (anchorIdx === -1 || targetIdx === -1) {
        set({ selectedBranches: [name], lastSelectedBranch: name });
        return;
      }
      const start = Math.min(anchorIdx, targetIdx);
      const end = Math.max(anchorIdx, targetIdx);
      set({ selectedBranches: allVisibleBranches.slice(start, end + 1) });
    }
  },

  setHoveredColumn(column: number | null) {
    set({ hoveredColumn: column });
  },

  toggleColumnVisibility(column: "author" | "date" | "hash") {
    set((state) => ({
      visibleColumns: {
        ...state.visibleColumns,
        [column]: !state.visibleColumns[column],
      },
    }));
  },

  toggleBranchGroupByDirectory() {
    set((state) => {
      const next = !state.branchGroupByDirectory;
      try {
        localStorage.setItem("branchGroupByDirectory", String(next));
      } catch {
        // ignore
      }
      return { branchGroupByDirectory: next };
    });
  },

  toggleSequenceCollapse(sequenceId: string, intermediates: string[]) {
    const {
      commits,
      filter,
      collapsedSequenceIds,
      collapsedIntermediates,
      selectedCommitHashes,
      selectedCommitHash,
      lastSelectedCommitHash,
    } = get();
    const nextIds = new Set(collapsedSequenceIds);
    const nextMap = new Map(collapsedIntermediates);

    if (nextIds.has(sequenceId)) {
      nextIds.delete(sequenceId);
      nextMap.delete(sequenceId);
    } else {
      nextIds.add(sequenceId);
      nextMap.set(sequenceId, intermediates);
    }

    const nextVisible = filterCommits(commits, filter, nextMap);
    const nextSelection = deriveSelectionFromVisible(
      nextVisible,
      selectedCommitHashes,
      selectedCommitHash,
      lastSelectedCommitHash,
    );

    set({
      collapsedSequenceIds: nextIds,
      collapsedIntermediates: nextMap,
      visibleCommits: nextVisible,
      selectedCommitHash: nextSelection.selectedCommitHash,
      selectedCommitHashes: nextSelection.selectedCommitHashes,
      lastSelectedCommitHash: nextSelection.lastSelectedCommitHash,
      rangeOldest: nextSelection.rangeOldest,
      rangeNewest: nextSelection.rangeNewest,
      selectedFilePath: null,
      commitFiles: [],
    });

    const hashes = nextSelection.selectedCommitHashes;
    if (hashes.length > 0) {
      void (async () => {
        try {
          const files = (await bridge.request("getCommitRangeFiles", {
            hashes,
          })) as DiffFile[] | null;
          set({ commitFiles: files ?? [] });
        } catch (err) {
          console.error("toggleSequenceCollapse failed to load files:", err);
        }
      })();
    }
  },

  async enterCompare(targetBranch: string) {
    const baseBranch = get().currentBranch || "HEAD";
    if (!targetBranch || targetBranch === baseBranch) return;

    try {
      const result = (await bridge.request("compareBranches", {
        baseBranch,
        targetBranch,
      })) as BranchComparison | null;

      set({
        compare: {
          baseBranch,
          targetBranch,
          mergeBase: result?.mergeBase ?? null,
          ahead: result?.ahead ?? 0,
          behind: result?.behind ?? 0,
          baseCommits: [],
          baseGraph: {},
          targetCommits: [],
          targetGraph: {},
          loading: true,
          filesTarget: [],
          filesBase: [],
          filesSide: "target",
          filesLoading: true,
        },
        detailTab: "compare",
        filterBeforeCompare: get().filter,
        // Highlight the branch being compared in the tree.
        selectedBranches: [targetBranch],
        lastSelectedBranch: targetBranch,
        // The comparison view owns the middle area; normal filters don't apply.
        filter: {
          searchQuery: "",
          branch: "",
          author: "",
          dateRange: "",
          file: "",
        },
        pendingSelectionFromFilter: [],
        collapsedSequenceIds: new Set(),
        collapsedIntermediates: new Map(),
        selectedCommitHash: null,
        selectedCommitHashes: [],
        lastSelectedCommitHash: null,
        commitFiles: [],
        selectedFilePath: null,
        rangeOldest: null,
        rangeNewest: null,
      });
      await Promise.all([get().loadCompareCommits(), get().loadCompareFiles()]);
    } catch (err) {
      console.error("enterCompare failed:", err);
      set({ compare: null, detailTab: "commit" });
      void bridge.request("showErrorNotification", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  },

  async exitCompare() {
    const previousFilter = get().filterBeforeCompare;
    set({
      compare: null,
      filterBeforeCompare: null,
      detailTab: "commit",
      selectedCommitHashes: [],
      selectedCommitHash: null,
      lastSelectedCommitHash: null,
      commitFiles: [],
      ...(previousFilter ? { filter: previousFilter } : {}),
    });
    await get().fetchInitialData();
  },

  setDetailTab(tab: DetailTab) {
    set({ detailTab: tab });
  },

  setCompareFilesSide(side: CompareFilesSide) {
    const compare = get().compare;
    if (!compare || compare.filesSide === side) return;
    set({ compare: { ...compare, filesSide: side } });
  },

  async loadCompareCommits() {
    const compare = get().compare;
    if (!compare) return;

    set({ compare: { ...compare, loading: true } });
    try {
      const [baseResult, targetResult] = (await Promise.all([
        bridge.request("getGraphData", {
          maxCount: COMPARE_COMMIT_LIMIT,
          range: commitsRangeForSide(
            compare.baseBranch,
            compare.targetBranch,
            "base",
          ),
        }),
        bridge.request("getGraphData", {
          maxCount: COMPARE_COMMIT_LIMIT,
          range: commitsRangeForSide(
            compare.baseBranch,
            compare.targetBranch,
            "target",
          ),
        }),
      ])) as [GraphPayload | null, GraphPayload | null];

      const current = get().compare;
      if (
        !current ||
        current.baseBranch !== compare.baseBranch ||
        current.targetBranch !== compare.targetBranch
      ) {
        return;
      }

      const baseCommits = baseResult?.graphData?.commits ?? [];
      const targetCommits = targetResult?.graphData?.commits ?? [];

      // The details pane looks commits up by hash, so keep a merged list there.
      const union: Commit[] = [];
      const seen = new Set<string>();
      for (const commit of [...targetCommits, ...baseCommits]) {
        if (seen.has(commit.hash)) continue;
        seen.add(commit.hash);
        union.push(commit);
      }
      const selected = get().selectedCommitHashes.filter((hash) =>
        seen.has(hash),
      );

      set({
        compare: {
          ...current,
          baseCommits,
          baseGraph: baseResult?.graphData?.lanes ?? {},
          targetCommits,
          targetGraph: targetResult?.graphData?.lanes ?? {},
          loading: false,
        },
        commits: union,
        visibleCommits: union,
        graphLayout: {},
        hasMore: false,
        selectedCommitHashes: selected,
        selectedCommitHash: selected[0] ?? null,
        lastSelectedCommitHash: selected[0] ?? null,
        rangeOldest: selected.length ? selected[selected.length - 1] : null,
        rangeNewest: selected[0] ?? null,
      });
    } catch (err) {
      console.error("loadCompareCommits failed:", err);
      const current = get().compare;
      if (current) {
        set({
          compare: {
            ...current,
            baseCommits: [],
            baseGraph: {},
            targetCommits: [],
            targetGraph: {},
            loading: false,
          },
        });
      }
    }
  },

  async loadCompareFiles() {
    const compare = get().compare;
    if (!compare) return;

    set({ compare: { ...compare, filesLoading: true } });
    try {
      const [filesTarget, filesBase] = (await Promise.all([
        bridge.request("getCompareFiles", {
          baseRef: compareBaseRef(compare, "target"),
          headRef: branchForSide(compare, "target"),
        }),
        bridge.request("getCompareFiles", {
          baseRef: compareBaseRef(compare, "base"),
          headRef: branchForSide(compare, "base"),
        }),
      ])) as [DiffFile[] | null, DiffFile[] | null];

      const current = get().compare;
      if (
        !current ||
        current.baseBranch !== compare.baseBranch ||
        current.targetBranch !== compare.targetBranch
      ) {
        return;
      }
      set({
        compare: {
          ...current,
          filesTarget: filesTarget ?? [],
          filesBase: filesBase ?? [],
          filesLoading: false,
        },
      });
    } catch (err) {
      console.error("loadCompareFiles failed:", err);
      const current = get().compare;
      if (current) {
        set({
          compare: {
            ...current,
            filesTarget: [],
            filesBase: [],
            filesLoading: false,
          },
        });
      }
    }
  },

  async openCompareFile(file: DiffFile) {
    const compare = get().compare;
    if (!compare) return;

    const side = compare.filesSide;
    const headRef = branchForSide(compare, side);
    const baseRef = compareBaseRef(compare, side);
    const fileList =
      side === "target" ? compare.filesTarget : compare.filesBase;
    try {
      await bridge.request("openDiffEditor", {
        commit: headRef,
        filePath: file.newPath || file.oldPath,
        file,
        baseRef,
        rightLabel: headRef,
        fileList,
      });
    } catch (err) {
      console.error("openCompareFile failed:", err);
    }
  },

  async refreshCompare() {
    const compare = get().compare;
    if (!compare) return;

    try {
      const result = (await bridge.request("compareBranches", {
        baseBranch: compare.baseBranch,
        targetBranch: compare.targetBranch,
      })) as BranchComparison | null;
      const current = get().compare;
      if (!current) return;

      set({
        compare: {
          ...current,
          mergeBase: result?.mergeBase ?? current.mergeBase,
          ahead: result?.ahead ?? 0,
          behind: result?.behind ?? 0,
        },
      });
      await Promise.all([get().loadCompareCommits(), get().loadCompareFiles()]);
    } catch (err) {
      console.error("refreshCompare failed:", err);
      // The compared branch is gone (deleted/renamed); fall back to the log.
      set({
        compare: null,
        filterBeforeCompare: null,
        detailTab: "commit",
      });
    }
  },

  async refresh() {
    set({ collapsedSequenceIds: new Set(), collapsedIntermediates: new Map() });
    if (get().compare) {
      await get().refreshCompare();
      return;
    }
    await get().fetchInitialData();
  },
}));

// Listen for git state changes
bridge.onEvent((event, data) => {
  if (event === "gitStateChanged") {
    usePanelStore.getState().refresh();
  }
  if (event === "showFileHistory") {
    const { file } = data as { file: string };
    usePanelStore.getState().setFilter({ file });
  }
  if (event === "operationStart") {
    usePanelStore.setState({ operationInProgress: true });
  }
  if (event === "operationEnd") {
    usePanelStore.setState({ operationInProgress: false });
  }
});
