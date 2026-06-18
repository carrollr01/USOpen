import type { EspnGolfer, EventMeta, GolferStatus } from "./types";

// ESPN's public PGA scoreboard. (The /leaderboard and /summary paths 404/502;
// the scoreboard carries the full field with per-round, per-hole linescores.)
const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard";

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

const CACHE_TTL_MS = 25_000;
let cache: ParsedLeaderboard | null = null;
let inflight: Promise<ParsedLeaderboard> | null = null;

export async function getLeaderboard(force = false): Promise<ParsedLeaderboard> {
  const now = Date.now();
  if (!force && cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(SCOREBOARD_URL, { headers: FETCH_HEADERS, cache: "no-store" });
      if (!res.ok) throw new Error(`ESPN responded ${res.status}`);
      const data = await res.json();
      const parsed = parseLeaderboard(data);
      cache = parsed;
      return parsed;
    } catch (err) {
      if (cache) return cache; // serve stale on failure
      throw err;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

// --- parsing -------------------------------------------------------------

function parseLeaderboard(data: any): ParsedLeaderboard {
  const event = data?.events?.[0];
  const comp = event?.competitions?.[0];
  const statusType = comp?.status?.type ?? {};
  const round = numberOrNull(comp?.status?.period);

  const meta: EventMeta | null = event
    ? {
        name: event.name ?? event.shortName ?? "Tournament",
        shortName: event.shortName ?? event.name ?? "",
        detail: statusType.detail ?? statusType.shortDetail ?? statusType.description ?? "",
        state: statusType.state ?? "pre",
        completed: Boolean(statusType.completed),
        round,
        cutLine: null,
      }
    : null;

  const competitors: any[] = comp?.competitors ?? [];
  const golfers = competitors.map((c) => parseCompetitor(c, round));
  assignPositions(golfers);

  return { event: meta, golfers, fetchedAt: Date.now() };
}

function parseCompetitor(c: any, round: number | null): EspnGolfer {
  const athlete = c?.athlete ?? {};
  const name: string = athlete.displayName ?? athlete.fullName ?? athlete.shortName ?? "Unknown";
  const id = String(c?.id ?? athlete?.id ?? name.toLowerCase().replace(/[^a-z]/g, ""));
  const rawScore = typeof c?.score === "string" ? c.score : c?.score?.displayValue ?? "";
  const rounds: any[] = Array.isArray(c?.linescores) ? c.linescores : [];

  // Total score to par: prefer ESPN's running `score`; fall back to summing rounds.
  let toPar = parseToParString(rawScore);
  if (toPar === null) toPar = sumRoundsToPar(rounds);

  const { holesPlayed } = latestActivity(rounds);
  const completedRounds = rounds.filter((r) => holesIn(r) >= 18).length;
  const hasWeekendEntry = rounds.some((r) => (r?.period ?? 0) >= 3);

  // Cut / WD / DQ detection.
  //  1. ESPN may mark the score string "CUT" / "WD" / "DQ" once posted.
  //  2. Structural: once the weekend (round >= 3) is under way, a golfer who
  //     finished 36 holes but has no round-3 entry has missed the cut.
  // (Verified against live data at Friday's cut; logic is centralized here.)
  let status: GolferStatus = "active";
  if (/\b(wd|withdr)\b/i.test(rawScore)) status = "wd";
  else if (/\b(dq|dsq|disq)\b/i.test(rawScore)) status = "dq";
  else if (/\b(cut|mc)\b/i.test(rawScore)) status = "cut";
  else if ((round ?? 0) >= 3 && completedRounds >= 2 && !hasWeekendEntry) status = "cut";

  const isOut = status !== "active";

  let thru: string;
  if (isOut) thru = "—";
  else if (holesPlayed >= 18) thru = "F";
  else if (holesPlayed > 0) thru = String(holesPlayed);
  else thru = ""; // not started yet — tee time shown separately

  const todayRound = rounds.find((r) => r?.period === round);
  const today = todayRound ? parseToParString(todayRound.displayValue) : null;

  return {
    id,
    name,
    toPar,
    status,
    positionDisplay: "",
    thru,
    today,
    teeTime: teeLabel(rounds),
  };
}

// Rank active, scored golfers; ties share a position ("T5"). Out players get
// their status label; not-yet-started players get "—".
function assignPositions(golfers: EspnGolfer[]): void {
  const ranked = golfers
    .filter((g) => g.status === "active" && g.toPar !== null)
    .sort((a, b) => (a.toPar as number) - (b.toPar as number));

  const posByToPar = new Map<number, number>();
  ranked.forEach((g, i) => {
    const tp = g.toPar as number;
    if (!posByToPar.has(tp)) posByToPar.set(tp, i + 1);
  });
  const counts = new Map<number, number>();
  for (const g of ranked) counts.set(g.toPar as number, (counts.get(g.toPar as number) ?? 0) + 1);

  for (const g of golfers) {
    if (g.status === "cut") g.positionDisplay = "CUT";
    else if (g.status === "wd") g.positionDisplay = "WD";
    else if (g.status === "dq") g.positionDisplay = "DQ";
    else if (g.toPar === null) g.positionDisplay = "—";
    else {
      const pos = posByToPar.get(g.toPar) ?? 0;
      const tied = (counts.get(g.toPar) ?? 0) > 1;
      g.positionDisplay = `${tied ? "T" : ""}${pos}`;
    }
  }
}

// --- helpers -------------------------------------------------------------

function parseToParString(s: any): number | null {
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  if (typeof s !== "string") return null;
  const t = s.trim().toUpperCase();
  if (t === "" || t === "--" || t === "-" || /[A-Z]/.test(t.replace(/^E$/, ""))) {
    return t === "E" || t === "EVEN" || t === "PAR" ? 0 : null;
  }
  if (t === "E") return 0;
  const n = Number(t.replace(/^\+/, ""));
  return Number.isFinite(n) ? n : null;
}

function sumRoundsToPar(rounds: any[]): number | null {
  let sum = 0;
  let counted = 0;
  for (const r of rounds) {
    const v = parseToParString(r?.displayValue);
    if (v !== null && holesIn(r) > 0) {
      sum += v;
      counted++;
    }
  }
  return counted > 0 ? sum : null;
}

function holesIn(round: any): number {
  return Array.isArray(round?.linescores) ? round.linescores.length : 0;
}

function latestActivity(rounds: any[]): { holesPlayed: number; period: number } {
  let best = { holesPlayed: 0, period: 0 };
  for (const r of rounds) {
    const holes = holesIn(r);
    const period = r?.period ?? 0;
    if (holes > 0 && period >= best.period) best = { holesPlayed: holes, period };
  }
  return best;
}

// The per-round statistics carry a tee-time string like "Thu Jun 18 08:35:00 PDT 2026".
function teeRaw(rounds: any[]): string | null {
  for (const r of rounds) {
    const stats = r?.statistics?.categories?.[0]?.stats;
    if (Array.isArray(stats)) {
      for (const s of stats) {
        const dv = s?.displayValue;
        if (typeof dv === "string" && /\d{1,2}:\d{2}/.test(dv) && /\d{4}/.test(dv)) return dv;
      }
    }
  }
  return null;
}

// ESPN's tee string (e.g. "Thu Jun 18 08:35:00 PDT 2026") already carries the
// venue-local wall-clock time, so take the clock as-is — no timezone math.
function teeLabel(rounds: any[]): string | null {
  const raw = teeRaw(rounds);
  if (!raw) return null;
  const m = raw.match(/\b(\d{1,2}):(\d{2}):\d{2}\b/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = ((h + 11) % 12) + 1;
  return `${h}:${min} ${ampm}`;
}

function numberOrNull(v: any): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
