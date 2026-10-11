// A tiny LAN: one switch and three hosts on 10.0.0.0/24.

export type Host = { id: "A" | "B" | "C"; name: string; ip: string; mac: string; port: number };

export const HOSTS: Host[] = [
  { id: "A", name: "web-01", ip: "10.0.0.11", mac: "00:1a:2b:3c:4d:11", port: 1 },
  { id: "B", name: "db-01", ip: "10.0.0.12", mac: "00:1a:2b:3c:4d:12", port: 2 },
  { id: "C", name: "cache-01", ip: "10.0.0.13", mac: "00:1a:2b:3c:4d:13", port: 3 },
];

export const BROADCAST_MAC = "ff:ff:ff:ff:ff:ff";

/** Typical Linux ARP cache lifetime (reachable state, base 30 s randomised 15–45 s). */
export const ARP_TTL_S = 30;

export type Phase = "idle" | "request" | "reply" | "data" | "cached";

/**
 * One ARP exchange from `from` to `to`, as a timeline in seconds.
 * request: broadcast floods out every switch port except the one it came in on.
 * reply: unicast back only to the asker. data: the real frame, now addressable.
 */
export const TIMELINE = { request: 1.6, reply: 1.4, data: 1.4 };
