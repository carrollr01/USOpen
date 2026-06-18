import { NextRequest, NextResponse } from "next/server";
import { getRawLeaderboard } from "@/lib/espn";
import { authSecret } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Inspect the raw ESPN shape to validate the parser. Call: /api/debug/espn?key=<AUTH_SECRET>
export async function GET(req: NextRequest) {
  const key = new URL(req.url).searchParams.get("key");
  if (key !== authSecret()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const raw = (await getRawLeaderboard()) as any;
    const event = raw?.events?.[0];
    const comp = event?.competitions?.[0];
    const competitors: any[] = comp?.competitors ?? [];
    return NextResponse.json({
      eventName: event?.name,
      eventStatus: comp?.status,
      competitorCount: competitors.length,
      firstCompetitorKeys: competitors[0] ? Object.keys(competitors[0]) : [],
      sample: competitors.slice(0, 4),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
