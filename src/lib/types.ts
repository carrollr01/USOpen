export type GolferStatus = "active" | "cut" | "wd" | "dq" | "unknown";

// A golfer as parsed from the live ESPN leaderboard.
export interface EspnGolfer {
  id: string;
  name: string;
  toPar: number | null; // total score relative to par; null if unknown / not started
  status: GolferStatus;
  positionDisplay: string; // e.g. "T5", "CUT", "—"
  thru: string; // holes through: "12", "F", "—"
  today: number | null; // today's score relative to par
  teeTime: string | null; // ISO tee time when not yet started
}

export interface EventMeta {
  name: string;
  shortName: string;
  detail: string; // e.g. "Round 1 - In Progress", "Final"
  state: string; // "pre" | "in" | "post"
  completed: boolean;
  round: number | null;
  cutLine: number | null;
}

// One of a user's 6 golfers, after scoring rules are applied.
export interface ScoredGolfer {
  name: string;
  found: boolean; // matched to a golfer in the live field
  status: GolferStatus;
  positionDisplay: string;
  thru: string;
  toPar: number | null; // raw score to par
  today: number | null;
  effective: number | null; // score used for the team total (incl. cut penalty)
  counted: boolean; // is this one of the best-4 that count
  teeTime: string | null;
}

export interface TeamStanding {
  username: string;
  displayName: string;
  position: number; // numeric rank (ties share a number)
  positionDisplay: string; // "1", "T2", ...
  teamTotal: number; // sum of counting golfers' effective scores
  golfers: ScoredGolfer[];
  golfersStarted: number;
  golfersComplete: number;
}

export interface LeaderboardResponse {
  event: EventMeta | null;
  standings: TeamStanding[];
  updatedAt: string; // ISO timestamp
  source: "live" | "unavailable";
  message?: string;
}
