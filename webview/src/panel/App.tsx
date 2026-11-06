import { Allotment, type AllotmentHandle } from "allotment";
import { useCallback, useEffect, useRef, useState } from "react";
import "allotment/dist/style.css";
import { Tooltip } from "../shared/components/Tooltip";
import "../shared/components/Tooltip.css";
import { usePreventSelect } from "../shared/hooks/usePreventSelect";
import { t } from "../shared/i18n";
import { usePanelStore } from "../shared/store/panel-store";
import { BranchTree } from "./components/BranchTree";
import { DetailPanel } from "./components/DetailPanel";
import { GitGraphPanel } from "./components/GitGraphPanel";
import { Toolbar } from "./components/Toolbar";

function ProgressBar({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 10000,
        overflow: "hidden",
        background: "rgba(0, 122, 204, 0.15)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: "40%",
          background:
            "linear-gradient(90deg, transparent, #007acc 30%, #3794ff 70%, transparent)",
          animation: "progress-slide 1s infinite linear",
        }}
      />
      <style>
        {`@keyframes progress-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }`}
      </style>
    </div>
  );
}

const LAYOUT_LEFT_RATIO = 0.22;
const LAYOUT_RIGHT_RATIO = 0.24;

const LEFT_MIN = 140;
const LEFT_MAX = 500;
const RIGHT_MIN = 140;
const RIGHT_MAX = 600;
/** Allotment clamps against the pane minimum, keep the graph usable. */
const MIDDLE_MIN = 180;
/** Pane width when the details panel is collapsed. */
const COLLAPSED_WIDTH = 28;

function clampWidth(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function layoutStorageKey(): string {
  const workspace =
    document.getElementById("root")?.dataset.workspace ?? "default";
  // v2: v1 keys were polluted by transient (clamped) sizes written on every
  // layout pass, so start from a clean slate.
  return `jetgit.layout.v2:${workspace}`;
}

function readLayout(): { left?: number; right?: number } | null {
  try {
    const raw = localStorage.getItem(layoutStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { left?: unknown; right?: unknown };
    const left =
      typeof parsed.left === "number" && Number.isFinite(parsed.left)
        ? clampWidth(parsed.left, LEFT_MIN, LEFT_MAX)
        : undefined;
    const right =
      typeof parsed.right === "number" && Number.isFinite(parsed.right)
        ? clampWidth(parsed.right, RIGHT_MIN, RIGHT_MAX)
        : undefined;
    return left === undefined && right === undefined ? null : { left, right };
  } catch {
    return null;
  }
}

function defaultLeftWidth(): number {
  return clampWidth(window.innerWidth * LAYOUT_LEFT_RATIO, LEFT_MIN, 420);
}

function defaultRightWidth(): number {
  return clampWidth(window.innerWidth * LAYOUT_RIGHT_RATIO, RIGHT_MIN, 560);
}

export function PanelApp() {
  const loading = usePanelStore((s) => s.loading);
  const commits = usePanelStore((s) => s.commits);
  const operationInProgress = usePanelStore((s) => s.operationInProgress);
  const fetchInitialData = usePanelStore((s) => s.fetchInitialData);

  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const savedLayout = useRef(readLayout()).current;
  const [leftWidth, setLeftWidth] = useState(
    savedLayout?.left ?? defaultLeftWidth,
  );
  const [rightWidth, setRightWidth] = useState(
    savedLayout?.right ?? defaultRightWidth,
  );
  const leftWidthRef = useRef(leftWidth);
  leftWidthRef.current = leftWidth;
  const rightWidthRef = useRef(rightWidth);
  rightWidthRef.current = rightWidth;

  const allotmentRef = useRef<AllotmentHandle | null>(null);
  // Width of the Allotment host. 0 until measured; a hidden webview keeps the
  // last known width so re-showing does not collapse the panes.
  const [hostWidth, setHostWidth] = useState(0);
  // Allotment only adds its panes once the container has a non-zero size, and
  // reports that first layout through onChange. Resizing before that is a no-op.
  const [layoutReady, setLayoutReady] = useState(false);

  const saveLayout = useCallback((left: number, right: number) => {
    try {
      localStorage.setItem(layoutStorageKey(), JSON.stringify({ left, right }));
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Track the host width. Webviews are hidden with display:none when the user
  // switches to another panel/sidebar view, which makes the observer report 0;
  // ignore those so we never re-layout (and persist) against a zero-width host.
  //
  // A callback ref is required: the whole layout is unmounted while the initial
  // loading placeholder is shown, so a plain useEffect([]) would keep observing
  // a detached node and never fire again.
  const hostObserverRef = useRef<ResizeObserver | null>(null);
  const attachAllotmentHost = useCallback((node: HTMLDivElement | null) => {
    hostObserverRef.current?.disconnect();
    hostObserverRef.current = null;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect.width ?? 0);
      if (width <= 0) return;
      setHostWidth((prev) => (prev === width ? prev : width));
    });
    observer.observe(node);
    hostObserverRef.current = observer;
  }, []);

  useEffect(() => () => hostObserverRef.current?.disconnect(), []);

  // Allotment dumps every container-width delta into the last pane, so a panel
  // resize, hiding the branch tree, or a hide/show cycle drags the details pane
  // to its min/max. Pin it back to the width the user actually chose instead.
  useEffect(() => {
    if (!layoutReady || !showRight || hostWidth <= 0) return;
    const maxRight = Math.max(
      RIGHT_MIN,
      Math.min(RIGHT_MAX, hostWidth - MIDDLE_MIN),
    );
    const right = clampWidth(rightWidth, RIGHT_MIN, maxRight);
    const middle = Math.max(MIDDLE_MIN, hostWidth - right);
    allotmentRef.current?.resize([middle, right]);
  }, [layoutReady, hostWidth, rightWidth, showRight]);

  const toggleLeft = useCallback(() => setShowLeft((v) => !v), []);
  const toggleRight = useCallback(() => setShowRight((v) => !v), []);

  // Drag handle for left panel resize
  const startLeftResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = leftWidth;
      let current = startWidth;
      const onMove = (ev: MouseEvent) => {
        current = clampWidth(
          startWidth + ev.clientX - startX,
          LEFT_MIN,
          LEFT_MAX,
        );
        setLeftWidth(current);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        saveLayout(current, rightWidthRef.current);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [leftWidth, saveLayout],
  );

  const middleRef = usePreventSelect();

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  if (loading && commits.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          opacity: 0.5,
        }}
      >
        {t("Loading...")}
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <ProgressBar visible={operationInProgress || loading} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Left branch panel — outside Allotment to avoid flicker */}
        <div
          style={{
            width: showLeft ? leftWidth : COLLAPSED_WIDTH,
            height: "100%",
            flexShrink: 0,
            overflow: "hidden",
            display: "flex",
          }}
        >
          {showLeft ? (
            <div
              style={{
                flex: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <BranchTree onTogglePanel={toggleLeft} />
            </div>
          ) : (
            <div
              style={{
                height: "100%",
                width: "100%",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 4,
              }}
            >
              <Tooltip text={t("Show Branches")}>
                <button
                  type="button"
                  className="panel-toggle-btn"
                  onClick={toggleLeft}
                >
                  <ChevronRightIcon />
                </button>
              </Tooltip>
            </div>
          )}
          {showLeft && (
            <div
              onMouseDown={startLeftResize}
              style={{
                width: 4,
                cursor: "col-resize",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 1,
                  height: "100%",
                  background: "var(--border)",
                }}
              />
            </div>
          )}
          {!showLeft && (
            <div
              style={{
                width: 1,
                flexShrink: 0,
                background: "var(--border)",
              }}
            />
          )}
        </div>

        {/* Middle + Right in Allotment */}
        <div ref={attachAllotmentHost} style={{ flex: 1, minWidth: 0 }}>
          <Allotment
            ref={allotmentRef}
            proportionalLayout={false}
            onChange={() => {
              if (!layoutReady) setLayoutReady(true);
            }}
            onDragEnd={(sizes) => {
              const right = Math.round(sizes[1] ?? rightWidthRef.current);
              setRightWidth(right);
              saveLayout(leftWidthRef.current, right);
            }}
          >
            <Allotment.Pane minSize={MIDDLE_MIN}>
              <div
                ref={middleRef}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <Toolbar />
                <GitGraphPanel />
              </div>
            </Allotment.Pane>
            <Allotment.Pane
              preferredSize={rightWidth}
              minSize={showRight ? RIGHT_MIN : COLLAPSED_WIDTH}
              maxSize={showRight ? RIGHT_MAX : COLLAPSED_WIDTH}
              visible
            >
              {showRight ? (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      padding: "4px 4px 0",
                      flexShrink: 0,
                    }}
                  >
                    <Tooltip text={t("Hide Details")}>
                      <button
                        type="button"
                        className="panel-toggle-btn"
                        onClick={toggleRight}
                      >
                        <CloseIcon />
                      </button>
                    </Tooltip>
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <DetailPanel />
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    paddingTop: 4,
                    borderLeft: "1px solid var(--border)",
                  }}
                >
                  <Tooltip text={t("Show Details")}>
                    <button
                      type="button"
                      className="panel-toggle-btn"
                      onClick={toggleRight}
                    >
                      <ChevronLeftIcon />
                    </button>
                  </Tooltip>
                </div>
              )}
            </Allotment.Pane>
          </Allotment>
        </div>
      </div>
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M6 4.5L9.5 8L6 11.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M10 4.5L6.5 8L10 11.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4.5 11.5L11.5 4.5M11.5 11.5L4.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}
