import { useEffect } from "react";
import { t } from "../../shared/i18n";
import { usePanelStore } from "../../shared/store/panel-store";

/**
 * Compact strip shown above the split comparison. Mirrors WebStorm's
 * "compare with current branch" header: which branches are compared, how far
 * apart they are, and a shortcut to the branch-level file list.
 */
export function CompareBanner() {
  const compare = usePanelStore((s) => s.compare);
  const setDetailTab = usePanelStore((s) => s.setDetailTab);
  const exitCompare = usePanelStore((s) => s.exitCompare);

  // Escape leaves the comparison, matching the close button.
  useEffect(() => {
    if (!compare) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      void exitCompare();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exitCompare, compare]);

  if (!compare) return null;

  const {
    baseBranch,
    targetBranch,
    ahead,
    behind,
    filesTarget,
    filesLoading,
    mergeBase,
  } = compare;

  return (
    <div
      data-testid="compare-banner"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "4px 12px",
        padding: "5px 8px",
        flexShrink: 0,
        fontSize: 12,
        borderBottom: "1px solid var(--border)",
        background:
          "var(--vscode-editor-inactiveSelectionBackground, rgba(55,148,255,0.10))",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flex: "1 1 280px",
          minWidth: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{ opacity: 0.7, display: "flex", alignItems: "center" }}
        >
          <IconCompare />
        </span>
        <span
          title={`${baseBranch} ↔ ${targetBranch}`}
          style={{
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          {t("Comparing {base} with {target}", {
            base: baseBranch,
            target: targetBranch,
          })}
        </span>

        <span
          style={{
            opacity: 0.7,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {mergeBase
            ? t("{ahead} commits ahead · {behind} behind", { ahead, behind })
            : t("No common ancestor")}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginLeft: "auto",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setDetailTab("compare");
            window.dispatchEvent(new CustomEvent("panel-show-details"));
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--vscode-textLink-foreground, #3794ff)",
            cursor: "pointer",
            fontSize: 12,
            padding: "2px 4px",
            whiteSpace: "nowrap",
          }}
        >
          {filesLoading
            ? t("Loading...")
            : t("Changed files ({count})", { count: filesTarget.length })}
        </button>

        <button
          type="button"
          title={t("Exit comparison")}
          aria-label={t("Exit comparison")}
          onClick={() => void exitCompare()}
          style={{
            background: "transparent",
            border: "none",
            color: "inherit",
            cursor: "pointer",
            padding: "2px 4px",
            display: "flex",
            alignItems: "center",
            opacity: 0.8,
          }}
        >
          <IconClose />
        </button>
      </div>
    </div>
  );
}

function IconCompare() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 5.5h8.5L9 3m4 7.5H4.5L7 13"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M4.5 11.5L11.5 4.5M11.5 11.5L4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
