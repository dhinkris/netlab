import { BeaconHills } from "../../figures/BeaconHills";
import { Quiz } from "../Quiz";

export default function HopsTtl() {
  return (
    <>
      <h1>Hops, TTL & traceroute</h1>
      <p className="lede">
        A packet crossing the internet passes through a chain of routers. Each one is a <b>hop</b>. The IP header carries a small counter, the <b>TTL</b> (time to live), that every router lowers by one, so a packet caught in a routing loop dies instead of circling forever.
      </p>

      <BeaconHills />

      <h2>How TTL works</h2>
      <ol>
        <li>The sender sets TTL: 64 on Linux and macOS, 128 on Windows, 255 on many routers.</li>
        <li>Each router subtracts 1 before forwarding.</li>
        <li>A router that brings TTL to <b>0</b> discards the packet and sends <b>ICMP Time Exceeded</b> (type 11) back to the source, from its own address.</li>
      </ol>
      <div className="callout">
        <b>Read the TTL of replies.</b> A reply arriving with TTL 57 was most likely sent with 64 and crossed 7 hops; one arriving with 116 was probably sent from Windows (128) and crossed 12.
      </div>

      <h2>traceroute, explained by TTL</h2>
      <p>
        traceroute (<code>tracert</code> on Windows) deliberately sends probes with TTL 1, 2, 3, and so on. Probe <i>n</i> dies at the <i>n</i>th router, which reveals itself in the Time Exceeded reply. When a probe finally reaches the destination, the trace is done. Each line shows the hop's address and the round-trip time, usually from three probes.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>You see</th><th>It usually means</th></tr></thead>
          <tbody>
            <tr><td><code>* * *</code> on one hop, later hops fine</td><td>That router doesn't send Time Exceeded (or rate-limits it). Harmless.</td></tr>
            <tr><td><code>* * *</code> from some hop onwards</td><td>Traffic is blocked or dropped there, or the destination ignores probes.</td></tr>
            <tr><td>A jump in RTT that stays high</td><td>A long link (e.g. crossing an ocean) or congestion at that hop.</td></tr>
            <tr><td>A high RTT on one hop only</td><td>The router is slow to answer probes, not slow to forward. Ignore it.</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Hops in Azure</h2>
      <ul>
        <li>Inside a VNet, the Azure fabric is invisible: two VMs are one hop apart even across peered VNets.</li>
        <li>Plain <code>traceroute</code> from Azure VMs often shows only stars, because ICMP to the internet is limited. Use <code>tcpping</code>/<code>psping</code>, or Network Watcher's <b>Connection troubleshoot</b> and <b>Next hop</b>.</li>
        <li>A UDR that sends traffic to a firewall adds a hop: you'll see the appliance's IP in the trace.</li>
      </ul>

      <h2>Commands</h2>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr><td>Linux / macOS</td><td><code>traceroute example.com</code> · <code>mtr example.com</code> (continuous)</td></tr>
            <tr><td>Windows</td><td><code>tracert example.com</code> · <code>pathping example.com</code></td></tr>
            <tr><td>TCP-based (gets past ICMP filters)</td><td><code>traceroute -T -p 443 example.com</code></td></tr>
          </tbody>
        </table>
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Each router is one hop and lowers TTL by 1.</li>
        <li>TTL 0 → packet dropped, ICMP Time Exceeded sent back by that router.</li>
        <li>traceroute maps the path by sending probes with increasing TTL.</li>
        <li>Stars mean "no reply", not necessarily "broken".</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "A Linux host sends a packet with the default TTL across 6 routers. What TTL does it arrive with?", options: ["64", "58", "70", "6"], answer: 1, why: "64 − 6 = 58." },
        { q: "Which message does traceroute rely on from intermediate routers?", options: ["ICMP Echo Reply", "ICMP Time Exceeded", "TCP RST", "ARP reply"], answer: 1, why: "Each router that drops a probe at TTL 0 sends Time Exceeded from its own address." },
        { q: "Why does IP have a TTL at all?", options: ["To encrypt packets", "So packets in a routing loop eventually die", "To pick a port", "To measure bandwidth"], answer: 1, why: "Without it, a loop would circulate packets forever." },
        { q: "Hop 4 shows * * * but hops 5–9 answer normally. Is the path broken at hop 4?", options: ["Yes", "No: that router just doesn't reply to expired probes", "Only for UDP", "Only for IPv6"], answer: 1, why: "Later hops answering proves traffic passes through hop 4." },
      ]} />
    </>
  );
}
