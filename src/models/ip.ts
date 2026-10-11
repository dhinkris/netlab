// IPv4 addresses as 32-bit numbers, with classification by real ranges.

export type Octets = [number, number, number, number];

export function parseIp(s: string): Octets | null {
  const m = s.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  if (o.some((n) => n > 255)) return null;
  return o as Octets;
}

export function toInt(o: Octets): number {
  return ((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3];
}

export function fromInt(n: number): Octets {
  n >>>= 0;
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

export function ipStr(o: Octets) {
  return o.join(".");
}

export function bitsOf(o: Octets): number[] {
  const n = toInt(o);
  const out: number[] = [];
  for (let i = 31; i >= 0; i--) out.push((n >>> i) & 1);
  return out;
}

export type Kind = { label: string; scope: "private" | "public" | "special"; note: string; rfc?: string };

function inRange(o: Octets, base: Octets, prefix: number) {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return ((toInt(o) & mask) >>> 0) === ((toInt(base) & mask) >>> 0);
}

export function classify(o: Octets): Kind {
  if (inRange(o, [10, 0, 0, 0], 8)) return { label: "Private", scope: "private", note: "10.0.0.0/8 — not routed on the internet", rfc: "RFC 1918" };
  if (inRange(o, [172, 16, 0, 0], 12)) return { label: "Private", scope: "private", note: "172.16.0.0/12 — not routed on the internet", rfc: "RFC 1918" };
  if (inRange(o, [192, 168, 0, 0], 16)) return { label: "Private", scope: "private", note: "192.168.0.0/16 — home and office LANs", rfc: "RFC 1918" };
  if (inRange(o, [127, 0, 0, 0], 8)) return { label: "Loopback", scope: "special", note: "127.0.0.0/8 — this machine talking to itself", rfc: "RFC 1122" };
  if (inRange(o, [169, 254, 0, 0], 16)) return { label: "Link-local", scope: "special", note: "169.254.0.0/16 — self-assigned when DHCP fails (Azure uses 169.254.169.254 for metadata)", rfc: "RFC 3927" };
  if (inRange(o, [100, 64, 0, 0], 10)) return { label: "Shared (CGNAT)", scope: "special", note: "100.64.0.0/10 — carrier-grade NAT", rfc: "RFC 6598" };
  if (inRange(o, [0, 0, 0, 0], 8)) return { label: "This network", scope: "special", note: "0.0.0.0/8 — ‘no address yet’ / any", rfc: "RFC 1122" };
  if (inRange(o, [224, 0, 0, 0], 4)) return { label: "Multicast", scope: "special", note: "224.0.0.0/4 — one-to-many groups", rfc: "RFC 5771" };
  if (inRange(o, [240, 0, 0, 0], 4)) return { label: o.every((x) => x === 255) ? "Broadcast" : "Reserved", scope: "special", note: o.every((x) => x === 255) ? "255.255.255.255 — everyone on this link" : "240.0.0.0/4 — reserved", rfc: "RFC 1112" };
  return { label: "Public", scope: "public", note: "Globally routable on the internet", };
}

export function legacyClass(o: Octets): string {
  const a = o[0];
  if (a < 128) return "A";
  if (a < 192) return "B";
  if (a < 224) return "C";
  if (a < 240) return "D";
  return "E";
}

export const SAMPLES: { ip: string; why: string }[] = [
  { ip: "192.168.1.10", why: "a laptop on a home Wi-Fi" },
  { ip: "10.0.1.4", why: "a VM in an Azure VNet" },
  { ip: "8.8.8.8", why: "Google's public DNS" },
  { ip: "172.16.5.20", why: "a server on a corporate LAN" },
  { ip: "127.0.0.1", why: "localhost" },
  { ip: "169.254.169.254", why: "the cloud metadata endpoint" },
];
