# NetLab

An interactive networking course, from bits on a wire to cloud virtual networks. Each lesson is built around an isometric machine you can play with; the way it moves is the way the network works.

## Lessons

**Fundamentals** (available now)

| Lesson | Figure |
|---|---|
| OSI & TCP/IP models | Encapsulation lift: a parcel gains a header at each layer on the way down and loses them on the way up |
| IP addressing | Address register: 32 bit pins in four octets, with private/public/special classification |
| Subnetting & CIDR | Prefix caliper: the sliding jaw sets the prefix; network vs host bits, mask, host counts |
| Ports & protocols | Port bays: TCP handshake, UDP, and a closed port answering with RST |
| MAC addresses & ARP | ARP on a switch: broadcast request, MAC learning, unicast reply, ARP cache |

Later topics (core services, routing, security, Azure VNets, load balancing, hybrid connectivity and more) are listed in the app as coming soon.

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
