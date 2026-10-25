// NTP's clock-offset arithmetic (RFC 5905). All times in milliseconds.

export type Stamps = { t1: number; t2: number; t3: number; t4: number };

/**
 * One request/response exchange between a client whose clock is `theta` ms
 * ahead of true time and a server that is exactly right.
 */
export function exchange(send: number, theta: number, dOut: number, dBack: number, proc: number): Stamps {
  const t1 = send + theta; // client clock when the request leaves
  const t2 = send + dOut; // server clock when it arrives
  const t3 = t2 + proc; // server clock when the reply leaves
  const t4 = send + dOut + proc + dBack + theta; // client clock when the reply arrives
  return { t1, t2, t3, t4 };
}

/** offset = ((t2 − t1) + (t3 − t4)) / 2; round-trip delay = (t4 − t1) − (t3 − t2). */
export function solve(s: Stamps) {
  return { offset: (s.t2 - s.t1 + (s.t3 - s.t4)) / 2, delay: s.t4 - s.t1 - (s.t3 - s.t2) };
}

export const BASE_HMS = 12 * 3600 * 1000; // the figure's clocks start at 12:00:00.000

export function fmtClock(ms: number) {
  const t = Math.round(BASE_HMS + ms);
  const h = Math.floor(t / 3600000) % 24, m = Math.floor(t / 60000) % 60, s = Math.floor(t / 1000) % 60, f = ((t % 1000) + 1000) % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)}.${p(f, 3)}`;
}

export const STRATA = [
  { n: 0, what: "Reference clock: GPS receiver, atomic clock. Not on the network itself." },
  { n: 1, what: "Server wired directly to a stratum-0 source." },
  { n: 2, what: "Syncs from stratum 1 over the network (most corporate servers)." },
  { n: 15, what: "Lowest valid level; each hop away adds one." },
  { n: 16, what: "Unsynchronised." },
];
