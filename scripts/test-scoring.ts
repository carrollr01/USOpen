// Offline validation of the matching + scoring pipeline against a mock field.
// Run: npx tsx scripts/test-scoring.ts
import { ROSTER } from "../src/lib/roster";
import { buildStandings, type UserPicks } from "../src/lib/scoring";
import { formatToPar } from "../src/lib/format";
import type { EspnGolfer, GolferStatus } from "../src/lib/types";

function g(
  name: string,
  toPar: number | null,
  status: GolferStatus = "active",
  thru = "F",
): EspnGolfer {
  return {
    id: name.toLowerCase().replace(/\s/g, ""),
    name,
    toPar,
    status,
    positionDisplay: status === "cut" ? "CUT" : "T1",
    thru,
    today: null,
    teeTime: null,
  };
}

// Mock live field. Includes Matt Fitzpatrick as a decoy (must NOT be picked),
// an accented Hojgaard, and a cut player (Jason Day) to exercise the +20 rule.
const field: EspnGolfer[] = [
  g("Scottie Scheffler", -6),
  g("Russell Henley", -3),
  g("Jordan Spieth", 1),
  g("Harris English", -2),
  g("J.T. Poston", 4),
  g("Corey Conners", 0),
  g("Cameron Young", -1),
  g("Sam Burns", -4),
  g("Viktor Hovland", 2),
  g("Shane Lowry", -3),
  g("Nicolai Højgaard", 5),
  g("Sahith Theegala", 3),
  g("Justin Rose", -2),
  g("Alex Fitzpatrick", 6),
  g("Matt Fitzpatrick", -5), // decoy — should never be matched
  g("Keegan Bradley", 1),
  g("Justin Thomas", -1),
  g("Aaron Rai", 0),
  g("Jason Day", 3, "cut", "—"), // cut: counts as 3 + 20 = 23
  g("Akshay Bhatia", 2),
  g("J.J. Spaun", -1),
  g("Keith Mitchell", 4),
  g("Rory McIlroy", -7),
  g("Wyndham Clark", 0),
  g("Jake Knapp", 5),
  g("Robert MacIntyre", -2),
  g("Dustin Johnson", 1),
  g("Sepp Straka", -3),
  g("Cameron Smith", 2),
  g("Chris Gotterup", -1),
];

const users: UserPicks[] = ROSTER.map((r) => ({
  username: r.username,
  display_name: r.displayName,
  golfers: r.golfers,
}));

const standings = buildStandings(users, field);

let failures = 0;
function check(label: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.log(`  ✗ ${label}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}

console.log("Standings:");
for (const s of standings) {
  const counted = s.golfers
    .filter((x) => x.counted)
    .map((x) => `${x.name.split(" ").slice(-1)[0]} ${formatToPar(x.effective)}`)
    .join(", ");
  console.log(
    `  ${s.positionDisplay.padEnd(4)} ${s.displayName.padEnd(6)} ${formatToPar(
      s.teamTotal,
    ).padStart(4)}   [${counted}]`,
  );
}

console.log("\nChecks:");
// Every picked golfer should match someone in the field.
const allFound = standings.every((s) => s.golfers.every((x) => x.found));
check("all picked golfers matched the field", allFound);

// Alex Fitzpatrick (not Matt) must be the match for A. Fitzpatrick pickers.
const dec = standings.find((s) => s.username === "dec")!;
const decFitz = dec.golfers.find((x) => x.name.includes("Fitzpatrick"))!;
check("A. Fitzpatrick resolves to Alex (toPar +6), not Matt", decFitz.toPar === 6);

// Cut rule: Ryan has Jason Day (cut, +3) -> effective +23.
const ryan = standings.find((s) => s.username === "ryan")!;
const day = ryan.golfers.find((x) => x.name.includes("Day"))!;
check("Jason Day cut counts as +23 (score 3 + 20)", day.effective === 23);
check("Jason Day not in Ryan's counting 4", day.counted === false);

// Each team counts exactly 4 golfers (given all have scores).
const allFour = standings.every(
  (s) => s.golfers.filter((x) => x.counted).length === 4,
);
check("each team counts exactly 4 golfers", allFour);

// Nate: Scheffler -6, Henley -3, English -2, Conners 0 are best 4 => -11.
const nate = standings.find((s) => s.username === "nate")!;
check("Nate team total is -11", nate.teamTotal === -11);

// Standings are sorted ascending and positions assigned.
const sorted = standings.every(
  (s, i) => i === 0 || standings[i - 1].teamTotal <= s.teamTotal,
);
check("standings sorted by team total ascending", sorted);

console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
