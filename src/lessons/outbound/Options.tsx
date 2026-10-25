import { Mailroom } from "../../figures/Mailroom";
import { Quiz } from "../Quiz";

export default function Options() {
  return (
    <>
      <h1>Outbound options</h1>
      <p className="lede">
        A VM with only a private IP still needs to reach the internet for updates, APIs and package registries. Something has to translate its private address into a public one. Azure gives you four ways, and they differ more than they first appear.
      </p>

      <Mailroom />

      <h2>The four options</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Option</th><th>How it works</th><th>Use it when</th></tr></thead>
          <tbody>
            <tr><td><b>Default outbound access</b></td><td>Azure silently SNATs to an IP it owns</td><td>Never on purpose. Microsoft is retiring it: new VNets default to private subnets with no implicit outbound.</td></tr>
            <tr><td><b className="c-blue">Instance-level public IP</b></td><td>The VM's NIC has its own public IP; outbound uses it with all ports</td><td>A single appliance that must also be reachable inbound (and is locked down by NSG)</td></tr>
            <tr><td><b className="c-violet">Load balancer outbound rules</b></td><td>Backends share the LB's frontend IPs; each gets a fixed block of SNAT ports</td><td>You already use a Standard LB and outbound volume is modest</td></tr>
            <tr><td><b className="c-teal">NAT Gateway</b></td><td>Attached to subnets; all VMs share up to 16 IPs (or a prefix); ports allocated on demand</td><td>The default choice for outbound from private subnets</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Precedence</h2>
      <p>If more than one applies to a VM, Azure uses the first available in this order:</p>
      <ol>
        <li>NAT Gateway on the subnet</li>
        <li>Instance-level public IP on the NIC</li>
        <li>Load balancer outbound rules</li>
        <li>Default outbound access</li>
      </ol>
      <div className="callout">
        <b>Going through a firewall instead?</b> In hub-and-spoke designs a 0.0.0.0/0 UDR sends outbound traffic to Azure Firewall, which SNATs to its own public IPs. Putting a NAT Gateway on the AzureFirewallSubnet gives the firewall more SNAT ports.
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Private VMs need SNAT to reach the internet; the option decides which public IP they appear as.</li>
        <li>Default outbound is unpredictable and being retired; don't depend on it.</li>
        <li>NAT Gateway is the recommended way: outbound-only, stable IPs, on-demand ports.</li>
        <li>Precedence: NAT Gateway, then instance public IP, then LB outbound rules, then default.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "A subnet has a NAT Gateway, and one VM in it also has a public IP. Which does that VM use for outbound?", options: ["Its public IP", "The NAT Gateway", "Both, alternately", "Default outbound"], answer: 1, why: "NAT Gateway takes precedence over an instance-level public IP for outbound." },
        { q: "Why avoid default outbound access?", options: ["It's slow", "The IP isn't yours, can change, and the feature is being retired", "It blocks HTTPS", "It needs a VPN"], answer: 1, why: "You can't control or allow-list it, and new VNets won't have it." },
        { q: "Which option also exposes the VM to inbound internet traffic?", options: ["NAT Gateway", "LB outbound rules", "Instance-level public IP", "None of them"], answer: 2, why: "A public IP on the NIC is reachable inbound (subject to NSG)." },
        { q: "What does a NAT Gateway attach to?", options: ["A VM", "A NIC", "A subnet", "A route table"], answer: 2, why: "NAT Gateway is associated with subnets." },
      ]} />
    </>
  );
}
