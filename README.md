# NetLab

An interactive networking course, from bits on a wire to cloud virtual networks. Each lesson is built around an isometric machine you can play with; the way it moves is the way the network works.

## Lessons

Nine topics, 34 lessons, each built around an interactive figure:

| Topic | Lessons |
|---|---|
| Fundamentals | OSI & TCP/IP · IP addressing · Subnetting & CIDR · Ports & protocols · MAC & ARP |
| Core services | DNS · DHCP · NAT · NTP |
| Routing & switching | Route tables & longest-prefix match · Hops, TTL & traceroute · BGP · VLANs & trunks |
| Traffic flow | Inbound & outbound · North-south & east-west · Stateful vs stateless · Asymmetric routing |
| Security | NSG rules & priority · ASGs & service tags · Azure Firewall & WAF · DDoS protection |
| Cloud virtual networks | VNets & subnets · VNet peering · Hub-and-spoke · UDRs & next hop types |
| Outbound connectivity | Outbound options · SNAT port exhaustion · Egress IPs & allow-listing |
| Load balancing | Azure Load Balancer · Application Gateway · Front Door & Traffic Manager |
| Private access to PaaS | Service vs private endpoints · Private DNS · Private Link service |

Still to come: hybrid connectivity, application layer, Kubernetes networking, monitoring & troubleshooting.

## Run locally

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Deploy

The build is a static site with hash routing, so it works on any static host without rewrite rules. `netlify.toml` sets the build command (`npm run build`), publish directory (`dist`) and Node version.

## Project layout

- `src/iso/`: the isometric drawing kit (camera, shaded solids, painter's order, figure card, animation hooks)
- `src/models/`: pure models every number in the figures comes from (header sizes, address ranges, subnet maths, ports, ARP)
- `src/figures/`: one interactive figure per lesson
- `src/lessons/`: lesson pages (explanations, tables, takeaways, quizzes)
- `src/content/curriculum.ts`: topics and lessons shown in the sidebar
