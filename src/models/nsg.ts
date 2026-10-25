// One NSG's inbound rules, evaluated as Azure does: ascending priority, first match wins.

export type Src = { id: string; label: string; ip: string; kinds: string[] };
export const SOURCES: Src[] = [
  { id: "inet", label: "Internet", ip: "203.0.113.9", kinds: ["any", "Internet"] },
  { id: "app", label: "app subnet", ip: "10.0.2.5", kinds: ["any", "VirtualNetwork", "10.0.2.0/24"] },
  { id: "other", label: "another subnet", ip: "10.0.3.7", kinds: ["any", "VirtualNetwork"] },
  { id: "lb", label: "Azure LB probe", ip: "168.63.129.16", kinds: ["any", "AzureLoadBalancer"] },
];
export const PORTS = [443, 22, 8080, 3389];

export type Rule = { prio: number; name: string; src: string; port: number | "any"; allow: boolean; builtin?: boolean };
export const RULES: Rule[] = [
  { prio: 100, name: "Allow-HTTPS", src: "Internet", port: 443, allow: true },
  { prio: 200, name: "Deny-SSH", src: "any", port: 22, allow: false },
  { prio: 300, name: "Allow-App-8080", src: "10.0.2.0/24", port: 8080, allow: true },
  { prio: 65000, name: "AllowVnetInBound", src: "VirtualNetwork", port: "any", allow: true, builtin: true },
  { prio: 65001, name: "AllowAzureLoadBalancerInBound", src: "AzureLoadBalancer", port: "any", allow: true, builtin: true },
  { prio: 65500, name: "DenyAllInBound", src: "any", port: "any", allow: false, builtin: true },
];

export function evaluate(src: Src, port: number) {
  const i = RULES.findIndex((r) => src.kinds.includes(r.src) && (r.port === "any" || r.port === port));
  return { index: i, rule: RULES[i] };
}

export const PRESETS: { src: string; port: number; why: string }[] = [
  { src: "inet", port: 443, why: "a visitor to the website" },
  { src: "inet", port: 22, why: "someone trying SSH" },
  { src: "app", port: 8080, why: "the app tier calling in" },
  { src: "other", port: 3389, why: "RDP from elsewhere in the VNet" },
  { src: "lb", port: 443, why: "a load-balancer health probe" },
  { src: "inet", port: 3389, why: "RDP from the internet" },
];
