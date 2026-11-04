/**
 * Conventional Commit type helpers for the commit message box.
 *
 * Selecting a type in the dropdown rewrites only the leading `type(scope)!:`
 * prefix, so switching feat → fix keeps the scope and the message intact.
 */

export interface CommitTypeOption {
  /** Prefix written into the message, e.g. "feat". */
  value: string;
  /** i18n key describing the type, e.g. "New feature". */
  label: string;
}

export const COMMIT_TYPES: readonly CommitTypeOption[] = [
  { value: "feat", label: "New feature" },
  { value: "fix", label: "Bug fix" },
  { value: "docs", label: "Documentation" },
  { value: "style", label: "Code style" },
  { value: "refactor", label: "Refactor" },
  { value: "perf", label: "Performance" },
  { value: "test", label: "Tests" },
  { value: "build", label: "Build" },
  { value: "ci", label: "Continuous integration" },
  { value: "chore", label: "Chores" },
  { value: "revert", label: "Revert" },
];

const PREFIX_RE = /^([a-z]+)(\([^)]*\))?(!)?:\s*/i;

function isKnownType(type: string): boolean {
  return COMMIT_TYPES.some((option) => option.value === type);
}

/** Returns the Conventional Commit type at the start of the message, if any. */
export function detectCommitType(message: string): string {
  const match = message.match(PREFIX_RE);
  if (!match) return "";
  const type = match[1].toLowerCase();
  return isKnownType(type) ? type : "";
}

/**
 * Applies a Conventional Commit type to the message.
 *
 * - `""` type removes an existing prefix.
 * - An existing known prefix is replaced, preserving `(scope)` and `!`.
 * - A message without a prefix gets `type: ` prepended.
 */
export function applyCommitType(message: string, type: string): string {
  const match = message.match(PREFIX_RE);

  if (!match) {
    return type ? `${type}: ${message}` : message;
  }

  const currentType = match[1].toLowerCase();

  // Leave unfamiliar prefixes alone (e.g. "JIRA-123: ..."); just prepend.
  if (!isKnownType(currentType)) {
    return type ? `${type}: ${message}` : message;
  }

  const scope = match[2] ?? "";
  const bang = match[3] ?? "";
  const rest = message.slice(match[0].length);

  if (!type) return rest;
  return `${type}${scope}${bang}: ${rest}`;
}
