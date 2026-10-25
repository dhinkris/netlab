import { AllowLock } from "../../figures/AllowLock";
import { Quiz } from "../Quiz";

export default function EgressIps() {
  return (
    <>
      <h1>Egress IPs & allow-listing</h1>
      <p className="lede">
        Many partners, SaaS vendors and on-premises firewalls only accept traffic from source IPs they have been told about. That makes your <b>egress IPs</b> part of your contract with them: they must be known, owned by you, and stable.
      </p>

      <AllowLock />

      <h2>What makes a good egress IP</h2>
      <ul>
        <li><b>Static</b>: a Standard SKU public IP is static by design; it survives restarts and redeployments.</li>
        <li><b>Shared</b>: every VM that talks to the partner should leave through the same few IPs, which is what NAT Gateway (or a hub firewall) gives you.</li>
        <li><b>Contiguous</b>: a <b>public IP prefix</b> (e.g. a /30 = 4 addresses, up to /28 for NAT Gateway) lets you add capacity without asking every partner to update their list.</li>
        <li><b>Yours</b>: never give partners a default-outbound address; you don't own it and it can change.</li>
      </ul>

      <h2>Patterns</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Need</th><th>Do this</th></tr></thead>
          <tbody>
            <tr><td>One app subnet to a partner</td><td>NAT Gateway on the subnet with a static public IP</td></tr>
            <tr><td>Many spokes, one set of egress IPs</td><td>Route 0.0.0.0/0 to the hub's Azure Firewall; give the partner the firewall's public IPs (or its prefix)</td></tr>
            <tr><td>Room to grow</td><td>Public IP prefix attached to the NAT Gateway; register the whole prefix</td></tr>
            <tr><td>Partner can't take a list at all</td><td>Site-to-site VPN or ExpressRoute and private addressing instead</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <b>Check what you look like:</b> from a VM, <code>curl ifconfig.me</code> (or any what's-my-IP service) shows the address the outside world sees. Do this before you send the list to a partner.
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Allow-lists bind partners to your source IPs, so those IPs must be static and yours.</li>
        <li>NAT Gateway or a hub firewall funnels many VMs through a few known IPs.</li>
        <li>Public IP prefixes let you add addresses without changing partners' lists.</li>
        <li>Default outbound IPs are unsuitable for allow-listing.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "You scale from 3 to 10 VMs, each with its own public IP, calling an allow-listed API. What breaks?", options: ["Nothing", "The 7 new VMs, whose IPs aren't on the list", "DNS", "TLS"], answer: 1, why: "Each new instance-level IP would need adding to the partner's list." },
        { q: "Which gives a partner one stable source IP for a whole subnet?", options: ["Default outbound", "NAT Gateway with a static public IP", "Dynamic Basic public IPs", "Service endpoints"], answer: 1, why: "All VMs in the subnet leave through the NAT Gateway's IP." },
        { q: "Why register a public IP prefix rather than single addresses?", options: ["It's cheaper", "You can add IPs from it later without the partner changing anything", "Prefixes encrypt traffic", "Partners require /24s"], answer: 1, why: "Any address in the registered prefix is already allowed." },
        { q: "Your hub firewall handles all egress. Which IPs do you give partners?", options: ["Each VM's private IP", "The firewall's public IPs", "The VNet address space", "168.63.129.16"], answer: 1, why: "Traffic leaves SNATed to the firewall's public IPs." },
      ]} />
    </>
  );
}
