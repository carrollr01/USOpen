import type { EspnGolfer, EventMeta, GolferStatus } from "./types";

const LEADERBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard";

// ESPN occasionally 403s requests without a browser-like User-Agent.
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: "https://www.espn.com/golf/leaderboard",
};

export interface ParsedLeaderboard {
  event: EventMeta | null;
  golfers: EspnGolfer[];
  fetchedAt: number;
}

// Small in-memory cache so polling clients don't hammer ESPN.
const CACHE_TTL_MS = 25_000;
let cache: ParsedLeaderboard | null = null;
let inflight: Promise<ParsedLeaderboard> | null = null;

export async function getLeaderboard(force = false): Promise<ParsedLeaderboard> {
  const now = Date.now();
  if (!force && cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(LEADERBOARD_URL, {
        headers: FETCH_HEADERS,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`ESPN responded ${res.status}`);
      const data = await res.json();
      const parsed = parseLeaderboard(data);
      cache = parsed;
      return parsed;
    } catch (err) {
      // On failure, serve stale cache if we have it.
      if (cache) return cache;
      throw err;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

// Fetch the raw JSON (used by the debug route to inspect ESPN's shape).
export async function getRawLeaderboard(): Promise<unknown> {
  const res = await fetch(LEADERBOARD_URL, { headers: FETCH_HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`ESPN responded ${res.status}`);
  return res.json();
}

function parseLeaderboard(data: any): ParsedLeaderboard {
  const event = data?.events?.[0];
  const competition = event?.competitions?.[0];
  const statusType = competition?.status?.type ?? {};

  const meta: EventMeta | null = event
    ? {
        name: event.name ?? event.shortName ?? "Tournament",
        shortName: event.shortName ?? event.name ?? "",
        detail: statusType.detail ?? statusType.shortDetail ?? statusType.description ?? "",
        state: statusType.state ?? "pre",
        completed: Boolean(statusType.completed),
        round: numberOrNull(competition?.status?.period),
        cutLine: extractCutLine(event, competition),
      }
    : null;

  const competitors: any[] = competition?.competitors ?? [];
  const golfers: EspnGolfer[] = competitors.map((c) => parseCompetitor(c, meta?.round ?? null));

  return { event: meta, golfers, fetchedAt: Date.now() };
}

function parseCompetitor(c: any, round: number | null): EspnGolfer {
  const athlete = c?.athlete ?? {};
  const status = c?.status ?? {};

  const toPar = parseScore(c?.score) ?? parseFromStatistics(c?.statistics);
  const statusKind = classifyStatus(c);
  const thru = parseThru(status, statusKind);
  const today = parseToday(c, round);

  return {
    id: String(c?.id ?? athlete?.id ?? cryptoIshId(athlete?.displayName)),
    name: athlete?.displayName ?? athlete?.shortName ?? "Unknown",
    toPar,
    status: statusKind,
    positionDisplay:
      statusKind === "cut"
        ? "CUT"
        : status?.position?.displayName ?? (toPar === null ? "—" : ""),
    thru,
    today,
    teeTime: typeof status?.teeTime === "string" ? status.teeTime : null,
  };
}

// --- score parsing -------------------------------------------------------

function parseScore(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object") {
    if (typeof v.value === "number") return v.value;
    if (typeof v.displayValue === "string") return parseToParString(v.displayValue);
  }
  if (typeof v === "string") return parseToParString(v);
  return null;
}

function parseToParString(s: string): number | null {
  const t = s.trim().toUpperCase();
  if (t === "" || t === "--" || t === "-") return null;
  if (t === "E" || t === "EVEN" || t === "PAR") return 0;
  const n = Number(t.replace(/^\+/, ""));
  return Number.isFinite(n) ? n : null;
}

function parseFromStatistics(stats: any): number | null {
  if (!Array.isArray(stats)) return null;
  const wanted = ["scoretopar", "topar", "total", "score"];
  for (const name of wanted) {
    const stat = stats.find((s) => String(s?.name ?? "").toLowerCase() === name);
    if (stat) {
      if (typeof stat.value === "number") return stat.value;
      const parsed = parseToParString(String(stat.displayValue ?? ""));
      if (parsed !== null) return parsed;
    }
  }
  return null;
}

function parseToday(c: any, round: number | null): number | null {
  const stats = c?.statistics;
  if (Array.isArray(stats)) {
    const stat = stats.find((s) => ["today", "rounds"].includes(String(s?.name ?? "").toLowerCase()));
    if (stat) {
      if (typeof stat.value === "number") return stat.value;
      const parsed = parseToParString(String(stat.displayValue ?? ""));
      if (parsed !== null) return parsed;
    }
  }
  return null;
}

// --- status / position ---------------------------------------------------

function classifyStatus(c: any): GolferStatus {
  const candidates: string[] = [];
  const s = c?.status ?? {};
  push(candidates, s?.type?.name);
  push(candidates, s?.type?.description);
  push(candidates, s?.type?.detail);
  push(candidates, s?.type?.shortDetail);
  push(candidates, s?.position?.displayName);
  push(candidates, s?.displayValue);
  push(candidates, c?.statusType);
  const blob = candidates.join(" | ").toLowerCase();

  if (/\bdq\b|disqualif/.test(blob)) return "dq";
  if (/\bwd\b|withdr/.test(blob)) return "wd";
  if (/\bcut\b|missed cut|\bmc\b/.test(blob)) return "cut";
  return "active";
}

function parseThru(status: any, kind: GolferStatus): string {
  if (kind === "cut" || kind === "wd" || kind === "dq") return "—";
  const thru = status?.thru;
  const completed = Boolean(status?.type?.completed);
  if (typeof thru === "number") {
    if (thru >= 18 || (completed && thru === 0)) return "F";
    if (thru === 0) return status?.teeTime ? formatTee(status.teeTime) : "—";
    return String(thru);
  }
  if (typeof status?.displayThru === "string" && status.displayThru.trim()) {
    return status.displayThru.trim();
  }
  if (completed) return "F";
  return status?.teeTime ? formatTee(status.teeTime) : "—";
}

function formatTee(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    });
  } catch {
    return "—";
  }
}

// --- misc ----------------------------------------------------------------

function extractCutLine(event: any, competition: any): number | null {
  const candidates = [event?.cutLine, competition?.cutLine, event?.cut?.value];
  for (const c of candidates) {
    const n = numberOrNull(c);
    if (n !== null) return n;
  }
  return null;
}

function numberOrNull(v: any): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function push(arr: string[], v: any) {
  if (typeof v === "string" && v.trim()) arr.push(v);
}

function cryptoIshId(name: string | undefined): string {
  return (name ?? "unknown").toLowerCase().replace(/[^a-z]/g, "");
}
