import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../../shared/i18n";

export interface PushDialogProps {
  branchName: string;
  onClose: () => void;
  /** Resolves when the push finished; rejects with the git error on failure. */
  onPush: (force: boolean) => Promise<void>;
}

export function PushDialog({ branchName, onClose, onPush }: PushDialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest callback in a ref so a re-render cannot restart a push.
  const onPushRef = useRef(onPush);
  onPushRef.current = onPush;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pushing) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, pushing]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current && !pushing) {
        onClose();
      }
    },
    [onClose, pushing],
  );

  const handlePush = useCallback(
    async (force: boolean) => {
      setPushing(true);
      setError(null);
      try {
        await onPushRef.current(force);
        // The parent shows the result toast; close only after success.
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setPushing(false);
      }
    },
    [onClose],
  );

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      aria-busy={pushing}
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
          minWidth: 340,
          maxWidth: 460,
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
          {t("Push Branch")}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 12,
            color: "var(--description-fg)",
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          {t("Push branch '{branch}' to its remote.", {
            branch: branchName,
          })}
        </div>

        {/* In-flight / failure status */}
        {pushing && (
          <div
            className="push-dialog-status push-dialog-status--progress"
            role="status"
            aria-live="polite"
          >
            <span className="push-toast-spinner" />
            <span>
              {t("Pushing branch '{branch}'...", { branch: branchName })}
            </span>
          </div>
        )}
        {!pushing && error && (
          <div
            className="push-dialog-status push-dialog-status--error"
            role="alert"
          >
            <span style={{ fontWeight: 700 }}>!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="push-dialog-btn push-dialog-danger"
            onClick={() => handlePush(true)}
            disabled={pushing}
            style={{ fontWeight: 500 }}
          >
            {t("Force Push")}
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="push-dialog-btn push-dialog-secondary"
            onClick={onClose}
            disabled={pushing}
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            className="push-dialog-btn push-dialog-primary"
            onClick={() => handlePush(false)}
            disabled={pushing}
          >
            {pushing ? t("Pushing...") : t("Push")}
          </button>
        </div>
      </div>
    </div>
  );
}
