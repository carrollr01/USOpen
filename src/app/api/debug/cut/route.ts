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

// Inspect how ESPN represents a CUT golfer in a *completed* event, so we can
// detect cuts precisely. Call: /api/debug/cut?key=<AUTH_SECRET>&dates=20250615
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  if (params.get("key") !== authSecret()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const dates = params.get("dates") ?? "20250615";
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=${dates}`,
    { headers: HEADERS, cache: "no-store" },
  );
  if (!res.ok) return NextResponse.json({ error: `ESPN ${res.status}` }, { status: 502 });
  const data = await res.json();
  const event = data?.events?.[0];
  const comp = event?.competitions?.[0];
  const competitors: any[] = comp?.competitors ?? [];

  const roundsWithHoles = (c: any) =>
    (c?.linescores ?? []).filter((r: any) => Array.isArray(r?.linescores) && r.linescores.length > 0).length;

  const hasWeekend = (c: any) =>
    (c?.linescores ?? []).some((r: any) => (r?.period ?? 0) >= 3);

  const summarize = (c: any) => ({
    name: c?.athlete?.displayName,
    order: c?.order,
    score: c?.score,
    roundsWithHoles: roundsWithHoles(c),
    hasWeekendEntry: hasWeekend(c),
    roundDisplayValues: (c?.linescores ?? []).map((r: any) => r?.displayValue),
  });

  // Actual cut players: finished some golf but have NO round-3+ entry.
  const cut = competitors.filter((c) => roundsWithHoles(c) >= 1 && !hasWeekend(c));
  const made = competitors.filter((c) => hasWeekend(c));

  return NextResponse.json({
    eventName: event?.name,
    competitionStatus: comp?.status,
    competitorCount: competitors.length,
    madeCutCount: made.length,
    cutCount: cut.length,
    madeCutSample: made.slice(0, 1).map(summarize),
    cutSummaries: cut.slice(0, 4).map(summarize),
    cutFullSample: cut.slice(0, 1),
  });
}
