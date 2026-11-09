/** Default webview request timeout (local git commands are expected to be quick). */
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

/** Network git operations (push/pull/fetch) can take far longer than 10s. */
export const LONG_RUNNING_TIMEOUT_MS = 5 * 60_000;

/**
 * Commands that talk to a remote. They get the long timeout even when the
 * caller uses the plain `bridge.request()` API without options.
 */
export const LONG_RUNNING_COMMANDS = new Set<string>([
  "pushBranch",
  "executePush",
  "pullBranch",
  "pullRebase",
  "pullMerge",
  "fetchBranch",
  "fetchAll",
  "commitAndPush",
  "deleteBranch",
  "deleteRemoteBranch",
]);

export function resolveRequestTimeout(
  command: string,
  explicitTimeoutMs?: number,
): number {
  if (explicitTimeoutMs !== undefined) {
    return explicitTimeoutMs;
  }
  return LONG_RUNNING_COMMANDS.has(command)
    ? LONG_RUNNING_TIMEOUT_MS
    : DEFAULT_REQUEST_TIMEOUT_MS;
}
