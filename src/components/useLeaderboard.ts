"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LeaderboardResponse } from "@/lib/types";

const POLL_MS = 30_000;

export function useLeaderboard() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = (await res.json()) as LeaderboardResponse;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const schedule = () => {
      timer.current = setTimeout(async () => {
        await load();
        schedule();
      }, POLL_MS);
    };
    schedule();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  return { data, error, loading, refreshing, refresh: load };
}
