"use client";
import { useAuth } from "./useAuth";
import { useCallback, useRef } from "react";

/** A failed request. `body` is the server's JSON, so a caller can read a `code` as well as the message. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body: Record<string, unknown>) { super(message); }
}

/** fetch wrapper that attaches the Privy access token. The returned function never changes identity. */
export function useApi() {
  const { getAccessToken } = useAuth();
  const ref = useRef(getAccessToken);
  ref.current = getAccessToken;
  return useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const token = await ref.current();
    const res = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}), authorization: `Bearer ${token}` },
    });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new ApiError((body as { error?: string }).error ?? `HTTP ${res.status}`, res.status, body); }
    return res.json() as Promise<T>;
  }, []);
}
