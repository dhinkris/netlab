import { ArpSwitch } from "../../figures/ArpSwitch";
import { Quiz } from "../Quiz";

export default function MacArp() {
  return (
    <>
      <h1>MAC addresses & ARP</h1>
      <p className="lede">
        IP addresses get packets across networks, but on the wire inside one network, Ethernet delivers <b>frames</b> addressed by <b>MAC address</b>. ARP is the small protocol that answers "which MAC has this IP?".
      </p>

      <ArpSwitch />

      <h2>MAC addresses</h2>
      <p>
        A MAC address is 48 bits, written as six hex bytes: <code>00:1a:2b:3c:4d:13</code>. The first three bytes (the <b>OUI</b>) identify the manufacturer; the last three are unique to the network card. Unlike an IP, a MAC is <b>local</b>: it only matters on the current link and is replaced at every router hop.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th>MAC address</th><th>IP address</th></tr></thead>
          <tbody>
            <tr><td>Layer</td><td>L2 Data Link</td><td>L3 Network</td></tr>
            <tr><td>Size</td><td>48 bits</td><td>32 bits (IPv4)</td></tr>
            <tr><td>Scope</td><td>One link / broadcast domain</td><td>End to end across the internet</td></tr>
            <tr><td>Assigned by</td><td>Manufacturer (or the hypervisor for VMs)</td><td>Admin, DHCP or the cloud platform</td></tr>
            <tr><td>Used by</td><td>Switches</td><td>Routers</td></tr>
          </tbody>
        </table>
      </div>

      <h2>How ARP works</h2>
      <ol>
        <li>A wants to send to <code>10.0.0.13</code> on its own subnet. It checks its <b>ARP cache</b>; no entry.</li>
        <li>A broadcasts an <b>ARP request</b> to <code>ff:ff:ff:ff:ff:ff</code>: "Who has 10.0.0.13? Tell 10.0.0.11."</li>
        <li>The switch <b>floods</b> the broadcast out every port except the one it came in on, and records A's MAC against port 1.</li>
        <li>Every host receives it; only the one with that IP replies with a <b>unicast ARP reply</b>: "10.0.0.13 is at 00:1a:2b:3c:4d:13."</li>
        <li>A caches the answer and sends the real frame. The switch now knows both MACs and forwards out a single port.</li>
      </ol>
      <div className="callout">
        <b>Talking to another subnet?</b> Then A doesn't ARP for the far host at all. It ARPs for its <b>default gateway</b> and sends the frame to the router's MAC, with the far host's IP still in the IP header. The router strips the frame, routes the packet, and builds a new frame for the next link.
      </div>

      <h2>Switch vs router</h2>
      <ul>
        <li><b>Switch (L2):</b> forwards frames within a network using a MAC table it learns by itself. Broadcasts go everywhere in the segment.</li>
        <li><b>Router (L3):</b> moves packets between networks using IP route tables. Broadcasts stop at the router; that boundary is a <b>broadcast domain</b>.</li>
      </ul>

      <h2>In Azure</h2>
      <p>
        An Azure VNet has no real switches and no broadcast. The platform answers ARP itself, and every VM's default gateway (the subnet's <code>.1</code> address) resolves to <code>12:34:56:78:9a:bc</code>. So <code>arp -a</code> on a VM looks odd, and techniques that rely on broadcast or gratuitous ARP (classic floating-IP clustering, for example) don't work. Use a load balancer instead.
      </p>

      <h2>Useful commands</h2>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr><td>Show the ARP cache (Windows / macOS)</td><td><code>arp -a</code></td></tr>
            <tr><td>Show the ARP/neighbour cache (Linux)</td><td><code>ip neigh</code></td></tr>
            <tr><td>Show your MAC (Linux / Windows)</td><td><code>ip link</code> · <code>getmac</code></td></tr>
          </tbody>
        </table>
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>MAC = 48-bit hardware address used for delivery within one link.</li>
        <li>ARP maps IP → MAC with a broadcast request and a unicast reply, then caches the answer.</li>
        <li>Switches learn MAC → port from source addresses and flood only when they must.</li>
        <li>Off-subnet traffic is framed to the gateway's MAC; MACs change at every hop, IPs don't.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "What destination MAC does an ARP request use?", options: ["The target's MAC", "00:00:00:00:00:00", "ff:ff:ff:ff:ff:ff", "The gateway's MAC"], answer: 2, why: "The asker doesn't know the target's MAC yet, so it broadcasts to everyone on the link." },
        { q: "How does a switch learn which port a MAC is on?", options: ["From ARP replies only", "From the source MAC of every frame it receives", "From DHCP", "An admin configures it"], answer: 1, why: "Switches learn passively from source addresses." },
        { q: "A host sends to 8.8.8.8. Which MAC is in the frame it sends?", options: ["8.8.8.8's MAC", "Its default gateway's MAC", "Broadcast", "The DNS server's MAC"], answer: 1, why: "Off-subnet traffic goes to the router, so the frame is addressed to the gateway's MAC." },
        { q: "Which device stops broadcasts?", options: ["Switch", "Hub", "Router", "Cable"], answer: 2, why: "Routers don't forward L2 broadcasts, so each router interface is the edge of a broadcast domain." },
      ]} />
    </>
  );
}
