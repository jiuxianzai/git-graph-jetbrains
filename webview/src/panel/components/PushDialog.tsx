import { useCallback, useEffect, useRef } from "react";
import { t } from "../../shared/i18n";

export interface PushDialogProps {
  branchName: string;
  onClose: () => void;
  onPush: (force: boolean) => void;
}

export function PushDialog({ branchName, onClose, onPush }: PushDialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
          {t("Push branch '{branch}' to remote 'origin'.", {
            branch: branchName,
          })}
        </div>

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
            onClick={() => onPush(true)}
            style={{ fontWeight: 500 }}
          >
            {t("Force Push")}
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="push-dialog-btn push-dialog-secondary"
            onClick={onClose}
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            className="push-dialog-btn push-dialog-primary"
            onClick={() => onPush(false)}
          >
            {t("Push")}
          </button>
        </div>
      </div>
    </div>
  );
}
