import { Archipelago } from "../../figures/Archipelago";
import { Quiz } from "../Quiz";

export default function Bgp() {
  return (
    <>
      <h1>BGP</h1>
      <p className="lede">
        The internet is about 75,000 independently run networks, called <b>autonomous systems</b> (ASes), each with its own number. The <b>Border Gateway Protocol</b> is how they tell each other which address blocks they can reach, and how each one picks a path.
      </p>

      <Archipelago />

      <h2>How BGP works</h2>
      <ol>
        <li>Two routers in different ASes open a <b>BGP session</b> (TCP port 179) and become peers.</li>
        <li>An AS <b>announces</b> the prefixes it owns: "203.0.113.0/24, AS path: 64510".</li>
        <li>Each AS that passes an announcement on <b>prepends</b> its own ASN, so the path grows: "64503 64510".</li>
        <li>Each router picks a <b>best path</b> per prefix and puts it in its route table. If a link fails, routes over it are <b>withdrawn</b> and everyone re-picks.</li>
      </ol>
      <div className="callout">
        <b>Loop prevention is built in.</b> A router rejects any announcement whose AS path already contains its own ASN, so routes can't circle back.
      </div>

      <h2>Choosing a path (simplified)</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Order</th><th>Prefer…</th><th>Why it exists</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>Highest <b>weight</b> / <b>local preference</b></td><td>Your own policy: e.g. prefer a cheaper or faster provider</td></tr>
            <tr><td>2</td><td><b>Shortest AS path</b></td><td>Fewer networks to cross</td></tr>
            <tr><td>3</td><td>Lowest origin type, lowest <b>MED</b></td><td>Hints from the neighbour about which entry point to use</td></tr>
            <tr><td>4</td><td>eBGP over iBGP, lowest IGP cost, lowest router ID</td><td>Final tie-breakers</td></tr>
          </tbody>
        </table>
      </div>
      <p>Path selection is about <b>policy</b> first and distance second. The figure only uses path length, but real networks steer traffic with local preference and AS-path prepending.</p>

      <h2>BGP in Azure</h2>
      <ul>
        <li><b>ExpressRoute</b> always uses BGP: your edge routers peer with Microsoft's and exchange prefixes. Microsoft's public ASN is 12076.</li>
        <li><b>VPN Gateway</b> can run BGP over site-to-site tunnels, so on-premises routes are learned automatically and failover between tunnels is automatic.</li>
        <li><b>Azure Route Server</b> lets network virtual appliances (firewalls, SD-WAN) exchange routes with the VNet over BGP.</li>
        <li>Learned BGP routes appear in a NIC's <b>effective routes</b> with next hop type "VirtualNetworkGateway".</li>
      </ul>

      <h2>When BGP goes wrong</h2>
      <ul>
        <li><b>Route leaks / hijacks:</b> an AS announces prefixes it doesn't own, and traffic follows the bogus path. Defences: RPKI route-origin validation and prefix filters.</li>
        <li><b>Flapping:</b> a link that keeps going up and down causes repeated withdrawals and re-announcements. Dampening limits the churn.</li>
      </ul>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>ASes announce prefixes; each AS on the way prepends its ASN to the AS path.</li>
        <li>A router never accepts a path that contains its own ASN (loop prevention).</li>
        <li>Best path: policy (local preference) first, then shortest AS path, then tie-breakers.</li>
        <li>Link failures cause withdrawals and reconvergence onto the next-best path.</li>
        <li>ExpressRoute and BGP-enabled VPN Gateways learn on-premises routes via BGP.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "Two routes to 203.0.113.0/24: AS path 64501 64510, and 64502 64503 64510. Same local preference. Which wins?", options: ["The first (shorter AS path)", "The second", "Both, load-balanced", "Neither"], answer: 0, why: "With equal local preference, the shorter AS path wins." },
        { q: "AS 64503 receives an announcement with AS path 64501 64503 64510. What does it do?", options: ["Installs it", "Rejects it: its own ASN is in the path", "Forwards it unchanged", "Shortens it"], answer: 1, why: "Seeing its own ASN means accepting it would create a loop." },
        { q: "Which transport and port does BGP use?", options: ["UDP 179", "TCP 179", "TCP 443", "UDP 520"], answer: 1, why: "BGP sessions run over TCP port 179." },
        { q: "You want traffic from Azure to prefer ExpressRoute over a backup VPN for the same prefix. Which BGP tool fits best?", options: ["Lower the DNS TTL", "Weight or local preference / AS-path prepending on the VPN path", "A bigger subnet", "NAT"], answer: 1, why: "Path selection is steered with BGP attributes such as weight, local preference and prepending." },
      ]} />
    </>
  );
}
