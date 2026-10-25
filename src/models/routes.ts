import { parseIp, toInt, type Octets } from "./ip";

export type Route = { prefix: string; len: number; next: string; nextType: string; dest: string };

/** A route table like an Azure VM's effective routes: a local subnet, a peered VNet, on-premises over VPN, and the default route. */
export const ROUTES: Route[] = [
  { prefix: "10.1.2.0", len: 24, next: "on-link", nextType: "VnetLocal (this subnet)", dest: "LOCAL SUBNET" },
  { prefix: "10.1.0.0", len: 16, next: "peering", nextType: "VNetPeering", dest: "PEERED VNET" },
  { prefix: "10.0.0.0", len: 8, next: "VPN gateway", nextType: "VirtualNetworkGateway", dest: "ON-PREM VPN" },
  { prefix: "0.0.0.0", len: 0, next: "internet", nextType: "Internet", dest: "INTERNET" },
];

export function matches(ip: Octets, r: Route) {
  const mask = r.len === 0 ? 0 : (0xffffffff << (32 - r.len)) >>> 0;
  return ((toInt(ip) & mask) >>> 0) === ((toInt(parseIp(r.prefix)!) & mask) >>> 0);
}

/** Longest-prefix match: of every route that contains the address, the most specific wins. */
export function lookup(ip: Octets) {
  const hits = ROUTES.map((r, i) => (matches(ip, r) ? i : -1)).filter((i) => i >= 0);
  const best = hits.reduce((b, i) => (b < 0 || ROUTES[i].len > ROUTES[b].len ? i : b), -1);
  return { hits, best };
}

export const SAMPLES = [
  { ip: "10.1.2.7", why: "a VM in the same subnet" },
  { ip: "10.1.9.20", why: "a VM in the peered VNet" },
  { ip: "10.200.0.5", why: "a server on-premises" },
  { ip: "8.8.8.8", why: "anything on the internet" },
];
