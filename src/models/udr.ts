import { parseIp, toInt } from "./ip";

export type Hop = "VnetLocal" | "Internet" | "VirtualAppliance" | "VirtualNetworkGateway" | "None";
export type Route = { prefix: string; len: number; hop: Hop; source: "Default" | "User" | "Gateway"; note?: string };

export const DESTS = [
  { ip: "8.8.8.8", why: "a public website" },
  { ip: "10.0.3.4", why: "a VM in another subnet of this VNet" },
  { ip: "192.168.10.5", why: "a server on-premises" },
];

export const DEFAULT_HOP_CHOICES: Hop[] = ["Internet", "VirtualAppliance", "VirtualNetworkGateway", "None"];

/** Effective routes for snet-app, with the user's choice for 0.0.0.0/0. */
export function routes(defaultHop: Hop): Route[] {
  return [
    { prefix: "10.0.0.0", len: 16, hop: "VnetLocal", source: "Default", note: "the VNet's own address space" },
    { prefix: "192.168.0.0", len: 16, hop: "VirtualNetworkGateway", source: "Gateway", note: "learned from on-premises over BGP" },
    defaultHop === "Internet"
      ? { prefix: "0.0.0.0", len: 0, hop: "Internet", source: "Default", note: "system default route" }
      : { prefix: "0.0.0.0", len: 0, hop: defaultHop, source: "User", note: defaultHop === "VirtualAppliance" ? "UDR → firewall 10.0.0.4" : defaultHop === "None" ? "UDR: black hole" : "UDR: forced tunnelling to on-premises" },
  ];
}

export function pick(ip: string, rs: Route[]) {
  const n = toInt(parseIp(ip)!);
  let best = -1;
  rs.forEach((r, i) => {
    const mask = r.len === 0 ? 0 : (0xffffffff << (32 - r.len)) >>> 0;
    if (((n & mask) >>> 0) === ((toInt(parseIp(r.prefix)!) & mask) >>> 0) && (best < 0 || r.len > rs[best].len)) best = i;
  });
  return best;
}
