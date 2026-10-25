import { AsgBoard } from "../../figures/AsgBoard";
import { Quiz } from "../Quiz";

export default function Asgs() {
  return (
    <>
      <h1>ASGs & service tags</h1>
      <p className="lede">
        IP addresses are a fragile way to describe who may talk to whom: VMs scale, get rebuilt, change address. Azure gives NSG rules two kinds of <b>names</b> instead. <b>Application security groups</b> name your own workloads by role; <b>service tags</b> name Azure's and the internet's address ranges.
      </p>

      <AsgBoard />

      <h2>Application security groups</h2>
      <ul>
        <li>An ASG is an empty label (asg-web, asg-app, asg-db) created in a VNet's region.</li>
        <li>You attach NICs to it: a NIC can be in several ASGs.</li>
        <li>NSG rules use ASGs as source or destination: <code>asg-app → asg-db : 1433 Allow</code>.</li>
        <li>New VMs inherit access by joining the group. No rule changes, no IP lists to maintain.</li>
      </ul>
      <div className="callout">
        <b>Limits worth knowing:</b> all NICs in an ASG must be in the same VNet, and a rule's source and destination ASGs must be in the same VNet too. For cross-VNet rules, fall back to CIDRs or use Azure Firewall.
      </div>

      <h2>Service tags</h2>
      <p>Service tags are Microsoft-maintained groups of IP prefixes, updated automatically as Azure changes:</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Tag</th><th>Means</th><th>Typical use</th></tr></thead>
          <tbody>
            <tr><td><code>VirtualNetwork</code></td><td>Your VNet's address space, peered VNets, on-premises via gateway</td><td>Default intra-VNet allow</td></tr>
            <tr><td><code>Internet</code></td><td>Public IP space outside Azure's own</td><td>Inbound web traffic</td></tr>
            <tr><td><code>AzureLoadBalancer</code></td><td>The platform's health-probe source (168.63.129.16)</td><td>Allow probes</td></tr>
            <tr><td><code>Storage</code>, <code>Sql</code>, <code>AzureKeyVault</code>…</td><td>Public endpoints of that service (optionally per region, e.g. <code>Storage.WestEurope</code>)</td><td>Outbound to PaaS without opening the whole internet</td></tr>
            <tr><td><code>AzureMonitor</code>, <code>AzureActiveDirectory</code></td><td>Platform services agents talk to</td><td>Locked-down outbound</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Putting it together</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Prio</th><th>Source</th><th>Destination</th><th>Port</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>100</td><td>Internet</td><td>asg-web</td><td>443</td><td>Allow</td></tr>
            <tr><td>110</td><td>asg-web</td><td>asg-app</td><td>8080</td><td>Allow</td></tr>
            <tr><td>120</td><td>asg-app</td><td>asg-db</td><td>1433</td><td>Allow</td></tr>
            <tr><td>4000</td><td>VirtualNetwork</td><td>VirtualNetwork</td><td>*</td><td>Deny</td></tr>
          </tbody>
        </table>
      </div>
      <p>One NSG on every subnet can carry these same four rules. The ASGs, not the subnet layout, decide who talks to whom.</p>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>ASGs label NICs by role; rules reference labels, not IPs.</li>
        <li>Scaling out needs no rule change: new NICs just join the ASG.</li>
        <li>Service tags name Microsoft-managed IP ranges (Internet, Storage, AzureLoadBalancer…).</li>
        <li>ASGs work within one VNet.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "You add a fourth web VM. With rules written using asg-web, what must you change?", options: ["Every rule's IP list", "Nothing: add its NIC to asg-web", "The subnet size", "The route table"], answer: 1, why: "Rules reference the group; membership is what changes." },
        { q: "Which service tag lets outbound traffic reach Azure Storage without opening the whole internet?", options: ["Internet", "VirtualNetwork", "Storage", "AzureLoadBalancer"], answer: 2, why: "The Storage tag covers Azure Storage's public endpoints." },
        { q: "Can an ASG contain NICs from two different VNets?", options: ["Yes", "No", "Only if peered", "Only in different regions"], answer: 1, why: "All members of an ASG must be in the same VNet." },
        { q: "Rule: asg-web → asg-db 1433 doesn't exist; rule 4000 denies VirtualNetwork → VirtualNetwork. What happens to web → db traffic?", options: ["Allowed by AllowVnetInBound", "Denied by rule 4000", "Allowed because both are in the VNet", "Depends on the route table"], answer: 1, why: "Rule 4000 is checked before the 65000 default allow." },
      ]} />
    </>
  );
}
