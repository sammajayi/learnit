"use client";
import { useAuth } from "./useAuth";
import { useCallback, useRef } from "react";

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
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
    return res.json() as Promise<T>;
  }, []);
}
