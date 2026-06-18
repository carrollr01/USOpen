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

async function probe(url: string) {
  try {
    const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
    if (!res.ok) return { url, status: res.status };
    const text = await res.text();
    let topKeys: string[] = [];
    try {
      topKeys = Object.keys(JSON.parse(text));
    } catch {
      /* ignore */
    }
    return { url, status: 200, topKeys, length: text.length, snippet: text.slice(0, 3500) };
  } catch (err) {
    return { url, error: err instanceof Error ? err.message : "fetch failed" };
  }
}

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  if (params.get("key") !== authSecret()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const override = params.get("url");
  const targets = override
    ? [override]
    : [
        "https://cdn.espn.com/core/golf/leaderboard?xhr=1",
        "https://site.api.espn.com/apis/site/v2/sports/golf/pga/summary?event=401811952",
      ];
  const results = [];
  for (const t of targets) results.push(await probe(t));
  return NextResponse.json({ results });
}
