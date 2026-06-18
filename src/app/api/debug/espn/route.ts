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

const CANDIDATES = [
  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard",
  "https://site.web.api.espn.com/apis/v2/sports/golf/pga/scoreboard",
  "https://site.web.api.espn.com/apis/v2/sports/golf/leaderboard",
];

function trimCompetitor(c: any) {
  return {
    keys: c ? Object.keys(c) : [],
    id: c?.id,
    athlete: c?.athlete ? { id: c.athlete.id, displayName: c.athlete.displayName } : undefined,
    score: c?.score,
    statusKeys: c?.status ? Object.keys(c.status) : [],
    status: c?.status,
    statistics: c?.statistics,
    linescores: c?.linescores,
  };
}

// Probe ESPN golf endpoints to find the right one and inspect the JSON shape.
// /api/debug/espn?key=<AUTH_SECRET>           -> probes all candidates
// /api/debug/espn?key=...&url=<espn url>      -> probes one URL, full sample
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  if (params.get("key") !== authSecret()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const override = params.get("url");
  const urls = override && /^https:\/\/[^/]*espn\.com\//.test(override) ? [override] : CANDIDATES;

  const results: any[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
      const ok = res.ok;
      let info: any = { url, status: res.status };
      if (ok) {
        const data: any = await res.json();
        const event = data?.events?.[0];
        const comp = event?.competitions?.[0];
        const competitors: any[] = comp?.competitors ?? [];
        info = {
          ...info,
          topKeys: Object.keys(data ?? {}),
          eventName: event?.name,
          eventShort: event?.shortName,
          competitionStatus: comp?.status,
          competitorCount: competitors.length,
          sample: competitors.slice(0, 3).map(trimCompetitor),
        };
      }
      results.push(info);
      if (ok && !override) break; // first working candidate is enough
    } catch (err) {
      results.push({ url, error: err instanceof Error ? err.message : "fetch failed" });
    }
  }

  return NextResponse.json({ results });
}
