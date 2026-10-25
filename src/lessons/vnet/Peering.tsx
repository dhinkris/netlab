import { StationPeering } from "../../figures/StationPeering";
import { Quiz } from "../Quiz";

export default function Peering() {
  return (
    <>
      <h1>VNet peering</h1>
      <p className="lede">
        <b>Peering</b> joins two VNets so their resources reach each other by private IP, over Microsoft's backbone, with no gateway or public internet in the path. It's the basic building block of every multi-VNet design.
      </p>

      <StationPeering />

      <h2>What peering gives you</h2>
      <ul>
        <li>Low-latency, high-bandwidth private connectivity: traffic behaves as if both VNets were one network.</li>
        <li>Works across subscriptions, tenants and regions (<b>global peering</b>).</li>
        <li>Each peering is created from <b>both sides</b>; it's usable once both show <b>Connected</b>.</li>
        <li>NSGs still apply: the default VirtualNetwork tag includes peered address spaces.</li>
      </ul>

      <h2>Rules you can't break</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Rule</th><th>Consequence</th></tr></thead>
          <tbody>
            <tr><td><b>Address spaces must not overlap</b></td><td>Plan unique ranges for every VNet up front; renumbering later is painful.</td></tr>
            <tr><td><b>Peering is not transitive</b></td><td>A↔B and B↔C does not give A↔C. Peer directly, or send traffic through an NVA/firewall in B with UDRs (hub-and-spoke).</td></tr>
            <tr><td>Gateways are shared only if you ask</td><td>"Use remote gateways" / "Allow gateway transit" let spokes use the hub's VPN/ExpressRoute gateway.</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <b>Full mesh doesn't scale.</b> Connecting n VNets directly needs n(n−1)/2 peerings: 10 VNets = 45 peerings. That's why most designs use hub-and-spoke instead, or Azure Virtual Network Manager to build and maintain meshes automatically.
      </div>

      <h2>Peering settings</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Setting</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td>Allow access to remote VNet</td><td>Basic connectivity (on by default)</td></tr>
            <tr><td>Allow forwarded traffic</td><td>Accept traffic that didn't originate in the peer (needed when an NVA forwards spoke-to-spoke traffic)</td></tr>
            <tr><td>Allow gateway transit</td><td>Set on the hub: let peers use this VNet's gateway</td></tr>
            <tr><td>Use remote gateways</td><td>Set on the spoke: send on-premises traffic through the hub's gateway</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Peering = private VNet-to-VNet connectivity over the backbone, within or across regions.</li>
        <li>Address spaces must not overlap.</li>
        <li>Peering is not transitive; use direct peerings or a hub with routing.</li>
        <li>Gateway transit lets spokes share the hub's VPN/ExpressRoute gateway.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "A is peered with B, and B with C. Can a VM in A reach a VM in C?", options: ["Yes, automatically", "No: peering isn't transitive", "Only over the internet", "Only for ICMP"], answer: 1, why: "Each peering only connects its two VNets." },
        { q: "How many peerings does a full mesh of 6 VNets need?", options: ["6", "12", "15", "30"], answer: 2, why: "6 × 5 / 2 = 15." },
        { q: "A spoke should reach on-premises through the hub's VPN gateway. Which settings?", options: ["Allow forwarded traffic only", "Allow gateway transit on the hub, use remote gateways on the spoke", "Use remote gateways on the hub", "No settings needed"], answer: 1, why: "The hub offers its gateway; the spoke opts in to use it." },
        { q: "Two VNets both use 10.1.0.0/16. Can they be peered?", options: ["Yes", "No", "Only across regions", "Only with a firewall"], answer: 1, why: "Overlapping address spaces can't be peered." },
      ]} />
    </>
  );
}
