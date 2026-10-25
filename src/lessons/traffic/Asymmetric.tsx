import { TwoBridges } from "../../figures/TwoBridges";
import { Quiz } from "../Quiz";

export default function Asymmetric() {
  return (
    <>
      <h1>Asymmetric routing</h1>
      <p className="lede">
        Routing is decided separately for each direction: the request follows the sender's route table, the reply follows the receiver's. When the two take different paths, and a <b>stateful</b> device sits on only one of them, connections break in confusing ways.
      </p>

      <TwoBridges />

      <h2>Why it breaks</h2>
      <ol>
        <li>The client's SYN goes through the firewall, which records a new connection.</li>
        <li>The server's SYN-ACK takes a different path, so the firewall never sees it.</li>
        <li>The client's next packet (ACK, then data) arrives at the firewall. From the firewall's point of view, the handshake never completed, so the packet is <b>out of state</b> and dropped.</li>
      </ol>
      <p>Symptoms: TCP connections time out or hang right after connecting; ping (stateless ICMP through some devices) may still work, which makes it look like the network is fine.</p>

      <h2>Where it happens in Azure</h2>
      <ul>
        <li><b>A UDR on one subnet only.</b> Subnet A sends to subnet B via a firewall NVA, but subnet B replies straight back using the system route.</li>
        <li><b>Spoke-to-spoke via a hub firewall</b>, where only one spoke's route table points at the firewall.</li>
        <li><b>A public IP on a VM behind a firewall</b>: inbound arrives directly on the public IP, but the 0.0.0.0/0 UDR sends replies to the firewall, which never saw the request.</li>
        <li><b>Multiple NVAs behind a load balancer</b> without session affinity, where each direction lands on a different instance.</li>
      </ul>

      <h2>How to fix it</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Fix</th><th>How</th></tr></thead>
          <tbody>
            <tr><td>Route both directions</td><td>Put a UDR on <b>each</b> subnet pointing at the firewall for the other side's prefix (e.g. A: 10.1.2.0/24 → NVA, B: 10.1.1.0/24 → NVA).</td></tr>
            <tr><td>Watch the prefix lengths</td><td>A 0.0.0.0/0 UDR does <b>not</b> catch intra-VNet traffic: the VNet's own route is more specific. Use the subnet or VNet prefix.</td></tr>
            <tr><td>Don't mix public IPs with forced tunnelling</td><td>Publish inbound through the firewall (DNAT) or a load balancer, not a VM public IP.</td></tr>
            <tr><td>Keep NVA pairs symmetric</td><td>Use a load balancer with HA ports (it keeps a flow on one instance), or SNAT on the NVA.</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <b>Check it:</b> Network Watcher's <b>Next hop</b> tool, run from <i>both</i> VMs toward each other, shows instantly whether the two directions take the same path.
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Each direction is routed independently, by the sender's route table.</li>
        <li>Stateful firewalls must see both directions, or they drop packets as out of state.</li>
        <li>Fix by routing both subnets through the firewall, with prefixes specific enough to win.</li>
        <li>Classic symptom: connects, then hangs; verify with Next hop from both sides.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "Subnet A has a UDR sending 10.1.2.0/24 to a firewall; subnet B has no UDR. What happens to B's replies?", options: ["They go through the firewall", "They go directly to A via the system route", "They're dropped by Azure", "They go to the internet"], answer: 1, why: "B's own route table decides its outgoing path, and without a UDR that's the direct VNet route." },
        { q: "Why does the firewall drop the client's ACK in that case?", options: ["ACKs are always blocked", "It never saw the SYN-ACK, so the packet is out of state", "The TTL expired", "Port 1433 is closed"], answer: 1, why: "Stateful devices track the handshake; a missing direction breaks it." },
        { q: "You add UDR 0.0.0.0/0 → firewall on both subnets. Does subnet A → B traffic now go through the firewall?", options: ["Yes", "No: the VNet route (/16) is more specific than /0", "Only UDP", "Only for return traffic"], answer: 1, why: "Longest-prefix match prefers the VNet's address-space route." },
        { q: "Which tool quickly confirms whether both directions use the same path?", options: ["nslookup", "Network Watcher Next hop, from both VMs", "ping", "arp -a"], answer: 1, why: "Next hop shows the route each VM would use toward the other." },
      ]} />
    </>
  );
}
