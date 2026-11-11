import { Allotment } from "allotment";
import { t } from "../../shared/i18n";
import { usePanelStore } from "../../shared/store/panel-store";
import { CommitDetail } from "./CommitDetail";
import { CompareFileList } from "./CompareFileList";
import { FileChangeTree } from "./FileChangeTree";

function CommitDetailLayout() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Allotment vertical>
        <Allotment.Pane minSize={60} preferredSize="40%">
          <div style={{ height: "100%", overflow: "hidden" }}>
            <FileChangeTree />
          </div>
        </Allotment.Pane>
        <Allotment.Pane minSize={60}>
          <div style={{ height: "100%", overflow: "auto" }}>
            <CommitDetail />
          </div>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}

/**
 * Details pane. In comparison mode it gains a tab switch so the branch-level
 * file diff and the selected commit's details don't compete for the space.
 */
export function DetailPanel() {
  const compare = usePanelStore((s) => s.compare);
  const detailTab = usePanelStore((s) => s.detailTab);
  const setDetailTab = usePanelStore((s) => s.setDetailTab);

  if (!compare) {
    return <CommitDetailLayout />;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        role="tablist"
        style={{
          display: "flex",
          gap: 2,
          padding: "4px 6px 0",
          flexShrink: 0,
          minWidth: 0,
          overflow: "hidden",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <DetailTabButton
          active={detailTab === "compare"}
          onClick={() => setDetailTab("compare")}
          label={t("Changed files ({count})", {
            count:
              compare.filesSide === "target"
                ? compare.filesTarget.length
                : compare.filesBase.length,
          })}
        />
        <DetailTabButton
          active={detailTab === "commit"}
          onClick={() => setDetailTab("commit")}
          label={t("Commit details")}
        />
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {detailTab === "compare" ? <CompareFileList /> : <CommitDetailLayout />}
      </div>
    </div>
  );
}

function DetailTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        borderBottom: active
          ? "2px solid var(--vscode-focusBorder, #007acc)"
          : "2px solid transparent",
        color: "inherit",
        opacity: active ? 1 : 0.6,
        cursor: "pointer",
        fontSize: 12,
        padding: "3px 8px 4px",
        whiteSpace: "nowrap",
        minWidth: 0,
        flexShrink: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {label}
    </button>
  );
}
