import { CanalLocks } from "../../figures/CanalLocks";
import { Quiz } from "../Quiz";

export default function Udrs() {
  return (
    <>
      <h1>UDRs & next hop types</h1>
      <p className="lede">
        Azure routes traffic for you with <b>system routes</b>. When you need traffic to go somewhere else (through a firewall, back to on-premises, or nowhere at all), you attach a <b>route table</b> of <b>user-defined routes</b> to a subnet.
      </p>

      <CanalLocks />

      <h2>Next hop types</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Next hop</th><th>Sends traffic to</th><th>Typical use</th></tr></thead>
          <tbody>
            <tr><td><b className="c-teal">VnetLocal</b> (system)</td><td>Directly within the VNet</td><td>Automatic for the VNet's address space</td></tr>
            <tr><td><b className="c-amber">Internet</b></td><td>Azure's internet edge (with SNAT)</td><td>System default for 0.0.0.0/0</td></tr>
            <tr><td><b className="c-rose">VirtualAppliance</b></td><td>A private IP you specify: firewall or NVA</td><td>Force traffic through Azure Firewall</td></tr>
            <tr><td><b className="c-blue">VirtualNetworkGateway</b></td><td>The VPN/ExpressRoute gateway</td><td>Forced tunnelling to on-premises</td></tr>
            <tr><td><b className="c-rose">None</b></td><td>Nowhere: dropped</td><td>Block a prefix outright</td></tr>
          </tbody>
        </table>
      </div>

      <h2>How the route is chosen</h2>
      <ol>
        <li><b>Longest prefix match</b> across all routes: system, BGP-learned and user-defined.</li>
        <li>If prefixes tie: <b>user-defined</b> beats <b>BGP</b>, which beats <b>system</b>.</li>
      </ol>
      <div className="callout">
        <b>Common gotcha:</b> a 0.0.0.0/0 → firewall UDR does not send subnet-to-subnet traffic through the firewall, because the VNet's /16 route is more specific. To inspect east-west traffic, add UDRs for the other subnets' prefixes too, on both sides.
      </div>

      <h2>Practical notes</h2>
      <ul>
        <li>Route tables attach to <b>subnets</b>, not NICs; one table can serve many subnets in the same region.</li>
        <li>An NVA needs <b>IP forwarding</b> enabled on its NIC, or Azure drops traffic not addressed to it.</li>
        <li>Don't put a 0.0.0.0/0 → firewall UDR on the <b>AzureFirewallSubnet</b> itself (loop), and be careful with GatewaySubnet route tables.</li>
        <li>Check what really applies with <b>Effective routes</b> on a NIC, or Network Watcher <b>Next hop</b>.</li>
      </ul>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>UDRs override system routes for the prefixes they name, per subnet.</li>
        <li>Next hops: VirtualAppliance, VirtualNetworkGateway, Internet, None (plus system VnetLocal).</li>
        <li>Longest prefix first; on ties, UDR beats BGP beats system.</li>
        <li>NVAs need IP forwarding; verify with effective routes.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "You set 0.0.0.0/0 → None. What happens to traffic to another subnet in the same VNet?", options: ["Dropped", "Still delivered: the VNet route is more specific", "Sent to the internet", "Sent to on-premises"], answer: 1, why: "The /16 VnetLocal route beats /0." },
        { q: "Which next hop sends internet-bound traffic to on-premises (forced tunnelling)?", options: ["Internet", "VirtualAppliance", "VirtualNetworkGateway", "None"], answer: 2, why: "VirtualNetworkGateway hands it to the VPN/ExpressRoute gateway." },
        { q: "An NVA receives packets but they never leave it. What's likely missing?", options: ["A public IP", "IP forwarding on the NVA's NIC (and in its OS)", "An MX record", "A bigger subnet"], answer: 1, why: "Without IP forwarding, Azure drops packets not addressed to the NIC." },
        { q: "A UDR and a system route both cover 10.2.0.0/16 exactly. Which wins?", options: ["System", "UDR", "Whichever is older", "Both, load-balanced"], answer: 1, why: "On a prefix tie, user-defined routes take precedence." },
      ]} />
    </>
  );
}
