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

  const summarize = (c: any) => ({
    name: c?.athlete?.displayName,
    order: c?.order,
    competitorKeys: c ? Object.keys(c) : [],
    score: c?.score,
    status: c?.status ?? null,
    type: c?.type ?? null,
    roundsWithHoles: roundsWithHoles(c),
    roundDisplayValues: (c?.linescores ?? []).map((r: any) => r?.displayValue),
  });

  // Players who only played 2 rounds are the cut ones — dump them fully.
  const cut = competitors
    .filter((c) => {
      const r = roundsWithHoles(c);
      return r > 0 && r <= 2;
    })
    .slice(0, 2);

  return NextResponse.json({
    eventName: event?.name,
    competitionStatus: comp?.status,
    competitorCount: competitors.length,
    winner: competitors.slice(0, 1).map(summarize),
    cutSummaries: cut.map(summarize),
    cutFullSample: cut.slice(0, 1),
  });
}
