import { NatPress } from "../../figures/NatPress";
import { fmt } from "../../models/cidr";
import { IDLE_TIMEOUT_MIN, SNAT_PORTS_PER_IP } from "../../models/nat";
import { Quiz } from "../Quiz";

export default function Nat() {
  return (
    <>
      <h1>NAT</h1>
      <p className="lede">
        Private addresses can't travel on the internet. <b>Network Address Translation</b> rewrites them at the edge: on the way out it swaps the private source for a public one and remembers the swap, so the reply can be swapped back. That's how a whole VNet, or your home, shares a handful of public IPs.
      </p>

      <NatPress />

      <h2>Kinds of NAT</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Kind</th><th>What changes</th><th>Typical use</th></tr></thead>
          <tbody>
            <tr><td><b className="c-amber">SNAT / PAT</b> (source NAT with port translation)</td><td>Source IP and port on the way out; many → one</td><td>Home routers, Azure NAT Gateway, load-balancer outbound rules</td></tr>
            <tr><td><b className="c-teal">DNAT</b> (destination NAT, port forwarding)</td><td>Destination IP/port on the way in</td><td>Publishing a server: public:443 → 10.0.1.4:443 (Azure LB inbound rules, Firewall DNAT)</td></tr>
            <tr><td><b>1:1 static NAT</b></td><td>One private IP ↔ one public IP</td><td>A public IP attached to a VM's NIC</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Why the stranger bounced</h2>
      <p>
        The gateway only knows where to send traffic it has a table entry for, and entries are only created by traffic going <b>out</b>. So SNAT gives you inbound protection as a side effect. To let the world <b>in</b> on purpose, you need DNAT or a public IP on the resource (with an NSG allowing it).
      </p>

      <h2>SNAT ports: the resource that runs out</h2>
      <p>
        Each outbound flow to the same destination IP and port needs its own public port. One public IP gives {fmt(SNAT_PORTS_PER_IP)} (1024–65535). An app that opens thousands of short-lived connections to one API can exhaust them, and new connections then fail or stall: <b>SNAT port exhaustion</b>.
      </p>
      <ul>
        <li>Reuse connections (HTTP keep-alive, connection pooling) instead of opening new ones.</li>
        <li>Add public IPs (or a prefix) to the NAT gateway: each adds another {fmt(SNAT_PORTS_PER_IP)} ports.</li>
        <li>Use Private Endpoints for Azure PaaS, so that traffic never needs SNAT at all.</li>
      </ul>

      <h2>Outbound NAT in Azure</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Option</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td><b>NAT Gateway</b></td><td>Recommended. Attach to a subnet; up to 16 public IPs; ports allocated on demand; TCP idle timeout {IDLE_TIMEOUT_MIN} min by default (configurable up to 120).</td></tr>
            <tr><td>Load balancer outbound rules</td><td>Ports pre-allocated per backend VM; easy to exhaust under load.</td></tr>
            <tr><td>Public IP on the VM</td><td>1:1, no shared ports, but every VM is directly exposed (lock it down with an NSG).</td></tr>
            <tr><td>Default outbound access</td><td>Implicit, unmanaged IP; being retired for new VNets. Don't depend on it.</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <b>Check what the world sees:</b> from a VM, run <code>curl ifconfig.me</code>. Behind a NAT gateway you'll get the gateway's public IP, never the VM's private one.
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>SNAT rewrites source IP:port on the way out and remembers the mapping for the reply.</li>
        <li>Many private hosts share one public IP; flows are told apart by port.</li>
        <li>Unsolicited inbound has no mapping, so it's dropped; use DNAT to publish services.</li>
        <li>SNAT ports are finite ({fmt(SNAT_PORTS_PER_IP)} per IP); pool connections and add IPs if needed.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "Two VMs behind one NAT gateway call the same API. How does the gateway tell the replies apart?", options: ["By MAC address", "By the public source port it assigned each flow", "By TTL", "It can't"], answer: 1, why: "PAT gives each flow its own public port and keeps the mapping in its table." },
        { q: "Someone on the internet sends a packet to the NAT gateway's public IP. What happens?", options: ["It reaches a random VM", "It reaches all VMs", "It's dropped: there's no matching outbound flow", "It's sent back to the sender"], answer: 2, why: "SNAT only translates replies to flows that were started from inside." },
        { q: "Your app's outbound calls start failing under load, and NAT metrics show ports at the limit. A good first fix?", options: ["Open more inbound ports", "Reuse connections / add public IPs to the NAT gateway", "Lower the DNS TTL", "Use a bigger VM size"], answer: 1, why: "That's SNAT port exhaustion; fewer new connections or more IPs both help." },
        { q: "You want 203.0.113.50:443 to reach 10.0.1.4:443. Which NAT is that?", options: ["SNAT", "DNAT (port forwarding)", "PAT", "None needed"], answer: 1, why: "Rewriting the destination of inbound traffic is DNAT." },
      ]} />
    </>
  );
}
