import { useCallback, useEffect, useState } from 'react';
import { EXTENSION_IDS } from '@/config';
import type { ExtensionStatus, ExternalMessage } from './messages';

type ChromeRuntime = {
  sendMessage: (id: string, message: unknown, callback: (response: unknown) => void) => void;
  lastError?: unknown;
};

/* chrome.runtime only appears on this page when an installed extension lists the site
   in externally_connectable, so its absence means the extension isn't installed. */
const runtime = (): ChromeRuntime | undefined => (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;

function sendTo(id: string, message: ExternalMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const rt = runtime();
    if (!rt?.sendMessage) return resolve(undefined);
    try {
      rt.sendMessage(id, message, (response) => {
        void rt.lastError; // reading it silences the "receiving end does not exist" warning
        resolve(response);
      });
    } catch {
      resolve(undefined);
    }
  });
}

let activeId: string | undefined;

export async function sendToExtension<T>(message: ExternalMessage): Promise<T | undefined> {
  for (const id of activeId ? [activeId] : EXTENSION_IDS) {
    const response = await sendTo(id, message);
    if (response !== undefined) {
      activeId = id;
      return response as T;
    }
  }
  return undefined;
}

export async function extensionStatus(): Promise<ExtensionStatus> {
  const status = await sendToExtension<ExtensionStatus>({ type: 'status' });
  return status ?? { installed: false, signedIn: false };
}

export function useExtension() {
  const [status, setStatus] = useState<ExtensionStatus>();
  const refresh = useCallback(() => extensionStatus().then(setStatus), []);
  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);
  return { status, refresh };
}

export async function connectExtension(email: string, password: string) {
  return sendToExtension<{ ok: boolean; error?: string }>({ type: 'connect', email, password });
}

export async function startSync() {
  return sendToExtension<{ ok: boolean; error?: string }>({ type: 'sync:start' });
}
