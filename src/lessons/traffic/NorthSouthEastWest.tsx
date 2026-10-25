import { CityBlock } from "../../figures/CityBlock";
import { Quiz } from "../Quiz";

export default function NorthSouthEastWest() {
  return (
    <>
      <h1>North-south & east-west</h1>
      <p className="lede">
        Picture a data centre diagram with the internet at the top. Traffic that goes up and down, in and out of your environment, is <b>north-south</b>. Traffic that moves sideways, between your own servers, tiers and services, is <b>east-west</b>.
      </p>

      <CityBlock />

      <h2>Two kinds of traffic</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th className="c-amber">North-south</th><th className="c-teal">East-west</th></tr></thead>
          <tbody>
            <tr><td>Crosses</td><td>Your perimeter (internet, on-premises link)</td><td>Only internal boundaries: subnets, VNets, tiers</td></tr>
            <tr><td>Examples</td><td>Users browsing your site, VMs downloading updates</td><td>Web → API, API → database, VM ↔ VM backups, AD replication</td></tr>
            <tr><td>Volume</td><td>Usually the smaller share</td><td>Often the majority in modern multi-tier and microservice apps</td></tr>
            <tr><td>Classic control</td><td>Perimeter firewall, WAF, DDoS protection</td><td>NSGs, ASGs, internal firewalls, service mesh policy</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Why east-west needs guarding</h2>
      <p>
        A perimeter firewall is a city wall: excellent at the gate, blind inside. Once an attacker gets one machine (a phished laptop, a vulnerable web server), the next step is <b>lateral movement</b>: hopping sideways to the database, the domain controller, the backups. If nothing inspects east-west traffic, nothing stops it.
      </p>
      <div className="callout">
        <b>Zero Trust in one line:</b> don't trust traffic because it's "inside". Allow only the specific east-west paths each workload needs, and deny the rest.
      </div>

      <h2>Micro-segmentation in Azure</h2>
      <ul>
        <li><b>NSGs per subnet</b>: e.g. the data subnet only accepts 1433 from the app subnet, and denies everything else from the VNet.</li>
        <li><b>Application Security Groups (ASGs)</b> let rules say "asg-app → asg-db on 1433" instead of IP lists, so rules follow VMs as they scale.</li>
        <li><b>Azure Firewall in a hub</b> with UDRs can inspect traffic between spokes (VNet to VNet), giving east-west logging and FQDN/threat-intel filtering.</li>
        <li>Remember that the default <b>AllowVnetInBound</b> rule lets every subnet talk to every other. Segmentation means adding explicit denies above it.</li>
      </ul>

      <h2>Example tier rules</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>NSG on</th><th>Priority</th><th>Rule</th></tr></thead>
          <tbody>
            <tr><td>web subnet</td><td>100</td><td>Allow Internet → web : 443</td></tr>
            <tr><td>app subnet</td><td>100</td><td>Allow asg-web → asg-app : 8080</td></tr>
            <tr><td>data subnet</td><td>100</td><td>Allow asg-app → asg-db : 1433</td></tr>
            <tr><td>data subnet</td><td>4000</td><td>Deny VirtualNetwork → any (blocks web → data directly)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>North-south crosses your perimeter; east-west stays between your own workloads.</li>
        <li>The perimeter firewall never sees east-west traffic.</li>
        <li>Lateral movement is how breaches spread; micro-segmentation stops it.</li>
        <li>In Azure: NSGs + ASGs per tier, and a hub firewall for spoke-to-spoke inspection.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "Your API VM queries the database VM in another subnet. What kind of traffic is that?", options: ["North-south", "East-west", "Inbound internet", "Neither"], answer: 1, why: "It moves between your own workloads without crossing the perimeter." },
        { q: "Why can't a perimeter firewall alone stop lateral movement?", options: ["It's too slow", "East-west traffic never passes through it", "It only inspects UDP", "It blocks all traffic"], answer: 1, why: "Traffic between internal workloads doesn't cross the perimeter." },
        { q: "Which Azure feature lets an NSG rule say 'app servers to database servers' without listing IPs?", options: ["Service tags", "Application Security Groups", "Route tables", "Private DNS"], answer: 1, why: "ASGs group NICs by role so rules can reference them." },
        { q: "Which default NSG rule allows every subnet in a VNet to reach every other?", options: ["AllowInternetOutBound", "AllowVnetInBound", "DenyAllInBound", "AllowAzureLoadBalancerInBound"], answer: 1, why: "AllowVnetInBound (priority 65000) permits VNet-to-VNet traffic until you override it." },
      ]} />
    </>
  );
}
