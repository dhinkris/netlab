export type Hue = "blue" | "teal" | "violet" | "rose" | "amber" | "moss" | "sand";
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
  {
    hue: "teal", slug: "core-services",
    title: "Core services",
    blurb: "The services every network leans on: names, addresses, translation and time.",
    ready: true,
    lessons: [
      { slug: "dns", hue: "amber", title: "DNS", blurb: "How a name becomes an address: resolvers, root, TLD and authoritative servers, caching and TTL." },
      { slug: "dhcp", hue: "blue", title: "DHCP", blurb: "How a machine gets an IP address: Discover, Offer, Request, Ack, and lease renewal." },
      { slug: "nat", hue: "rose", title: "NAT", blurb: "How many private hosts share one public IP, and why the internet can't call them back." },
      { slug: "ntp", hue: "violet", title: "NTP", blurb: "How clocks agree: stratum, four timestamps, offset and delay." },
    ],
  },
  {
    hue: "violet", slug: "routing",
    title: "Routing & switching",
    blurb: "How packets pick a path: route tables, hops and TTL, BGP between networks, and VLANs inside one.",
    ready: true,
    lessons: [
      { slug: "route-tables", hue: "teal", title: "Route tables & longest-prefix match", blurb: "How a router picks one route out of many, and why 0.0.0.0/0 only wins as a last resort." },
      { slug: "hops-ttl", hue: "moss", title: "Hops, TTL & traceroute", blurb: "Each router is a hop; TTL counts down so lost packets die, and traceroute uses that to map the path." },
      { slug: "bgp", hue: "blue", title: "BGP", blurb: "How independent networks announce prefixes to each other and choose paths, and how they reconverge when a link fails." },
      { slug: "vlans", hue: "rose", title: "VLANs & trunks", blurb: "Splitting one switch into several separate networks, and carrying them all over one cable with 802.1Q tags." },
    ],
  },
  {
    hue: "rose", slug: "traffic",
    title: "Traffic flow",
    blurb: "Which way traffic goes, who started it, and how firewalls keep track: inbound, outbound, east-west and stateful filtering.",
    ready: true,
    lessons: [
      { slug: "inbound-outbound", hue: "amber", title: "Inbound & outbound", blurb: "Direction is set by who opens the connection; replies travel back as part of the same flow." },
      { slug: "north-south-east-west", hue: "moss", title: "North-south & east-west", blurb: "Traffic crossing the perimeter versus traffic between your own workloads, and why the second needs guarding too." },
      { slug: "stateful", hue: "violet", title: "Stateful vs stateless filtering", blurb: "Firewalls that remember connections let replies back automatically; stateless ones need rules for both directions." },
      { slug: "asymmetric", hue: "blue", title: "Asymmetric routing", blurb: "When a reply takes a different path from the request, a stateful firewall drops it. How to spot it and fix it." },
    ],
  },
  {
    hue: "amber", slug: "security",
    title: "Security",
    blurb: "The layers that decide what gets in: NSG rules, application security groups, firewalls, WAF and DDoS protection.",
    ready: true,
    lessons: [
      { slug: "nsg-rules", hue: "sand", title: "NSG rules & priority", blurb: "How an NSG evaluates rules top to bottom by priority, and why the first match wins." },
      { slug: "asgs", hue: "blue", title: "ASGs & service tags", blurb: "Writing rules about roles instead of IP addresses, so they keep working as you scale." },
      { slug: "firewall-waf", hue: "violet", title: "Azure Firewall & WAF", blurb: "Network rules, FQDN rules and web application firewalls: what each layer can see." },
      { slug: "ddos", hue: "teal", title: "DDoS protection", blurb: "How volumetric attacks overwhelm a service, and how scrubbing keeps it up." },
    ],
  },
  {
    hue: "blue", slug: "vnet",
    title: "Cloud virtual networks",
    blurb: "Building networks in Azure: VNets and subnets, peering, hub-and-spoke designs and user-defined routes.",
    ready: true,
    lessons: [
      { slug: "vnets-subnets", hue: "teal", title: "VNets & subnets", blurb: "Address space, carving subnets, reserved addresses and special-purpose subnets." },
      { slug: "peering", hue: "violet", title: "VNet peering", blurb: "Joining VNets privately, and why peering is not transitive." },
      { slug: "hub-spoke", hue: "amber", title: "Hub-and-spoke", blurb: "One shared hub for firewall and gateways, many spokes for workloads." },
      { slug: "udrs", hue: "rose", title: "UDRs & next hop types", blurb: "Overriding system routes: VirtualAppliance, VirtualNetworkGateway, Internet and None." },
    ],
  },
  {
    hue: "teal", slug: "outbound",
    title: "Outbound connectivity",
    blurb: "How VMs reach the internet: the outbound options, SNAT ports, and stable egress IPs.",
    ready: true,
    lessons: [
      { slug: "options", hue: "blue", title: "Outbound options", blurb: "Default outbound, instance public IPs, load-balancer outbound rules and NAT Gateway compared." },
      { slug: "snat-exhaustion", hue: "rose", title: "SNAT port exhaustion", blurb: "Why outbound connections fail under load, and the fixes that work." },
      { slug: "egress-ips", hue: "amber", title: "Egress IPs & allow-listing", blurb: "Giving partners a stable set of source IPs they can trust." },
    ],
  },
  {
    hue: "violet", slug: "load-balancing",
    title: "Load balancing",
    blurb: "Spreading traffic across servers: L4 load balancers, L7 application gateways, and global entry points.",
    ready: true,
    lessons: [
      { slug: "azure-lb", hue: "teal", title: "Azure Load Balancer (L4)", blurb: "Hashing flows to healthy backends, health probes, and what L4 can't see." },
      { slug: "app-gateway", hue: "amber", title: "Application Gateway (L7)", blurb: "TLS termination, path-based routing, and WAF in front of web apps." },
      { slug: "global", hue: "blue", title: "Front Door & Traffic Manager", blurb: "Global load balancing: anycast edges versus DNS answers, and regional failover." },
    ],
  },
  {
    hue: "rose", slug: "private-access",
    title: "Private access to PaaS",
    blurb: "Reaching storage, databases and your own services without the public internet.",
    ready: true,
    lessons: [
      { slug: "endpoints", hue: "violet", title: "Service vs private endpoints", blurb: "Two ways to reach PaaS privately, and what each one really changes." },
      { slug: "private-dns", hue: "teal", title: "Private DNS for endpoints", blurb: "Why the same name must answer differently inside and outside, and how privatelink zones do it." },
      { slug: "private-link-service", hue: "moss", title: "Private Link service", blurb: "Publishing your own service privately to other VNets and tenants." },
    ],
  },
  { hue: "amber", slug: "hybrid", title: "Hybrid connectivity", blurb: "VPN, ExpressRoute and Bastion.", ready: false, lessons: [] },
  { hue: "blue", slug: "application", title: "Application layer", blurb: "HTTP, TLS, proxies, CDN and API gateways.", ready: false, lessons: [] },
  { hue: "teal", slug: "kubernetes", title: "Kubernetes networking", blurb: "CNI, services, ingress and network policy.", ready: false, lessons: [] },
  { hue: "violet", slug: "troubleshooting", title: "Monitoring & troubleshooting", blurb: "Network Watcher, flow logs and CLI tools.", ready: false, lessons: [] },
];

export function flatLessons() {
  return CURRICULUM.flatMap((t) => t.lessons.map((l) => ({ topic: t, lesson: l })));
}
