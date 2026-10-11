export type Hue = "blue" | "teal" | "violet" | "rose" | "amber";
export type LessonMeta = { slug: string; title: string; blurb: string; hue: Hue };
export type Topic = { slug: string; title: string; blurb: string; lessons: LessonMeta[]; ready: boolean; hue: Hue };

export const CURRICULUM: Topic[] = [
  {
    hue: "blue", slug: "fundamentals",
    title: "Fundamentals",
    blurb: "Layers, addresses, subnets, ports and how machines find each other on a LAN.",
    ready: true,
    lessons: [
      { slug: "osi", hue: "violet", title: "OSI & TCP/IP models", blurb: "How data is wrapped layer by layer on the way down and unwrapped on the way up." },
      { slug: "ip-addressing", hue: "blue", title: "IP addressing", blurb: "32 bits, four octets, and which ranges are private, public or special." },
      { slug: "subnetting", hue: "teal", title: "Subnetting & CIDR", blurb: "What /24 means, masks, and how many hosts fit in a block." },
      { slug: "ports", hue: "amber", title: "Ports & protocols", blurb: "TCP vs UDP, well-known ports and the three-way handshake." },
      { slug: "mac-arp", hue: "rose", title: "MAC addresses & ARP", blurb: "How an IP address is turned into a MAC on the local network." },
    ],
  },
  { hue: "teal", slug: "core-services", title: "Core services", blurb: "DNS, DHCP, NAT and NTP.", ready: false, lessons: [] },
  { hue: "violet", slug: "routing", title: "Routing & switching", blurb: "Route tables, BGP, gateways and VLANs.", ready: false, lessons: [] },
  { hue: "rose", slug: "traffic", title: "Traffic flow", blurb: "Inbound, outbound, east-west and stateful filtering.", ready: false, lessons: [] },
  { hue: "amber", slug: "security", title: "Security", blurb: "Firewalls, NSGs, ASGs, WAF and DDoS protection.", ready: false, lessons: [] },
  { hue: "blue", slug: "vnet", title: "Cloud virtual networks", blurb: "VNets, subnets, peering, hub-and-spoke and UDRs.", ready: false, lessons: [] },
  { hue: "teal", slug: "outbound", title: "Outbound connectivity", blurb: "NAT Gateway, SNAT and outbound rules.", ready: false, lessons: [] },
  { hue: "violet", slug: "load-balancing", title: "Load balancing", blurb: "L4 vs L7, Application Gateway, Front Door.", ready: false, lessons: [] },
  { hue: "rose", slug: "private-access", title: "Private access to PaaS", blurb: "Service endpoints, Private Link and private DNS.", ready: false, lessons: [] },
  { hue: "amber", slug: "hybrid", title: "Hybrid connectivity", blurb: "VPN, ExpressRoute and Bastion.", ready: false, lessons: [] },
  { hue: "blue", slug: "application", title: "Application layer", blurb: "HTTP, TLS, proxies, CDN and API gateways.", ready: false, lessons: [] },
  { hue: "teal", slug: "kubernetes", title: "Kubernetes networking", blurb: "CNI, services, ingress and network policy.", ready: false, lessons: [] },
  { hue: "violet", slug: "troubleshooting", title: "Monitoring & troubleshooting", blurb: "Network Watcher, flow logs and CLI tools.", ready: false, lessons: [] },
];

export function flatLessons() {
  return CURRICULUM.flatMap((t) => t.lessons.map((l) => ({ topic: t, lesson: l })));
}
