import { CastleGate } from "../../figures/CastleGate";
import { Quiz } from "../Quiz";

export default function InboundOutbound() {
  return (
    <>
      <h1>Inbound & outbound</h1>
      <p className="lede">
        "Inbound" and "outbound" sound like they describe packets, but they really describe <b>flows</b>. A flow's direction is set by whoever sends the first packet, relative to the boundary you're standing at: a VNet, a subnet, or a NIC.
      </p>

      <CastleGate />

      <h2>One flow, two directions of packets</h2>
      <p>
        Every TCP connection has packets going both ways. When <code>vm-app</code> calls an API on the internet, the request leaves the VNet and the response arrives in it, yet the whole conversation is one <b>outbound</b> flow. When a browser on the internet reaches <code>vm-web</code>, the request arrives and the response leaves, and that is one <b>inbound</b> flow.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Flow</th><th>First packet</th><th>Rule you write</th><th>Replies</th></tr></thead>
          <tbody>
            <tr><td><b className="c-teal">Outbound</b></td><td>Inside → outside</td><td>Outbound allow (Azure allows internet by default)</td><td>Allowed back in automatically</td></tr>
            <tr><td><b className="c-amber">Inbound</b></td><td>Outside → inside</td><td>Inbound allow for that port and destination</td><td>Allowed back out automatically</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <b>"Inbound" depends on where you stand.</b> Traffic from subnet A to subnet B is outbound for A's NSG and inbound for B's NSG. Both must allow it.
      </div>

      <h2>What each direction needs in Azure</h2>
      <ul>
        <li><b>Inbound from the internet</b> needs a public entry point (a public IP on the VM, a load balancer, Application Gateway, or Bastion) <i>and</i> an NSG rule allowing the port. NSGs deny inbound internet traffic by default.</li>
        <li><b>Outbound to the internet</b> needs an outbound path: NAT Gateway (recommended), a load balancer outbound rule, or a public IP on the VM. NSGs allow it by default (AllowInternetOutBound).</li>
        <li><b>Inside the VNet</b>, the default rule AllowVnetInBound lets every subnet reach every other, which is why east-west segmentation is a deliberate choice (next lesson).</li>
      </ul>

      <h2>Default NSG rules</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Direction</th><th>Priority</th><th>Name</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>Inbound</td><td>65000</td><td>AllowVnetInBound</td><td>Allow</td></tr>
            <tr><td>Inbound</td><td>65001</td><td>AllowAzureLoadBalancerInBound</td><td>Allow</td></tr>
            <tr><td>Inbound</td><td>65500</td><td>DenyAllInBound</td><td>Deny</td></tr>
            <tr><td>Outbound</td><td>65000</td><td>AllowVnetOutBound</td><td>Allow</td></tr>
            <tr><td>Outbound</td><td>65001</td><td>AllowInternetOutBound</td><td>Allow</td></tr>
            <tr><td>Outbound</td><td>65500</td><td>DenyAllOutBound</td><td>Deny</td></tr>
          </tbody>
        </table>
      </div>
      <p>Your rules use priorities 100–4096 and are evaluated lowest number first; the first match wins.</p>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Direction belongs to the flow and is set by the first packet.</li>
        <li>Replies don't need their own rule; the platform tracks the flow.</li>
        <li>Inbound from the internet is denied by default; outbound is allowed by default.</li>
        <li>Between subnets, the source NSG sees outbound and the destination NSG sees inbound.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "A VM downloads updates from the internet. Which direction is that flow?", options: ["Inbound", "Outbound", "Both", "Neither"], answer: 1, why: "The VM sent the first packet, so the flow is outbound, even though most bytes arrive." },
        { q: "You allow inbound TCP 443 to vm-web. Do you also need an outbound rule for its responses?", options: ["Yes, for ports 1024–65535", "No, replies are part of the allowed flow", "Only for UDP", "Only on Linux"], answer: 1, why: "NSGs are stateful; the response belongs to the allowed inbound flow." },
        { q: "Traffic goes from subnet A to subnet B. Which NSGs evaluate it?", options: ["Only A's, outbound", "Only B's, inbound", "A's outbound and B's inbound", "Neither"], answer: 2, why: "It leaves A and enters B, so both NSGs see it, from opposite sides." },
        { q: "Nobody on the internet can reach your VM on 443, though the NSG allows it. What else might be missing?", options: ["An outbound rule", "A public IP or load balancer", "A DNS MX record", "A bigger VM"], answer: 1, why: "Inbound internet traffic needs a public entry point as well as an allow rule." },
      ]} />
    </>
  );
}
