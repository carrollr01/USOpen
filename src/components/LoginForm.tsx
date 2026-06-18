"use client";

import { useState, type FormEvent } from "react";

interface Player {
  username: string;
  displayName: string;
}

export function LoginForm({ players }: { players: Player[] }) {
  const [username, setUsername] = useState(players[0]?.username ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error ?? "Sign in failed");
        return;
      }
      window.location.href = "/me";
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="text-center text-lg font-bold tracking-wide text-green-700">
        U.S. OPEN POOL
      </div>
      <p className="mt-1 text-center text-sm text-gray-500">Pick 6, use 4 · live scoring</p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Your name</span>
          <select
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            {players.map((p) => (
              <option key={p.username} value={p.username}>
                {p.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </label>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-400">
        First time? Choose your name and set any password — that becomes your login.
      </p>
    </div>
  );
}
