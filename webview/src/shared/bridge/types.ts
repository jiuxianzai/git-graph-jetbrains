export interface RequestMessage {
  type: "request";
  id: string;
  command: string;
  params: Record<string, unknown>;
}

export interface ResponseMessage {
  type: "response";
  id: string;
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string };
}

export interface EventMessage {
  type: "event";
  event: string;
  data: unknown;
}

export type Message = RequestMessage | ResponseMessage | EventMessage;

export type CommandType =
  | "getLog"
  | "getGraphData"
  | "loadMoreLog"
  | "getBranches"
  | "getTags"
  | "getDiff"
  | "getFileContent"
  | "getCommitFiles"
  | "getStatus"
  | "openDiffEditor"
  | "openMergeEditor"
  | "getMergeState"
  | "getCherryPickState"
  | "getConflictFiles"
  | "getFileVersions"
  | "saveMergedContent"
  | "stageFile"
  | "unstageFile"
  | "stageAll"
  | "unstageAll"
  | "acceptOurs"
  | "acceptTheirs"
  | "confirmCancelMerge"
  | "closeMergeEditor"
  | "openFile"
  | "checkoutBranch"
  | "createBranch"
  | "createBranchFromCommit"
  | "deleteBranch"
  | "renameBranch"
  | "mergeBranch"
  | "rebaseBranch"
  | "checkoutAndRebase"
  | "pushBranch"
  | "pullBranch"
  | "pullRebase"
  | "pullMerge"
  | "fetchBranch"
  | "commitChanges"
  | "commitAndPush"
  | "amendCommit"
  | "rollbackFile"
  | "rollbackFiles"
  | "getWorkingTreeChanges"
  | "getShelves"
  | "shelveChanges"
  | "unshelveChanges"
  | "deleteShelve"
  | "showDiffForWorkingFile"
  | "getAmendMessage"
  | "getIdeaShelves"
  | "ideaShelveChanges"
  | "ideaUnshelveChanges"
  | "deleteIdeaShelf"
  | "showIdeaShelfFileDiff"
  | "createPatchFromShelf"
  | "copyShelfPatchToClipboard"
  | "importPatches"
  | "deleteFiles"
  | "revealInSystemExplorer"
  | "getRecentCommitMessages"
  | "refreshGitState"
  | "getRebaseState"
  | "rebaseAction"
  | "mergeAction"
  | "cherryPickAction"
  | "showErrorNotification"
  | "showInfoNotification"
  | "openConflictsPanel"
  | "importPatchFromClipboard"
  | "createBranchPrompt"
  | "deleteBranchPrompt"
  | "compareBranches"
  | "getCompareFiles"
  | "showMyBranches"
  | "fetchAll"
  | "toggleFavorite"
  | "navigateToHead"
  | "toggleBranchGroupByDirectory"
  | "setSingleClickAction"
  | "toggleShowTags"
  | "getAheadCommits"
  | "getCommitRangeFiles"
  | "executePush"
  | "openPushPanel"
  | "getRemoteBranches"
  | "dropCommit"
  | "closePushPanel"
  | "openRollbackPanel"
  | "executeRollback"
  | "closeRollbackPanel";

export interface RequestOptions {
  /**
   * How long the webview waits for a response, in milliseconds.
   * Defaults to 10s. Pass 0 to wait indefinitely (long git network operations).
   */
  timeoutMs?: number;
}

export interface Bridge {
  request(
    command: CommandType | string,
    params?: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<unknown>;
  onEvent(handler: (event: string, data: unknown) => void): () => void;
}

export interface ProgressOptions extends RequestOptions {
  /** Shown in the panel progress indicator while the command runs. */
  label?: string;
}
