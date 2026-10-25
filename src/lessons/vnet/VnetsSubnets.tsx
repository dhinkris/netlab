import { VnetBuilding } from "../../figures/VnetBuilding";
import { Quiz } from "../Quiz";

export default function VnetsSubnets() {
  return (
    <>
      <h1>VNets & subnets</h1>
      <p className="lede">
        A <b>virtual network</b> is your private address space in one Azure region. You carve it into <b>subnets</b>, and every NIC, private endpoint and many PaaS services live in exactly one subnet.
      </p>

      <VnetBuilding />

      <h2>Address space</h2>
      <ul>
        <li>Pick private ranges (RFC 1918): e.g. <code>10.0.0.0/16</code> per VNet. You can add more ranges later.</li>
        <li>Plan so <b>no two VNets overlap</b>, nor any on-premises range; overlapping networks can't be peered or connected by VPN.</li>
        <li>A VNet lives in one region and one subscription, but can be peered anywhere.</li>
      </ul>

      <h2>Subnets</h2>
      <ul>
        <li>Each subnet is a CIDR block inside the VNet's address space; subnets can't overlap.</li>
        <li>Azure reserves <b>5 addresses</b> in every subnet: the network address, .1 (default gateway), .2 and .3 (Azure DNS), and the last address. The first VM gets .4.</li>
        <li>Smallest subnet: /29 (8 addresses, 3 usable). Resize only when the subnet is empty, so size generously.</li>
        <li>NSGs and route tables attach per subnet: group resources by the rules they need.</li>
      </ul>

      <h2>Special subnets</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name (exact)</th><th>For</th><th>Size</th></tr></thead>
          <tbody>
            <tr><td><code>GatewaySubnet</code></td><td>VPN and ExpressRoute gateways</td><td>/27 or larger recommended</td></tr>
            <tr><td><code>AzureBastionSubnet</code></td><td>Azure Bastion</td><td>/26 or larger</td></tr>
            <tr><td><code>AzureFirewallSubnet</code></td><td>Azure Firewall</td><td>/26</td></tr>
            <tr><td><code>RouteServerSubnet</code></td><td>Azure Route Server</td><td>/26 or larger</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <b>Delegated subnets.</b> Some PaaS services (App Service VNet integration, Azure Container Instances, SQL Managed Instance, etc.) need a subnet <b>delegated</b> to them, which then can't hold other resources. Leave room for these when planning.
      </div>

      <h2>A starter layout for a /16</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Subnet</th><th>CIDR</th><th>Usable</th></tr></thead>
          <tbody>
            <tr><td>GatewaySubnet</td><td>10.0.0.0/27</td><td>27</td></tr>
            <tr><td>AzureBastionSubnet</td><td>10.0.0.64/26</td><td>59</td></tr>
            <tr><td>AzureFirewallSubnet</td><td>10.0.0.128/26</td><td>59</td></tr>
            <tr><td>snet-web</td><td>10.0.1.0/24</td><td>251</td></tr>
            <tr><td>snet-app</td><td>10.0.2.0/24</td><td>251</td></tr>
            <tr><td>snet-data</td><td>10.0.3.0/25</td><td>123</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>A VNet is a regional private address space; subnets carve it without overlapping.</li>
        <li>Every subnet loses 5 addresses to Azure; the first usable host is .4.</li>
        <li>Gateway, Bastion and Firewall need specially named subnets.</li>
        <li>Plan non-overlapping ranges across all VNets and on-premises from day one.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "What IP does the first VM in 10.0.3.0/25 get?", options: ["10.0.3.0", "10.0.3.1", "10.0.3.4", "10.0.3.10"], answer: 2, why: ".0–.3 are reserved, so the first assignable address is .4." },
        { q: "Can you add 10.0.3.64/26 next to 10.0.3.0/25?", options: ["Yes", "No, it overlaps", "Only in another VNet", "Only if empty"], answer: 1, why: "10.0.3.0/25 covers .0–.127, which includes .64–.127." },
        { q: "Which subnet name must a VPN gateway use?", options: ["snet-gateway", "GatewaySubnet", "VpnSubnet", "Any name"], answer: 1, why: "The gateway subnet's name is fixed: GatewaySubnet." },
        { q: "Two VNets both use 10.0.0.0/16. What can't you do?", options: ["Create VMs", "Peer them", "Add NSGs", "Use private DNS"], answer: 1, why: "Peering requires non-overlapping address spaces." },
      ]} />
    </>
  );
}
