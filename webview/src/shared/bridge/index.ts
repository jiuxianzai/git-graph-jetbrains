import type { Bridge, ProgressOptions } from "./types";
import { createVSCodeBridge } from "./vscode-bridge";

export const bridge: Bridge = createVSCodeBridge();

export { LONG_RUNNING_TIMEOUT_MS } from "./timeouts";

/**
 * Execute a bridge request with progress indicator.
 * Sets operationInProgress=true immediately, resets on completion.
 * Minimum display time of 1s to ensure the animation is visible.
 */
export async function bridgeWithProgress(
  command: string,
  params?: Record<string, unknown>,
  options: ProgressOptions = {},
): Promise<unknown> {
  const { usePanelStore } = await import("../store/panel-store");
  usePanelStore.setState({
    operationInProgress: true,
    operationLabel: options.label ?? null,
  });
  const start = Date.now();
  try {
    const result = await bridge.request(command, params, {
      timeoutMs: options.timeoutMs,
    });
    const elapsed = Date.now() - start;
    if (elapsed < 1000) {
      await new Promise((r) => setTimeout(r, 1000 - elapsed));
    }
    return result;
  } finally {
    usePanelStore.setState({
      operationInProgress: false,
      operationLabel: null,
    });
  }
}

export type {
  Bridge,
  EventMessage,
  ProgressOptions,
  RequestMessage,
  RequestOptions,
  ResponseMessage,
} from "./types";
