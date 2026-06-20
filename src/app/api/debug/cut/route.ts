import { NextRequest, NextResponse } from "next/server";
import { authSecret } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: "https://www.espn.com/golf/leaderboard",
};

const toPar = (s: any) => {
  if (typeof s !== "string") return null;
  const t = s.trim().toUpperCase();
  if (t === "E") return 0;
  const n = Number(t.replace("+", ""));
  return Number.isFinite(n) ? n : null;
};

export async function GET(req: NextRequest) {
  if (new URL(req.url).searchParams.get("key") !== authSecret()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sbRes = await fetch(
    "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
    { headers: HEADERS, cache: "no-store" },
  );
  const sb = await sbRes.json();
  const event = sb?.events?.[0];
  const comp = event?.competitions?.[0];
  const competitors: any[] = comp?.competitors ?? [];

  const periods = (c: any) => (c?.linescores ?? []).map((r: any) => r?.period);
  const holesInPeriod = (c: any, p: number) => {
    const r = (c?.linescores ?? []).find((x: any) => x?.period === p);
    return Array.isArray(r?.linescores) ? r.linescores.length : 0;
  };
  const hasP3Entry = (c: any) => (c?.linescores ?? []).some((r: any) => r?.period === 3);
  const hasP3Holes = (c: any) => holesInPeriod(c, 3) > 0;

  // Try the summary endpoint too (often carries explicit cut status).
  let summary: any = { tried: false };
  if (event?.id) {
    try {
      const r = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/golf/pga/summary?event=${event.id}`,
        { headers: HEADERS, cache: "no-store" },
      );
      summary = { tried: true, status: r.status };
      if (r.ok) {
        const d = await r.json();
        summary.topKeys = Object.keys(d ?? {});
        const players =
          d?.leaderboard?.[0]?.players ?? d?.competitions?.[0]?.competitors ?? null;
        summary.playerSample = Array.isArray(players) ? players.slice(0, 2) : null;
      }
    } catch (e) {
      summary = { tried: true, error: String(e) };
    }
  }

  const sorted = [...competitors].sort((a, b) => (toPar(a?.score) ?? 99) - (toPar(b?.score) ?? 99));

  return NextResponse.json({
    eventKeys: event ? Object.keys(event) : [],
    competitionKeys: comp ? Object.keys(comp) : [],
    status: comp?.status,
    notes: comp?.notes ?? event?.notes ?? null,
    cutCandidates: {
      eventCutLine: event?.cutLine,
      compCutLine: comp?.cutLine,
      compCut: comp?.cut,
    },
    counts: {
      total: competitors.length,
      withP3Entry: competitors.filter(hasP3Entry).length,
      withP3Holes: competitors.filter(hasP3Holes).length,
    },
    worst5: sorted.slice(-5).map((c) => ({
      name: c?.athlete?.displayName,
      score: c?.score,
      periods: periods(c),
      p3Holes: holesInPeriod(c, 3),
    })),
    summary,
  });
}
