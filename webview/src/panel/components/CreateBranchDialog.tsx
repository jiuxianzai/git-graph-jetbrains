import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../../shared/i18n";

/** Common WebStorm-style branch prefixes offered in the name field. */
const BRANCH_PREFIXES = [
  "feature/",
  "bugfix/",
  "hotfix/",
  "release/",
  "chore/",
] as const;

const PREFIX_STORAGE_KEY = "jetgit.createBranchPrefix";

function splitBranchPrefix(name: string): { prefix: string; rest: string } {
  for (const prefix of BRANCH_PREFIXES) {
    if (name.startsWith(prefix)) {
      return { prefix, rest: name.slice(prefix.length) };
    }
  }
  return { prefix: "", rest: name };
}

function readStoredPrefix(): string {
  try {
    const stored = localStorage.getItem(PREFIX_STORAGE_KEY);
    if (
      stored !== null &&
      (stored === "" || (BRANCH_PREFIXES as readonly string[]).includes(stored))
    ) {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return "";
}

export interface CreateBranchDialogProps {
  /** Title shown at top, e.g. "Create Branch from dev" */
  title: string;
  /** Default value for branch name input */
  defaultName?: string;
  /** Placeholder for the input */
  placeholder?: string;
  onClose: () => void;
  /** Return a string error message to keep the dialog open and show it */
  onConfirm: (params: {
    branchName: string;
    checkout: boolean;
    force: boolean;
  }) => Promise<string | undefined>;
}

/** Custom checkbox matching commit panel style */
function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <span
      onClick={() => onChange(!checked)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 16,
        height: 16,
        borderRadius: 3,
        border: checked ? "none" : "1.5px solid var(--description-fg, #999)",
        background: checked ? "#3574f0" : "transparent",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.1s, border 0.1s",
      }}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

export function CreateBranchDialog({
  title,
  defaultName = "",
  placeholder = "branch-name",
  onClose,
  onConfirm,
}: CreateBranchDialogProps) {
  const initialName = splitBranchPrefix(defaultName);
  const [branchName, setBranchName] = useState(initialName.rest);
  // Only restore the last used prefix for brand-new branches, not when the
  // dialog was opened from an existing branch (defaultName already set).
  const [prefix, setPrefix] = useState(
    initialName.prefix || (defaultName ? "" : readStoredPrefix()),
  );
  const [checkout, setCheckout] = useState(true);
  const [force, setForce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus and select input on mount
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && !submitting) {
        handleSubmit();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  const typedName = branchName.trim();
  // A name typed with a slash is treated as a full path; otherwise the
  // selected prefix is prepended (feature/ + login → feature/login).
  const effectiveName = typedName.includes("/")
    ? typedName
    : `${prefix}${typedName}`;

  const handleSubmit = useCallback(async () => {
    if (!typedName) return;
    setError(null);
    setSubmitting(true);
    try {
      const errMsg = await onConfirm({
        branchName: effectiveName,
        checkout,
        force,
      });
      if (errMsg) {
        setError(errMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [typedName, effectiveName, checkout, force, onConfirm]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.4)",
      }}
    >
      <div
        style={{
          background: "var(--vscode-editorWidget-background, #252526)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "16px 20px",
          minWidth: 380,
          maxWidth: 500,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 12,
            color: "var(--app-fg)",
          }}
        >
          {title}
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              background:
                "var(--vscode-inputValidation-errorBackground, #5a1d1d)",
              border:
                "1px solid var(--vscode-inputValidation-errorBorder, #be1100)",
              borderRadius: 4,
              padding: "8px 10px",
              marginBottom: 12,
              fontSize: 12,
              color: "var(--vscode-errorForeground, #f48771)",
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}

        {/* Branch Name Input */}
        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor="branch-name-input"
            style={{
              display: "block",
              fontSize: 12,
              color: "var(--description-fg)",
              marginBottom: 4,
            }}
          >
            {t("Branch Name:")}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <select
              aria-label={t("Branch prefix")}
              title={t("Branch prefix")}
              value={prefix}
              onChange={(e) => {
                const next = e.target.value;
                setPrefix(next);
                setError(null);
                try {
                  localStorage.setItem(PREFIX_STORAGE_KEY, next);
                } catch {
                  // localStorage unavailable
                }
              }}
              style={{
                maxWidth: 108,
                height: 28,
                background: "var(--input-bg)",
                color: "var(--input-fg)",
                border: "1px solid var(--input-border)",
                borderRadius: 4,
                padding: "0 4px",
                fontSize: 12,
                fontFamily: "var(--font-family)",
                outline: "none",
                flexShrink: 0,
              }}
            >
              <option value="">{t("None")}</option>
              {BRANCH_PREFIXES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input
              ref={inputRef}
              id="branch-name-input"
              type="text"
              value={branchName}
              onChange={(e) => {
                setBranchName(e.target.value);
                setError(null);
              }}
              placeholder={placeholder}
              style={{
                flex: 1,
                minWidth: 0,
                background: "var(--input-bg)",
                color: "var(--input-fg)",
                border: error
                  ? "1px solid var(--vscode-inputValidation-errorBorder, #be1100)"
                  : "1px solid var(--input-border)",
                borderRadius: 4,
                padding: "4px 8px",
                fontSize: "var(--font-size)",
                fontFamily: "var(--font-family)",
                outline: "none",
                height: 28,
              }}
            />
          </div>
          {prefix && typedName && !typedName.includes("/") && (
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: "var(--description-fg)",
                opacity: 0.75,
              }}
            >
              {t("New branch: {name}", { name: effectiveName })}
            </div>
          )}
        </div>

        {/* Checkboxes */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <Checkbox checked={checkout} onChange={(v) => setCheckout(v)} />
            {t("Checkout branch")}
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <Checkbox
              checked={force}
              onChange={(v) => {
                setForce(v);
                setError(null);
              }}
            />
            {t("Overwrite existing branch")}
          </label>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--vscode-button-secondaryBackground, #3a3d41)",
              color: "var(--vscode-button-secondaryForeground, var(--app-fg))",
              border: "none",
              borderRadius: 4,
              padding: "4px 14px",
              fontSize: 12,
              height: 28,
              cursor: "pointer",
            }}
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!typedName || submitting}
            style={{
              background: "var(--button-bg)",
              color: "var(--button-fg)",
              border: "none",
              borderRadius: 4,
              padding: "4px 14px",
              fontSize: 12,
              height: 28,
              cursor: typedName && !submitting ? "pointer" : "default",
              opacity: typedName && !submitting ? 1 : 0.4,
            }}
          >
            {t("Create")}
          </button>
        </div>
      </div>
    </div>
  );
}
