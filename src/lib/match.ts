import type { EspnGolfer } from "./types";

// Normalize a name for matching: lowercase, strip accents and Nordic letters,
// drop punctuation, collapse whitespace.
export function normalizeName(s: string): string {
  return s
    .replace(/ø/gi, "o") // ø
    .replace(/å/gi, "a") // å
    .replace(/æ/gi, "ae") // æ
    .replace(/ß/g, "ss") // ß
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip remaining diacritics (é, ü, ...)
    .toLowerCase()
    .replace(/[.'’`]/g, "") // drop periods and apostrophes
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Surname + first initial, used as the match key. Using the first initial
// disambiguates e.g. Alex vs Matt Fitzpatrick and Dustin vs other Johnsons.
export function nameKey(full: string): { last: string; initial: string } {
  const parts = normalizeName(full).split(" ").filter(Boolean);
  if (parts.length === 0) return { last: "", initial: "" };
  return {
    last: parts[parts.length - 1],
    initial: parts[0][0] ?? "",
  };
}

// Find the live-field golfer that matches a picked name.
export function matchGolfer(
  pickedFullName: string,
  field: EspnGolfer[],
): EspnGolfer | null {
  const key = nameKey(pickedFullName);

  // Strict: surname + first initial.
  const strict = field.filter((g) => {
    const gk = nameKey(g.name);
    return gk.last === key.last && gk.initial === key.initial;
  });
  if (strict.length >= 1) return strict[0];

  // Fallback: surname only, but only if unambiguous in the field.
  const byLast = field.filter((g) => nameKey(g.name).last === key.last);
  if (byLast.length === 1) return byLast[0];

  return null;
}
