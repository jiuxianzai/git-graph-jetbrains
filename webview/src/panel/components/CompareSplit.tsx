import { Allotment } from "allotment";
import { t } from "../../shared/i18n";
import { usePanelStore } from "../../shared/store/panel-store";
import { CompareCommitPane } from "./CompareCommitPane";

/**
 * Split comparison: top shows commits only reachable from the current branch,
 * bottom shows commits only reachable from the target branch. The panes are
 * independently scrollable and keep their own graphs.
 */
export function CompareSplit() {
  const compare = usePanelStore((s) => s.compare);

  if (!compare) return null;

  const {
    baseBranch,
    targetBranch,
    baseCommits,
    baseGraph,
    targetCommits,
    targetGraph,
    behind,
    ahead,
    loading,
  } = compare;

  return (
    <div
      data-testid="compare-split"
      style={{ flex: 1, minHeight: 0, display: "flex" }}
    >
      <Allotment vertical>
        <Allotment.Pane minSize={80} preferredSize="50%">
          <CompareCommitPane
            branch={baseBranch}
            count={behind}
            hint={t("Current branch")}
            commits={baseCommits}
            graphLayout={baseGraph}
            loading={loading}
          />
        </Allotment.Pane>
        <Allotment.Pane minSize={80} preferredSize="50%">
          <CompareCommitPane
            branch={targetBranch}
            count={ahead}
            hint={t("Target branch")}
            commits={targetCommits}
            graphLayout={targetGraph}
            loading={loading}
          />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
