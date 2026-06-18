// The league: each player picked 6 golfers for the 2026 U.S. Open.
// Best 4 of the 6 count toward the team total (lowest total wins).
// Names below are the resolved full names from the original pick sheet.
//   - "A. Fitzpatrick" -> Alex Fitzpatrick (not Matt)
//   - "D. Johnson"     -> Dustin Johnson
//   - "Hojgaard"       -> Nicolai Hojgaard (only Hojgaard in the field)
//   - "Conners"        -> Corey Conners

export interface RosterUser {
  username: string;
  displayName: string;
  golfers: string[];
}

export const ROSTER: RosterUser[] = [
  {
    username: "nate",
    displayName: "Nate",
    golfers: [
      "Scottie Scheffler",
      "Russell Henley",
      "Jordan Spieth",
      "Harris English",
      "J.T. Poston",
      "Corey Conners",
    ],
  },
  {
    username: "grant",
    displayName: "Grant",
    golfers: [
      "Cameron Young",
      "Sam Burns",
      "Viktor Hovland",
      "Shane Lowry",
      "Nicolai Hojgaard",
      "Sahith Theegala",
    ],
  },
  {
    username: "dec",
    displayName: "Dec",
    golfers: [
      "Cameron Young",
      "Russell Henley",
      "Justin Rose",
      "Shane Lowry",
      "Alex Fitzpatrick",
      "Keegan Bradley",
    ],
  },
  {
    username: "ryan",
    displayName: "Ryan",
    golfers: [
      "Scottie Scheffler",
      "Justin Thomas",
      "Jordan Spieth",
      "Aaron Rai",
      "Jason Day",
      "Akshay Bhatia",
    ],
  },
  {
    username: "cole",
    displayName: "Cole",
    golfers: [
      "Scottie Scheffler",
      "Russell Henley",
      "J.J. Spaun",
      "Harris English",
      "Alex Fitzpatrick",
      "Keith Mitchell",
    ],
  },
  {
    username: "max",
    displayName: "Max",
    golfers: [
      "Rory McIlroy",
      "Wyndham Clark",
      "Justin Rose",
      "Jake Knapp",
      "J.T. Poston",
      "Keegan Bradley",
    ],
  },
  {
    username: "gavin",
    displayName: "Gavin",
    golfers: [
      "Scottie Scheffler",
      "Sam Burns",
      "Robert MacIntyre",
      "Shane Lowry",
      "Alex Fitzpatrick",
      "Dustin Johnson",
    ],
  },
  {
    username: "matt",
    displayName: "Matt",
    golfers: [
      "Jordan Spieth",
      "Sepp Straka",
      "Jason Day",
      "Cameron Smith",
      "Cameron Young",
      "Chris Gotterup",
    ],
  },
];

// Number of a player's golfers that count toward the team total.
export const COUNTING_GOLFERS = 4;

// Penalty (strokes added) applied to a golfer's score when they miss the cut / WD / DQ.
export const CUT_PENALTY = 20;
