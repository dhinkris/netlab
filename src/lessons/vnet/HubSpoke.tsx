import { HubAirport } from "../../figures/HubAirport";
import { Quiz } from "../Quiz";

export default function HubSpoke() {
  return (
    <>
      <h1>Hub-and-spoke</h1>
      <p className="lede">
        Most Azure estates end up with many VNets: one per application, team or environment. <b>Hub-and-spoke</b> puts everything they share (firewall, VPN/ExpressRoute gateway, Bastion, DNS resolvers) in one <b>hub</b> VNet, and peers every workload <b>spoke</b> to it.
      </p>

      <HubAirport />

      <h2>The pieces</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Piece</th><th>Role</th></tr></thead>
          <tbody>
            <tr><td><b className="c-amber">Hub VNet</b></td><td>Azure Firewall (or NVA), VPN/ExpressRoute gateway, Bastion, DNS Private Resolver, shared monitoring</td></tr>
            <tr><td><b>Spoke VNets</b></td><td>Workloads. Peered to the hub only; owned by app teams.</td></tr>
            <tr><td><b>Peerings</b></td><td>Hub ↔ each spoke, with <i>allow gateway transit</i> on the hub side and <i>use remote gateways</i> on the spoke side</td></tr>
            <tr><td><b>Route tables (UDRs)</b></td><td>On spoke subnets: 0.0.0.0/0 and other spokes' prefixes → firewall private IP. On GatewaySubnet: spoke prefixes → firewall.</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Why it's popular</h2>
      <ul>
        <li><b>One inspection point</b> for spoke-to-spoke, on-premises and internet traffic.</li>
        <li><b>Shared cost</b>: one firewall and one gateway instead of one per VNet.</li>
        <li><b>Isolation</b>: spokes can't reach each other unless the firewall allows it.</li>
        <li><b>Scales linearly</b>: a new spoke needs one peering and a route table, not n peerings.</li>
      </ul>

      <h2>Trade-offs</h2>
      <ul>
        <li>Spoke-to-spoke traffic takes an extra hop and pays firewall processing; latency-sensitive pairs sometimes get a direct peering (losing inspection).</li>
        <li>The hub is critical infrastructure: make the firewall zone-redundant and watch its SNAT and throughput limits.</li>
        <li>Missing a UDR on one side causes asymmetric routing (see the Traffic flow topic).</li>
        <li><b>Azure Virtual WAN</b> is Microsoft's managed version of the hub: routing between spokes and branches is automatic, at the cost of some control.</li>
      </ul>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Hub = shared services (firewall, gateways, Bastion, DNS); spokes = workloads.</li>
        <li>Spokes peer only with the hub; UDRs send their traffic to the hub firewall.</li>
        <li>Gateway transit lets every spoke use the hub's VPN/ExpressRoute gateway.</li>
        <li>Direct spoke peerings are faster but bypass inspection.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "Spoke A and spoke B are both peered to the hub only. What makes A → B traffic work?", options: ["Nothing; peering is transitive", "UDRs sending B's prefix to the hub firewall, which forwards it", "A public IP on each VM", "A second VPN gateway"], answer: 1, why: "Peering isn't transitive; the firewall in the hub forwards between spokes." },
        { q: "Where does the VPN gateway live in hub-and-spoke?", options: ["In every spoke", "In the hub, shared via gateway transit", "On-premises only", "In a separate region"], answer: 1, why: "One gateway in the hub serves all spokes." },
        { q: "What's the cost of adding a direct peering between two spokes?", options: ["Higher latency", "Their traffic no longer passes the firewall", "Overlapping addresses", "DNS stops working"], answer: 1, why: "A more specific peering route bypasses the hub UDR path." },
        { q: "Which managed Azure service provides a hub with automatic spoke and branch routing?", options: ["Azure Front Door", "Virtual WAN", "Traffic Manager", "Private Link"], answer: 1, why: "Virtual WAN is Microsoft-managed hub-and-spoke." },
      ]} />
    </>
  );
}
