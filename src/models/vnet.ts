import { fmt } from "./cidr";

// One VNet, 10.0.0.0/16, laid out as the first four /24 "floors".
export type SubnetDef = { name: string; floor: number; start: number; prefix: number; fam: "blue" | "violet" | "teal" | "sig" | "rose" | "sand" | "moss"; purpose: string; vms?: number[] };

export const VNET = "10.0.0.0/16";
export const SUBNETS: SubnetDef[] = [
  { name: "GatewaySubnet", floor: 0, start: 0, prefix: 27, fam: "sig", purpose: "VPN / ExpressRoute gateway only (name is fixed)" },
  { name: "AzureBastionSubnet", floor: 0, start: 64, prefix: 26, fam: "moss", purpose: "Azure Bastion only, /26 or larger" },
  { name: "AzureFirewallSubnet", floor: 0, start: 128, prefix: 26, fam: "rose", purpose: "Azure Firewall only, /26" },
  { name: "snet-web", floor: 1, start: 0, prefix: 24, fam: "blue", purpose: "Web tier VMs", vms: [4, 5, 6] },
  { name: "snet-app", floor: 2, start: 0, prefix: 24, fam: "violet", purpose: "App tier VMs", vms: [4, 5] },
  { name: "snet-data", floor: 3, start: 0, prefix: 25, fam: "teal", purpose: "Databases", vms: [4] },
];

export const CANDIDATES: SubnetDef[] = [
  { name: "snet-pe", floor: 3, start: 192, prefix: 26, fam: "sand", purpose: "Private endpoints" },
  { name: "snet-batch", floor: 3, start: 64, prefix: 26, fam: "sand", purpose: "Batch jobs" },
];

export const size = (s: SubnetDef) => 2 ** (32 - s.prefix);
export const cidrOf = (s: SubnetDef) => `10.0.${s.floor}.${s.start}/${s.prefix}`;
export const overlaps = (a: SubnetDef, b: SubnetDef) => a.floor === b.floor && a.start < b.start + size(b) && b.start < a.start + size(a);

export function describe(s: SubnetDef) {
  const n = size(s);
  const base = `10.0.${s.floor}.`;
  return {
    cidr: cidrOf(s),
    total: fmt(n),
    usable: fmt(n - 5),
    reserved: `${base}${s.start} network · ${base}${s.start + 1} gateway · ${base}${s.start + 2}–${s.start + 3} Azure DNS · ${base}${s.start + n - 1} broadcast`,
    firstVm: `${base}${s.start + 4}`,
  };
}
