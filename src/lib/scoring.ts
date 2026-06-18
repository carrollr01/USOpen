import { COUNTING_GOLFERS, CUT_PENALTY } from "./roster";
import { matchGolfer } from "./match";
import type { EspnGolfer, ScoredGolfer, TeamStanding } from "./types";

export interface UserPicks {
  username: string;
  display_name: string;
  golfers: string[];
}

function scoreGolfer(pickedName: string, field: EspnGolfer[]): ScoredGolfer {
  const g = matchGolfer(pickedName, field);
  if (!g) {
    return {
      name: pickedName,
      found: false,
      status: "unknown",
      positionDisplay: "—",
      thru: "—",
      toPar: null,
      today: null,
      effective: null,
      counted: false,
      teeTime: null,
    };
  }

  const isCut = g.status === "cut" || g.status === "wd" || g.status === "dq";
  // Cut/WD/DQ: golfer's score at the cut PLUS a 20-stroke penalty.
  const effective =
    g.toPar === null ? null : isCut ? g.toPar + CUT_PENALTY : g.toPar;

  return {
    name: g.name,
    found: true,
    status: g.status,
    positionDisplay: g.positionDisplay,
    thru: g.thru,
    toPar: g.toPar,
    today: g.today,
    effective,
    counted: false,
    teeTime: g.teeTime,
  };
}

export function buildTeam(user: UserPicks, field: EspnGolfer[]): TeamStanding {
  const golfers = user.golfers.map((name) => scoreGolfer(name, field));

  // The best COUNTING_GOLFERS scores (lowest effective) count toward the total.
  const scorable = golfers
    .map((g, idx) => ({ idx, effective: g.effective }))
    .filter((x): x is { idx: number; effective: number } => x.effective !== null)
    .sort((a, b) => a.effective - b.effective);

  const counting = scorable.slice(0, COUNTING_GOLFERS);
  for (const c of counting) golfers[c.idx].counted = true;
  const teamTotal = counting.reduce((sum, c) => sum + c.effective, 0);

  return {
    username: user.username,
    displayName: user.display_name,
    position: 0,
    positionDisplay: "",
    teamTotal,
    golfers,
    golfersStarted: golfers.filter((g) => g.found && g.toPar !== null).length,
    golfersComplete: golfers.filter(
      (g) => g.thru === "F" || g.status === "cut" || g.status === "wd" || g.status === "dq",
    ).length,
  };
}

export function buildStandings(users: UserPicks[], field: EspnGolfer[]): TeamStanding[] {
  const teams = users.map((u) => buildTeam(u, field));

  // Rank by team total ascending (lower is better).
  teams.sort((a, b) => a.teamTotal - b.teamTotal || a.displayName.localeCompare(b.displayName));

  let lastTotal: number | null = null;
  let lastPos = 0;
  teams.forEach((t, i) => {
    if (lastTotal === null || t.teamTotal !== lastTotal) {
      lastPos = i + 1;
      lastTotal = t.teamTotal;
    }
    t.position = lastPos;
  });

  // Mark ties with a leading "T".
  const counts = new Map<number, number>();
  for (const t of teams) counts.set(t.position, (counts.get(t.position) ?? 0) + 1);
  for (const t of teams) {
    const tied = (counts.get(t.position) ?? 0) > 1;
    t.positionDisplay = `${tied ? "T" : ""}${t.position}`;
  }

  return teams;
}
