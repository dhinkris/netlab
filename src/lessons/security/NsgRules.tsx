import { RuleBoard } from "../../figures/RuleBoard";
import { Quiz } from "../Quiz";

export default function NsgRules() {
  return (
    <>
      <h1>NSG rules & priority</h1>
      <p className="lede">
        A <b>network security group</b> is a list of allow and deny rules attached to a subnet or a NIC. For every new flow, Azure walks the list in priority order and stops at the first rule that matches.
      </p>

      <RuleBoard />

      <h2>Anatomy of a rule</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Field</th><th>Values</th></tr></thead>
          <tbody>
            <tr><td><b>Priority</b></td><td>100–4096 for your rules; lower number = checked first. Must be unique per direction.</td></tr>
            <tr><td><b>Source / destination</b></td><td>IP or CIDR, a <b>service tag</b> (Internet, VirtualNetwork, AzureLoadBalancer, Storage…), or an <b>ASG</b></td></tr>
            <tr><td><b>Ports</b></td><td>Single (443), range (1024–2048), list, or * (any)</td></tr>
            <tr><td><b>Protocol</b></td><td>TCP, UDP, ICMP or Any</td></tr>
            <tr><td><b>Action</b></td><td>Allow or Deny</td></tr>
          </tbody>
        </table>
      </div>

      <h2>How evaluation works</h2>
      <ol>
        <li>Rules for the right direction (inbound or outbound) are sorted by priority.</li>
        <li>The first rule matching the flow decides; evaluation stops there.</li>
        <li>If none of your rules match, the default rules at 65000+ apply: allow VNet, allow Azure LB, deny everything else.</li>
        <li>NSGs are stateful: the decision covers the reply traffic too.</li>
      </ol>
      <div className="callout">
        <b>Subnet and NIC NSGs stack.</b> Inbound traffic is checked by the subnet's NSG first, then the NIC's; outbound the other way round. It must be allowed by both. Check <b>Effective security rules</b> on the NIC to see the combined result.
      </div>

      <h2>Good habits</h2>
      <ul>
        <li>Leave gaps between priorities (100, 200, 300…) so you can insert rules later.</li>
        <li>Put specific denies <b>above</b> broad allows, and remember the default AllowVnetInBound lets every subnet in.</li>
        <li>Never allow 22 or 3389 from Internet; use Azure Bastion or just-in-time access.</li>
        <li>Turn on <b>flow logs</b> to see which rule actually matched real traffic.</li>
      </ul>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Lowest priority number is checked first; the first match wins.</li>
        <li>Default rules (65000+) allow VNet and load-balancer traffic and deny the rest.</li>
        <li>Subnet and NIC NSGs both apply; check effective rules.</li>
        <li>Rules can use IPs, service tags or ASGs.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "Rule 200 denies TCP 22 from any; rule 150 allows TCP 22 from 10.0.5.0/24. What happens to SSH from 10.0.5.9?", options: ["Denied by 200", "Allowed by 150", "Both apply", "Default deny"], answer: 1, why: "150 is checked before 200 and matches, so evaluation stops there." },
        { q: "No custom rule matches traffic from another subnet in the same VNet. What decides?", options: ["DenyAllInBound", "AllowVnetInBound", "Nothing; it's dropped silently", "The route table"], answer: 1, why: "AllowVnetInBound (65000) is checked before DenyAllInBound (65500)." },
        { q: "Traffic is allowed by the subnet NSG but denied by the NIC NSG. Does it reach the VM?", options: ["Yes", "No", "Only replies", "Only for TCP"], answer: 1, why: "It must be allowed by both NSGs in its path." },
        { q: "Which service tag would you use to allow Azure health probes?", options: ["Internet", "VirtualNetwork", "AzureLoadBalancer", "Storage"], answer: 2, why: "Health probes come from the AzureLoadBalancer tag (168.63.129.16)." },
      ]} />
    </>
  );
}
