// Path-vector propagation of one prefix between five autonomous systems.
// ASNs come from the documentation range 64496–64511.

export type AS = { id: string; asn: number; role: string };

export const ASES: AS[] = [
  { id: "A", asn: 64500, role: "you" },
  { id: "B", asn: 64501, role: "transit" },
  { id: "C", asn: 64502, role: "transit" },
  { id: "D", asn: 64503, role: "transit" },
  { id: "E", asn: 64510, role: "origin" },
];
export const PREFIX = "203.0.113.0/24";
export const ORIGIN = 4; // E announces the prefix
export const VIEWER = 0; // A is the network we care about

export const LINKS: [number, number][] = [[4, 3], [4, 1], [3, 1], [3, 2], [1, 0], [2, 0]];
export const linkKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export type Boat = { from: number; to: number; path: number[]; accepted: boolean };

/**
 * Rounds of announcements: each AS that learned a better path in the previous
 * round advertises it (with its own ASN prepended) to every neighbour except the
 * one it learned it from. A receiver keeps the shortest AS path; ties keep the
 * route it already had. Paths are lists of AS indexes, nearest first.
 */
export function propagate(cut: Set<string>) {
  const best: (number[] | null)[] = ASES.map(() => null);
  const from: number[] = ASES.map(() => -1);
  best[ORIGIN] = [];
  let frontier = [ORIGIN];
  const rounds: Boat[][] = [];
  while (frontier.length) {
    const boats: Boat[] = [];
    const next: number[] = [];
    const updates: { n: number; path: number[]; via: number }[] = [];
    for (const u of frontier) {
      for (const [a, b] of LINKS) {
        if (cut.has(linkKey(a, b))) continue;
        const v = a === u ? b : b === u ? a : -1;
        if (v < 0 || v === from[u]) continue;
        const path = [u, ...best[u]!];
        if (path.includes(v)) continue; // loop prevention: never accept a path containing yourself
        const cur = best[v];
        const pending = updates.find((x) => x.n === v);
        const better = (cur === null || path.length < cur.length) && (!pending || path.length < pending.path.length);
        boats.push({ from: u, to: v, path, accepted: better });
        if (better) {
          if (pending) { pending.path = path; pending.via = u; } else updates.push({ n: v, path, via: u });
        }
      }
    }
    for (const up of updates) { best[up.n] = up.path; from[up.n] = up.via; next.push(up.n); }
    // a boat counts as accepted only if it carried the path that finally stuck
    for (const bt of boats) bt.accepted = bt.accepted && best[bt.to] === bt.path;
    if (boats.length) rounds.push(boats);
    frontier = next;
  }
  return { rounds, best };
}
