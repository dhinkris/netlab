import { Cloakroom } from "../../figures/Cloakroom";
import { Quiz } from "../Quiz";

export default function Stateful() {
  return (
    <>
      <h1>Stateful vs stateless filtering</h1>
      <p className="lede">
        Every firewall checks packets against rules. The difference is memory. A <b>stateful</b> firewall remembers the connections it has allowed and recognises their returning packets. A <b>stateless</b> filter has no memory, so it judges each packet on its own.
      </p>

      <Cloakroom />

      <h2>What "state" is</h2>
      <p>
        When the first packet of a flow is allowed, a stateful firewall writes an entry in its <b>connection table</b> keyed by the 5-tuple: protocol, source IP and port, destination IP and port. Every later packet, in either direction, that matches the entry is passed without re-checking the rules. The entry is removed when the connection closes (TCP FIN/RST) or goes idle long enough.
      </p>

      <h2>Side by side</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th className="c-violet">Stateful</th><th>Stateless</th></tr></thead>
          <tbody>
            <tr><td>Return traffic</td><td>Allowed automatically</td><td>Needs its own rule (usually inbound ephemeral ports)</td></tr>
            <tr><td>Unsolicited inbound to high ports</td><td>Dropped: no matching connection</td><td>Allowed if the return rule is broad</td></tr>
            <tr><td>Rules you write</td><td>One per flow, for the first packet</td><td>Two per flow, one each way</td></tr>
            <tr><td>Cost</td><td>Memory per connection; table can fill under attack</td><td>Very cheap, line-rate</td></tr>
            <tr><td>Examples</td><td>Azure NSG, Azure Firewall, most host firewalls</td><td>Router ACLs, AWS network ACLs, simple packet filters</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <b>Azure NSGs are stateful.</b> Allow inbound 443 and the responses go out; allow outbound to the internet and the responses come in. You never need "allow inbound 1024–65535" for replies, and you shouldn't add it.
      </div>

      <h2>Idle timeouts</h2>
      <p>
        Connection-table entries don't live forever. An idle TCP connection eventually ages out, and the next packet on it no longer matches anything. In Azure the default idle timeout is 4 minutes for both NAT Gateway and Load Balancer. Long-lived quiet connections (database pools, websockets) should send TCP keepalives more often than that.
      </p>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Stateful = remembers allowed connections by 5-tuple; replies pass automatically.</li>
        <li>Stateless = judges every packet alone; return traffic needs explicit rules.</li>
        <li>Broad "allow high ports in" rules for stateless filters are a security hole.</li>
        <li>NSGs and Azure Firewall are stateful; idle connections time out (4 min default on NAT Gateway and Load Balancer).</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "An NSG allows outbound 443. Do you need an inbound rule for the responses?", options: ["Yes, 1024–65535", "Yes, 443", "No, NSGs are stateful", "Only for UDP"], answer: 2, why: "The response matches the allowed outbound flow's state." },
        { q: "With a stateless filter, what does 'allow inbound TCP 1024–65535' also permit?", options: ["Nothing extra", "Unsolicited connections to any high port", "Only DNS", "Only ICMP"], answer: 1, why: "Without state, the filter can't tell replies from new connections." },
        { q: "What identifies an entry in a connection table?", options: ["The MAC address", "The 5-tuple", "The TTL", "The DNS name"], answer: 1, why: "Protocol, source IP and port, destination IP and port." },
        { q: "A database connection through a NAT Gateway dies after ~4 idle minutes. Why?", options: ["DNS TTL expired", "The connection's state entry timed out", "The VM rebooted", "MTU mismatch"], answer: 1, why: "Idle flows age out of the connection table; use keepalives or raise the timeout." },
      ]} />
    </>
  );
}
