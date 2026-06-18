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

async function getJson(url: string) {
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) return { url, status: res.status };
  return { url, status: 200, data: await res.json() };
}

// Inspect scoreboard + summary shapes to wire the parser correctly.
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  if (params.get("key") !== authSecret()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sb = await getJson(
    "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
  );
  const event = (sb as any)?.data?.events?.[0];
  const eventId = event?.id;
  const comp = event?.competitions?.[0];
  const sbCompetitor = comp?.competitors?.[0];

  let summary: any = { skipped: true };
  if (eventId) {
    const sm = await getJson(
      `https://site.api.espn.com/apis/site/v2/sports/golf/pga/summary?event=${eventId}`,
    );
    const data = (sm as any)?.data;
    // Try to locate the leaderboard competitors in the summary payload.
    const lbCompetitors =
      data?.leaderboard?.[0]?.players ??
      data?.competitions?.[0]?.competitors ??
      data?.leaderboard?.competitors ??
      null;
    summary = {
      status: (sm as any)?.status,
      topKeys: data ? Object.keys(data) : [],
      hasLeaderboard: Boolean(data?.leaderboard),
      leaderboardKeys: data?.leaderboard
        ? Array.isArray(data.leaderboard)
          ? `array[${data.leaderboard.length}] keys=${Object.keys(data.leaderboard[0] ?? {}).join(",")}`
          : Object.keys(data.leaderboard)
        : null,
      competitorSample: Array.isArray(lbCompetitors) ? lbCompetitors.slice(0, 2) : null,
    };
  }

  return NextResponse.json({
    eventId,
    eventName: event?.name,
    scoreboardCompetitor: sbCompetitor,
    summary,
  });
}
