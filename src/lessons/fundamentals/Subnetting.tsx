import { useState } from "react";
import { MaskCaliper } from "../../figures/MaskCaliper";
import { fmt, subnet } from "../../models/cidr";
import { parseIp, type Octets } from "../../models/ip";
import { Quiz } from "../Quiz";

export default function Subnetting() {
  const [draft, setDraft] = useState("10.0.1.4");
  const [ip, setIp] = useState<Octets>([10, 0, 1, 4]);
  const [prefix, setPrefix] = useState(24);
  const s = subnet(ip, prefix);
  return (
    <>
      <h1>Subnetting & CIDR</h1>
      <p className="lede">
        An address on its own doesn't say which network it belongs to. The <b>prefix length</b> (the <code>/24</code> in <code>10.0.1.0/24</code>) does: it says how many of the 32 bits, counted from the left, name the network. The rest name the host.
      </p>

      <MaskCaliper ip={ip} onPrefix={setPrefix} />

      <h2>Try it on a real address</h2>
      <div className="controls" style={{ marginBottom: 6 }}>
        <label className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>Address</label>
        <input className="ctl-input" value={draft} aria-label="Address"
          style={{ borderColor: parseIp(draft) ? undefined : "var(--warn)" }}
          onChange={(e) => { setDraft(e.target.value); const p = parseIp(e.target.value); if (p) setIp(p); }} />
        <span className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>/{prefix} (move the caliper)</span>
      </div>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr><th>CIDR block</th><td><code>{s.network}/{prefix}</code></td></tr>
            <tr><th>Subnet mask</th><td><code>{s.mask}</code></td></tr>
            <tr><th>Network address</th><td><code>{s.network}</code> (first address, identifies the subnet)</td></tr>
            <tr><th>Usable range</th><td><code>{s.first}</code> – <code>{s.last}</code></td></tr>
            <tr><th>Broadcast</th><td><code>{s.broadcast}</code> (last address)</td></tr>
            <tr><th>Addresses</th><td>{fmt(s.total)} total · {fmt(s.usable)} usable · {fmt(s.azureUsable)} usable in Azure</td></tr>
          </tbody>
        </table>
      </div>

      <h2>The mask is the prefix, written as an address</h2>
      <p>
        A subnet mask has a 1 for every network bit and a 0 for every host bit. <code>/24</code> is twenty-four 1s: <code>11111111.11111111.11111111.00000000</code> = <code>255.255.255.0</code>. To find the network an address belongs to, AND the address with the mask: every host bit is forced to zero.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Prefix</th><th>Mask</th><th>Addresses</th><th>Where you'll see it</th></tr></thead>
          <tbody>
            <tr><td>/8</td><td>255.0.0.0</td><td>16,777,216</td><td>All of 10.x.x.x</td></tr>
            <tr><td>/16</td><td>255.255.0.0</td><td>65,536</td><td>A typical Azure VNet (10.0.0.0/16)</td></tr>
            <tr><td>/24</td><td>255.255.255.0</td><td>256</td><td>A typical subnet</td></tr>
            <tr><td>/26</td><td>255.255.255.192</td><td>64</td><td>Minimum for Azure Bastion (AzureBastionSubnet)</td></tr>
            <tr><td>/27</td><td>255.255.255.224</td><td>32</td><td>Recommended minimum for GatewaySubnet</td></tr>
            <tr><td>/29</td><td>255.255.255.248</td><td>8</td><td>Smallest subnet Azure allows</td></tr>
            <tr><td>/32</td><td>255.255.255.255</td><td>1</td><td>A single host in NSG rules and routes</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Splitting a network</h2>
      <p>
        Each extra prefix bit halves the block. A <code>/16</code> VNet splits into two <code>/17</code>s, four <code>/18</code>s… or 256 <code>/24</code>s. A common Azure layout carves one VNet into purpose-built subnets:
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Subnet</th><th>CIDR</th><th>Usable in Azure</th></tr></thead>
          <tbody>
            <tr><td>VNet</td><td><code>10.0.0.0/16</code></td><td>—</td></tr>
            <tr><td>snet-web</td><td><code>10.0.1.0/24</code></td><td>251</td></tr>
            <tr><td>snet-app</td><td><code>10.0.2.0/24</code></td><td>251</td></tr>
            <tr><td>snet-data</td><td><code>10.0.3.0/24</code></td><td>251</td></tr>
            <tr><td>AzureBastionSubnet</td><td><code>10.0.250.0/26</code></td><td>59</td></tr>
            <tr><td>GatewaySubnet</td><td><code>10.0.255.0/27</code></td><td>27</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <b>Azure reserves 5 addresses per subnet:</b> <code>.0</code> network, <code>.1</code> default gateway, <code>.2</code> and <code>.3</code> Azure DNS mapping, and the last one (broadcast). So a /24 gives you 251, not 254.
      </div>
      <div className="callout">
        <b>Plan for peering early.</b> Two VNets with overlapping ranges (both 10.0.0.0/16, say) can never be peered or connected by VPN. Give every VNet and on-premises site its own non-overlapping block from day one.
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>/n = n network bits; 32 − n host bits; 2<sup>32−n</sup> addresses.</li>
        <li>The mask is the prefix written in dotted decimal (/24 = 255.255.255.0).</li>
        <li>Network address = address AND mask; broadcast = all host bits set to 1.</li>
        <li>Usable = total − 2 classically, total − 5 in Azure.</li>
        <li>A larger prefix number means a smaller network.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "How many addresses are in a /27?", options: ["16", "27", "32", "64"], answer: 2, why: "32 − 27 = 5 host bits, and 2⁵ = 32." },
        { q: "What is the mask for /20?", options: ["255.255.240.0", "255.255.255.240", "255.255.224.0", "255.240.0.0"], answer: 0, why: "20 ones = 8 + 8 + 4, and the third octet 11110000 = 240." },
        { q: "Which network does 10.0.1.200/25 belong to?", options: ["10.0.1.0/25", "10.0.1.128/25", "10.0.0.0/25", "10.0.1.192/25"], answer: 1, why: "A /25 splits .0–.127 and .128–.255, and 200 is in the upper half." },
        { q: "How many usable addresses does an Azure /28 subnet have?", options: ["16", "14", "11", "8"], answer: 2, why: "16 − 5 reserved by Azure = 11." },
      ]} />
    </>
  );
}
