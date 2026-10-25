// A path across five routers to a server, as traceroute would show it.
// Addresses are from private, shared (CGNAT) and documentation ranges.

export type Hop = { name: string; ip: string; rtt: number };

export const SOURCE = { name: "laptop", ip: "192.168.1.20" };
export const HOPS: Hop[] = [
  { name: "home router", ip: "192.168.1.1", rtt: 1.2 },
  { name: "ISP edge", ip: "100.64.0.1", rtt: 8.7 },
  { name: "ISP core", ip: "203.0.113.1", rtt: 13.9 },
  { name: "IX peer", ip: "198.51.100.9", rtt: 21.4 },
];
export const DEST = { name: "web server", ip: "192.0.2.80", rtt: 23.1 };

/** Linux and macOS start at 64; Windows at 128. */
export const DEFAULT_TTL = 64;
