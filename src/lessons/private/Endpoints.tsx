import { VendingMachine } from "../../figures/VendingMachine";
import { Quiz } from "../Quiz";

export default function Endpoints() {
  return (
    <>
      <h1>Service vs private endpoints</h1>
      <p className="lede">
        Azure PaaS services (Storage, SQL, Key Vault, Cosmos DB…) live on public endpoints by default. Two features let your VNet use them without exposing them to the whole internet, and they work very differently.
      </p>

      <VendingMachine />

      <h2>Service endpoints</h2>
      <ul>
        <li>Turned on <b>per subnet, per service type</b> (e.g. Microsoft.Storage on snet-app).</li>
        <li>Traffic still goes to the service's <b>public IP</b>, but over Azure's backbone, and arrives tagged with your subnet's identity.</li>
        <li>On the service, you add a <b>VNet rule</b> ("allow snet-app") and can deny all other public networks.</li>
        <li>Free and simple, but it doesn't help on-premises or peered VNets, and the endpoint stays public.</li>
      </ul>

      <h2>Private endpoints (Private Link)</h2>
      <ul>
        <li>A <b>NIC with a private IP from your subnet</b> that maps to one specific resource (one storage account, one SQL server).</li>
        <li>Reachable from the VNet, peered VNets and on-premises (VPN/ExpressRoute), like any private IP.</li>
        <li>You can then <b>disable public network access</b> on the resource entirely.</li>
        <li>Needs DNS so the service's normal name resolves to the private IP (next lesson). Billed per endpoint-hour and per GB.</li>
      </ul>
      <div className="callout">
        <b>Data exfiltration.</b> A service endpoint for Storage allows your subnet to reach <i>any</i> storage account (subject to its firewall), including an attacker's. A private endpoint maps to one specific account. Service endpoint policies can narrow the former; private endpoints solve it by design.
      </div>

      <h2>Which to choose</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Situation</th><th>Pick</th></tr></thead>
          <tbody>
            <tr><td>Quick lockdown of a storage account to one subnet, no on-prem access</td><td>Service endpoint</td></tr>
            <tr><td>Access from on-premises or other VNets, no public exposure at all</td><td>Private endpoint</td></tr>
            <tr><td>Strict compliance / exfiltration concerns</td><td>Private endpoint (+ public access disabled)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Service endpoint: public IP, backbone route, service firewall trusts your subnet.</li>
        <li>Private endpoint: a private IP in your subnet for one specific resource.</li>
        <li>Private endpoints work from peered and on-premises networks; service endpoints don't.</li>
        <li>With private endpoints you can switch public access off completely.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "With a service endpoint, which IP does the VM connect to?", options: ["A private IP in its subnet", "The service's public IP", "168.63.129.16", "The VNet gateway"], answer: 1, why: "Service endpoints keep the public endpoint; only the route and source identity change." },
        { q: "On-premises servers must reach a SQL database privately over ExpressRoute. Which feature?", options: ["Service endpoint", "Private endpoint", "NAT Gateway", "Public IP"], answer: 1, why: "Private endpoints are private IPs reachable over hybrid links." },
        { q: "Which better prevents exfiltration to an attacker's storage account?", options: ["Service endpoint", "Private endpoint", "Both equally", "Neither"], answer: 1, why: "A private endpoint maps to one specific resource." },
        { q: "After adding a private endpoint, what else is normally needed?", options: ["A public IP", "Private DNS so the name resolves to the private IP", "A VPN gateway", "A route table"], answer: 1, why: "Clients use the normal name; DNS must return the private address." },
      ]} />
    </>
  );
}
