import { RailJunction } from "../../figures/RailJunction";
import { Quiz } from "../Quiz";

export default function RouteTables() {
  return (
    <>
      <h1>Route tables & longest-prefix match</h1>
      <p className="lede">
        Every router, and every host, keeps a <b>route table</b>: a list of "for addresses in this block, send the packet here". For each packet it picks one entry, using a single rule: the most specific match wins.
      </p>

      <RailJunction />

      <h2>What a route says</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Part</th><th>Meaning</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td><b>Destination prefix</b></td><td>Which addresses the route covers</td><td><code>10.1.0.0/16</code></td></tr>
            <tr><td><b>Next hop</b></td><td>Where to send the packet next: a router's IP, an interface, or a gateway</td><td><code>10.1.0.4</code>, "VPN gateway"</td></tr>
            <tr><td><b>Metric / preference</b></td><td>Tie-breaker when two routes have the same prefix length</td><td>lower is better</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Longest-prefix match, step by step</h2>
      <ol>
        <li>Find every route whose prefix <b>contains</b> the destination (AND the address with each route's mask).</li>
        <li>Of those, pick the one with the <b>longest prefix</b>, the largest /n. A /24 beats a /16 beats a /8 beats a /0.</li>
        <li>Send the packet to that route's next hop. If nothing matches and there's no default route, drop it ("destination unreachable").</li>
      </ol>
      <div className="callout">
        <b>Why "longest"?</b> A longer prefix describes a smaller, more precise set of addresses. Specific knowledge ("10.1.2.0/24 is right here") should override general knowledge ("all of 10.0.0.0/8 is on-premises").
      </div>

      <h2>The default route</h2>
      <p>
        <code>0.0.0.0/0</code> has zero network bits, so it contains every IPv4 address. It is the route of last resort, the <b>default gateway</b>, used only when nothing more specific matches. On your laptop it points at your home router; in Azure it points at the internet (or at a firewall, if you override it).
      </p>

      <h2>Routes in Azure</h2>
      <ul>
        <li><b>System routes</b> are created automatically: VNet address space → VnetLocal, peered VNets → VNetPeering, 0.0.0.0/0 → Internet, plus gateway-learned routes.</li>
        <li><b>User-defined routes (UDRs)</b> go in a route table attached to a subnet. The classic one is <code>0.0.0.0/0 → VirtualAppliance 10.0.0.4</code>, which forces all outbound traffic through a firewall.</li>
        <li>Selection is longest-prefix match first. For equal prefixes the order is UDR, then BGP, then system route.</li>
        <li>To see what a NIC actually uses, check <b>Effective routes</b> on the NIC (portal or <code>az network nic show-effective-route-table</code>).</li>
      </ul>

      <h2>Look at a route table</h2>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr><td>Linux</td><td><code>ip route</code></td></tr>
            <tr><td>Windows</td><td><code>route print</code></td></tr>
            <tr><td>macOS</td><td><code>netstat -rn</code></td></tr>
            <tr><td>Which route will this address use?</td><td><code>ip route get 10.1.9.20</code></td></tr>
          </tbody>
        </table>
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>A route maps a prefix to a next hop; every packet is looked up independently.</li>
        <li>Of all matching routes, the longest prefix wins.</li>
        <li>0.0.0.0/0 matches everything and is used only as a last resort.</li>
        <li>In Azure, UDRs override system routes for equal prefixes; check Effective routes.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "Routes: 10.0.0.0/8 → A, 10.20.0.0/16 → B, 10.20.30.0/24 → C. Where does 10.20.30.40 go?", options: ["A", "B", "C", "Dropped"], answer: 2, why: "All three match; /24 is the longest." },
        { q: "Same table. Where does 10.20.99.1 go?", options: ["A", "B", "C", "Dropped"], answer: 1, why: "10.20.30.0/24 doesn't contain .99.1; /16 is the longest match left." },
        { q: "Same table, no default route. Where does 8.8.8.8 go?", options: ["A", "B", "C", "Dropped"], answer: 3, why: "Nothing matches and there's no 0.0.0.0/0, so the router drops it." },
        { q: "You add a UDR 0.0.0.0/0 → firewall to a subnet. Does traffic to a peered VNet (10.2.0.0/16) go through the firewall?", options: ["Yes, always", "No: the /16 peering route is more specific", "Only UDP", "Only if the firewall is in the same subnet"], answer: 1, why: "Longest prefix wins: /16 beats /0. Add a UDR for 10.2.0.0/16 if you want it inspected." },
      ]} />
    </>
  );
}
