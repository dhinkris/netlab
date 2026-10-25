// One recursive lookup, as a real resolver performs it. Names and addresses
// come from the documentation ranges (example.com, 203.0.113.0/24, 2001:db8::/32).

export type RType = "A" | "AAAA" | "MX" | "CNAME";

export type Query = { type: RType; name: string; answer: string; ttl: number; meaning: string };

export const QUERIES: Query[] = [
  { type: "A", name: "www.example.com", answer: "203.0.113.10", ttl: 3600, meaning: "IPv4 address" },
  { type: "AAAA", name: "www.example.com", answer: "2001:db8::10", ttl: 3600, meaning: "IPv6 address" },
  { type: "MX", name: "example.com", answer: "10 mail.example.com", ttl: 3600, meaning: "Mail server, with priority" },
  { type: "CNAME", name: "shop.example.com", answer: "www.example.com", ttl: 300, meaning: "Alias to another name" },
];

/** The 13 root server identities, a.root-servers.net … m.root-servers.net (each is anycast to many sites). */
export const ROOT_LETTERS = "abcdefghijklm".split("");
export const TLDS = [".com", ".net", ".org", ".io"];
export const TLD_NS = "a.gtld-servers.net";
export const AUTH_NS = "ns1.example.com";

/** Azure's built-in resolver, reachable from every VNet. */
export const AZURE_DNS = "168.63.129.16";
