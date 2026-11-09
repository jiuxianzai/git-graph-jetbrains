import { resolveRequestTimeout } from "./timeouts";
import type {
  Bridge,
  EventMessage,
  RequestMessage,
  RequestOptions,
  ResponseMessage,
} from "./types";

declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

export function createVSCodeBridge(): Bridge {
  const vscode = acquireVsCodeApi();
  const pendingRequests = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  const eventHandlers = new Set<(event: string, data: unknown) => void>();

  window.addEventListener("message", (e: MessageEvent) => {
    const msg = e.data;
    if (msg.type === "response") {
      const resp = msg as ResponseMessage;
      const pending = pendingRequests.get(resp.id);
      if (pending) {
        pendingRequests.delete(resp.id);
        if (resp.success) {
          pending.resolve(resp.data);
        } else {
          pending.reject(new Error(resp.error?.message ?? "Unknown error"));
        }
      }
    } else if (msg.type === "event") {
      const evt = msg as EventMessage;
      for (const h of eventHandlers) {
        h(evt.event, evt.data);
      }
    }
  });

  return {
    request(command, params = {}, options: RequestOptions = {}) {
      return new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        const timeoutMs = resolveRequestTimeout(command, options.timeoutMs);
        const timeout =
          timeoutMs > 0
            ? setTimeout(() => {
                pendingRequests.delete(id);
                reject(
                  new Error(
                    `Request '${command}' timed out after ${Math.round(
                      timeoutMs / 1000,
                    )}s`,
                  ),
                );
              }, timeoutMs)
            : undefined;

        pendingRequests.set(id, {
          resolve: (v) => {
            if (timeout) clearTimeout(timeout);
            resolve(v);
          },
          reject: (e) => {
            if (timeout) clearTimeout(timeout);
            reject(e);
          },
        });

        const msg: RequestMessage = { type: "request", id, command, params };
        vscode.postMessage(msg);
      });
    },
    onEvent(handler) {
      eventHandlers.add(handler);
      return () => {
        eventHandlers.delete(handler);
      };
    },
  };
}
