import { useState } from "react";
import CodiconListFlat from "~icons/codicon/list-flat";
import CodiconListTree from "~icons/codicon/list-tree";
import { FileTree } from "../../shared/components/FileTree";
import { Tooltip } from "../../shared/components/Tooltip";
import { t } from "../../shared/i18n";
import { usePanelStore } from "../../shared/store/panel-store";
import type { DiffFile } from "../../shared/types/git";
import "../../shared/components/Tooltip.css";

/**
 * File list for the active branch comparison. Every click opens the diff
 * between the merge base and the branch of the selected side.
 */
export function CompareFileList() {
  const compare = usePanelStore((s) => s.compare);
  const openCompareFile = usePanelStore((s) => s.openCompareFile);
  const setCompareFilesSide = usePanelStore((s) => s.setCompareFilesSide);
  const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (!compare) return null;

  const { filesSide, filesTarget, filesBase, filesLoading } = compare;
  const files = filesSide === "target" ? filesTarget : filesBase;
  const branch =
    filesSide === "target" ? compare.targetBranch : compare.baseBranch;

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      data-testid="compare-files"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <div
        style={{
          padding: "6px 12px 4px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexShrink: 0,
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.8em",
              opacity: 0.6,
              textTransform: "uppercase",
            }}
          >
            {t("Changed files ({count})", { count: files.length })}
          </div>
          <div
            title={branch}
            style={{
              fontSize: "0.75em",
              opacity: 0.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {t("Since merge base")}
          </div>
        </div>
        <span style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <Tooltip text={t("Tree View")}>
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              style={{
                background:
                  viewMode === "tree" ? "var(--selected-bg)" : "transparent",
                border: "none",
                borderRadius: 3,
                cursor: "pointer",
                padding: "2px 4px",
                display: "flex",
                alignItems: "center",
                color: "inherit",
              }}
            >
              <CodiconListTree />
            </button>
          </Tooltip>
          <Tooltip text={t("Flat List")}>
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              style={{
                background:
                  viewMode === "flat" ? "var(--selected-bg)" : "transparent",
                border: "none",
                borderRadius: 3,
                cursor: "pointer",
                padding: "2px 4px",
                display: "flex",
                alignItems: "center",
                color: "inherit",
              }}
            >
              <CodiconListFlat />
            </button>
          </Tooltip>
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "0 12px 6px",
          flexShrink: 0,
          minWidth: 0,
        }}
      >
        <SideButton
          active={filesSide === "target"}
          testId="compare-side-target"
          label={compare.targetBranch}
          count={filesTarget.length}
          onClick={() => setCompareFilesSide("target")}
        />
        <SideButton
          active={filesSide === "base"}
          testId="compare-side-base"
          label={compare.baseBranch}
          count={filesBase.length}
          onClick={() => setCompareFilesSide("base")}
        />
      </div>

      <div style={{ flex: 1, overflow: "auto", overflowX: "hidden" }}>
        {filesLoading ? (
          <div style={{ padding: 12, opacity: 0.5 }}>{t("Loading...")}</div>
        ) : files.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.5 }}>
            {t("No changed files between these branches")}
          </div>
        ) : (
          <FileTree
            files={files}
            viewMode={viewMode}
            selectedFiles={[]}
            onFileClick={(_e, file: DiffFile) => {
              void openCompareFile(file);
            }}
            collapsed={collapsed}
            onToggle={toggleCollapse}
          />
        )}
      </div>
    </div>
  );
}

function SideButton({
  active,
  testId,
  label,
  count,
  onClick,
}: {
  active: boolean;
  testId: string;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      title={label}
      style={{
        flex: 1,
        minWidth: 0,
        height: 22,
        padding: "0 6px",
        fontSize: 11,
        borderRadius: 3,
        border: "1px solid var(--border)",
        background: active
          ? "var(--vscode-button-background, #0e639c)"
          : "transparent",
        color: active ? "var(--vscode-button-foreground, #fff)" : "inherit",
        cursor: "pointer",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {label} ({count})
    </button>
  );
}
