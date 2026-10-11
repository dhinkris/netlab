import { fromInt, ipStr, toInt, type Octets } from "./ip";

export function maskOf(prefix: number): Octets {
  const m = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return fromInt(m);
}

export type Subnet = {
  prefix: number;
  mask: string;
  network: string;
  broadcast: string;
  first: string;
  last: string;
  total: number;
  usable: number; // classic: total - 2 (network + broadcast)
  azureUsable: number; // Azure reserves 5 per subnet
};

export function subnet(ip: Octets, prefix: number): Subnet {
  const m = toInt(maskOf(prefix));
  const net = (toInt(ip) & m) >>> 0;
  const total = 2 ** (32 - prefix);
  const bc = (net + total - 1) >>> 0;
  const usable = prefix >= 31 ? (prefix === 31 ? 2 : 1) : total - 2;
  return {
    prefix,
    mask: ipStr(maskOf(prefix)),
    network: ipStr(fromInt(net)),
    broadcast: ipStr(fromInt(bc)),
    first: prefix >= 31 ? ipStr(fromInt(net)) : ipStr(fromInt(net + 1)),
    last: prefix >= 31 ? ipStr(fromInt(bc)) : ipStr(fromInt(bc - 1)),
    total,
    usable,
    azureUsable: Math.max(0, total - 5),
  };
}

export function fmt(n: number) {
  return n.toLocaleString("en-US");
}
