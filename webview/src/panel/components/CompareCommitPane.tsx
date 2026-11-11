import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "../../shared/i18n";
import { usePanelStore } from "../../shared/store/panel-store";
import type { Commit, LaneInfo } from "../../shared/types/git";
import { formatCommitDate } from "../utils/date";
import { type ColumnWidths, CommitRow, ROW_HEIGHT } from "./CommitRow";
import { GitGraphSvg } from "./GitGraphSvg";

const COLUMN_WIDTH = 10;
const GRAPH_PADDING = 6;

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = { author: 88, date: 112, hash: 64 };

/**
 * One half of the split comparison: a header plus a scrollable commit list
 * with its own graph. Shares selection with the details pane through the store.
 */
export function CompareCommitPane({
  branch,
  count,
  hint,
  commits,
  graphLayout,
  loading,
}: {
  branch: string;
  count: number;
  hint: string;
  commits: Commit[];
  graphLayout: Record<string, LaneInfo>;
  loading: boolean;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(240);
  const [paneWidth, setPaneWidth] = useState(0);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(
    DEFAULT_COLUMN_WIDTHS,
  );
  const visibleColumns = usePanelStore((s) => s.visibleColumns);
  const selectCommit = usePanelStore((s) => s.selectCommit);

  const maxColumn = Math.max(
    0,
    ...Object.values(graphLayout).map((lane) => lane.column),
  );
  const graphWidth = (maxColumn + 1) * COLUMN_WIDTH + GRAPH_PADDING * 2;

  const widths = useMemo(() => {
    if (commits.length === 0) return null;
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
    if (!widths) return;
    setColumnWidths((previous) => {
      if (previous.author === widths.author && previous.date === widths.date) {
        return previous;
      }
      return { ...previous, author: widths.author, date: widths.date };
    });
  }, [widths]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeight(Math.max(0, entry.contentRect.height));
        setPaneWidth(Math.max(0, entry.contentRect.width));
      }
    });
    observer.observe(node);
    setHeight(node.clientHeight);
    setPaneWidth(node.clientWidth);
    return () => observer.disconnect();
  }, []);

  const virtualizer = useVirtualizer({
    count: commits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  // Narrow panes are better served by message + refs than by squeezed
  // author/date columns; drop columns progressively as space disappears.
  const paneColumns = {
    author: visibleColumns.author && paneWidth >= 540,
    date: visibleColumns.date && paneWidth >= 540,
    hash: visibleColumns.hash && paneWidth >= 760,
  };

  const hashes = commits.map((commit) => commit.hash);

  return (
    <div
      data-testid="compare-pane"
      data-side={hint}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 10px",
          flexShrink: 0,
          fontSize: 12,
          borderBottom: "1px solid var(--border)",
          background:
            "var(--vscode-sideBar-background, var(--app-bg, #1e1e1e))",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={branch}
        >
          {t("Only in {branch} ({count})", { branch, count })}
        </span>
        <span
          style={{
            fontSize: "0.85em",
            opacity: 0.6,
            border: "1px solid var(--border)",
            borderRadius: 3,
            padding: "0 5px",
            flexShrink: 0,
          }}
        >
          {hint}
        </span>
        {commits.length < count && (
          <span style={{ marginLeft: "auto", opacity: 0.6, flexShrink: 0 }}>
            {t("Showing first {shown}", { shown: commits.length })}
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
        }}
      >
        <div
          ref={parentRef}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          style={{ flex: 1, minWidth: 0, overflow: "auto" }}
        >
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const commit = commits[item.index];
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
                    lane={graphLayout[commit.hash]}
                    graphWidth={graphWidth}
                    columnWidths={columnWidths}
                    visibleColumns={paneColumns}
                    onCommitClick={() => {
                      void selectCommit(commit.hash, "single", hashes);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <GitGraphSvg
          scrollTop={scrollTop}
          height={height}
          commits={commits}
          visibleCommits={commits}
          graphLayout={graphLayout}
          collapsedSequenceIds={EMPTY_COLLAPSED}
        />

        {commits.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.5,
              fontSize: 12,
              pointerEvents: "none",
            }}
          >
            {loading ? t("Loading...") : t("No commits on this side")}
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY_COLLAPSED: Set<string> = new Set();
