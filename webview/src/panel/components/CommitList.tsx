import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { bridge } from "../../shared/bridge";
import { useModifierClickSelection } from "../../shared/hooks/useModifierClickSelection";
import { t } from "../../shared/i18n";
import { usePanelStore } from "../../shared/store/panel-store";
import type { Commit } from "../../shared/types/git";
import { formatCommitDate } from "../utils/date";
import { CommitContextMenu } from "./CommitContextMenu";
import { type ColumnWidths, CommitRow, ROW_HEIGHT } from "./CommitRow";
import { CreateBranchDialog } from "./CreateBranchDialog";

const COLUMN_WIDTH = 10;
const GRAPH_PADDING = 6;

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  author: 88,
  date: 112,
  hash: 64,
};

export function CommitList({
  onScroll,
}: {
  onScroll?: (scrollTop: number) => void;
}) {
  const visibleCommits = usePanelStore((s) => s.visibleCommits);
  const commits = usePanelStore((s) => s.commits);
  const graphLayout = usePanelStore((s) => s.graphLayout);
  const hasMore = usePanelStore((s) => s.hasMore);
  const loadMore = usePanelStore((s) => s.loadMore);
  const loading = usePanelStore((s) => s.loading);
  const selectCommit = usePanelStore((s) => s.selectCommit);

  const parentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(
    DEFAULT_COLUMN_WIDTHS,
  );
  const visibleColumns = usePanelStore((s) => s.visibleColumns);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    commit: Commit;
  } | null>(null);

  // Create branch dialog state (triggered from commit context menu)
  const [createBranchDialog, setCreateBranchDialog] = useState<{
    hash: string;
    shortHash: string;
  } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, commit: Commit) => {
      setContextMenu({ x: e.clientX, y: e.clientY, commit });
    },
    [],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const maxColumn = Math.max(
    0,
    ...Object.values(graphLayout).map((l) => l.column),
  );
  const graphWidth = (maxColumn + 1) * COLUMN_WIDTH + GRAPH_PADDING * 2;

  // Fit the author/date columns to their widest content so names and dates are
  // never wrapped or ellipsized. Manual resizing wins once the user drags.
  const contentWidths = useMemo(() => {
    if (commits.length === 0) return { author: 88, date: 112 };
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (context) {
      const style = getComputedStyle(document.body);
      context.font = `${style.fontSize} ${style.fontFamily}`;
    }
    let author = 0;
    let date = 0;
    for (const commit of commits) {
      const authorWidth = context
        ? context.measureText(commit.authorName).width
        : commit.authorName.length * 7;
      const dateWidth = context
        ? context.measureText(formatCommitDate(commit.authorDate)).width
        : formatCommitDate(commit.authorDate).length * 7;
      author = Math.max(author, authorWidth);
      date = Math.max(date, dateWidth);
    }
    return {
      author: Math.min(240, Math.max(72, Math.ceil(author) + 16)),
      date: Math.min(180, Math.max(80, Math.ceil(date) + 16)),
    };
  }, [commits]);

  useEffect(() => {
    setColumnWidths((previous) => {
      if (
        previous.author === contentWidths.author &&
        previous.date === contentWidths.date
      ) {
        return previous;
      }
      return {
        ...previous,
        author: contentWidths.author,
        date: contentWidths.date,
      };
    });
  }, [contentWidths]);

  // Compute per-row max column considering ALL lanes passing through each row

  const virtualizer = useVirtualizer({
    count: visibleCommits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });
  const allVisibleCommitHashes = visibleCommits.map((commit) => commit.hash);

  const handleCommitClick = useModifierClickSelection<string>((hash, mode) => {
    void selectCommit(hash, mode, allVisibleCommitHashes);
  });

  // Keyboard navigation (Arrow Up/Down)
  const selectedCommitHashes = usePanelStore((s) => s.selectedCommitHashes);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      if (!visibleCommits.length) return;

      // Only handle when no input is focused
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement
      )
        return;

      e.preventDefault();

      const currentHash =
        selectedCommitHashes.length > 0
          ? selectedCommitHashes[selectedCommitHashes.length - 1]
          : null;
      const currentIdx = currentHash
        ? visibleCommits.findIndex((c) => c.hash === currentHash)
        : -1;

      let nextIdx: number;
      if (e.key === "ArrowUp") {
        nextIdx = currentIdx <= 0 ? 0 : currentIdx - 1;
      } else {
        nextIdx =
          currentIdx >= visibleCommits.length - 1
            ? visibleCommits.length - 1
            : currentIdx + 1;
      }

      const nextHash = visibleCommits[nextIdx].hash;
      void selectCommit(nextHash, "single", allVisibleCommitHashes);

      // Scroll the selected row into view with some padding
      // Show 3 rows ahead so user can see upcoming items
      const scrollIdx =
        e.key === "ArrowDown"
          ? Math.min(nextIdx + 3, visibleCommits.length - 1)
          : Math.max(nextIdx - 3, 0);
      virtualizer.scrollToIndex(scrollIdx, { align: "auto" });
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    visibleCommits,
    selectedCommitHashes,
    selectCommit,
    allVisibleCommitHashes,
    virtualizer,
  ]);

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    onScroll?.(el.scrollTop);
    if (
      !loading &&
      hasMore &&
      el.scrollTop + el.clientHeight >= el.scrollHeight - ROW_HEIGHT * 5
    ) {
      loadMore();
    }
  }, [onScroll, loading, hasMore, loadMore]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {/* Scrollable commit list */}
      <div
        ref={parentRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const commit = visibleCommits[item.index];
            const lane = graphLayout[commit.hash];
            return (
              <div
                key={commit.hash}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: ROW_HEIGHT,
                  transform: `translateY(${item.start}px)`,
                }}
              >
                <CommitRow
                  commit={commit}
                  lane={lane}
                  graphWidth={graphWidth}
                  columnWidths={columnWidths}
                  visibleColumns={visibleColumns}
                  onCommitClick={handleCommitClick}
                  onContextMenu={handleContextMenu}
                />
              </div>
            );
          })}
        </div>
        {contextMenu && (
          <CommitContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            commit={contextMenu.commit}
            onClose={closeContextMenu}
            onCreateBranch={(hash, _defaultName) => {
              closeContextMenu();
              const shortHash = hash.slice(0, 8);
              setCreateBranchDialog({ hash, shortHash });
            }}
          />
        )}
        {createBranchDialog &&
          createPortal(
            <CreateBranchDialog
              title={t("Create Branch from {hash}", {
                hash: createBranchDialog.shortHash,
              })}
              defaultName=""
              placeholder="branch-name"
              onClose={() => setCreateBranchDialog(null)}
              onConfirm={async ({ branchName, checkout, force }) => {
                const hash = createBranchDialog.hash;
                try {
                  await bridge.request("createBranchFromCommit", {
                    branchName,
                    hash,
                    checkout,
                    force,
                  });
                  setCreateBranchDialog(null);
                  return undefined;
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  const match = msg.match(/fatal:\s*(.+)/);
                  return match
                    ? match[1]
                    : t(
                        "Branch '{branch}' already exists.\nChange the name or overwrite existing branch.",
                        { branch: branchName },
                      );
                }
              }}
            />,
            document.body,
          )}
      </div>
    </div>
  );
}
