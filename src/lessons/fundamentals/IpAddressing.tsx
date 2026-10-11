import { AddressRegister } from "../../figures/AddressRegister";
import { Quiz } from "../Quiz";

export default function IpAddressing() {
  return (
    <>
      <h1>IP addressing</h1>
      <p className="lede">
        An IPv4 address is just a 32-bit number. We write it as four 8-bit <b>octets</b> in decimal, separated by dots, because <code>11000000101010000000000100001010</code> is hard to read and <code>192.168.1.10</code> is not.
      </p>

      <AddressRegister />

      <h2>Reading an octet</h2>
      <p>
        Each octet has 8 bits, worth 128, 64, 32, 16, 8, 4, 2 and 1 from left to right. Add up the bits that are on. So an octet runs from <code>0</code> (all off) to <code>255</code> (all on), which is why you never see <code>192.168.1.300</code>.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Decimal</th><th>Binary</th><th>Sum</th></tr></thead>
          <tbody>
            <tr><td>192</td><td><code>11000000</code></td><td>128 + 64</td></tr>
            <tr><td>168</td><td><code>10101000</code></td><td>128 + 32 + 8</td></tr>
            <tr><td>10</td><td><code>00001010</code></td><td>8 + 2</td></tr>
            <tr><td>255</td><td><code>11111111</code></td><td>all eight</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Private vs public</h2>
      <p>
        <b>Public</b> addresses are unique on the whole internet and routable from anywhere. <b>Private</b> addresses (RFC 1918) can be reused inside every home, office and cloud network. Routers on the internet drop them, so to reach the internet a private host goes through <b>NAT</b>, which you'll meet in the outbound-connectivity topic.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Range</th><th>CIDR</th><th>Addresses</th><th>Typical use</th></tr></thead>
          <tbody>
            <tr><td>10.0.0.0 – 10.255.255.255</td><td><code>10.0.0.0/8</code></td><td>16,777,216</td><td>Large enterprises, Azure VNets (e.g. 10.0.0.0/16)</td></tr>
            <tr><td>172.16.0.0 – 172.31.255.255</td><td><code>172.16.0.0/12</code></td><td>1,048,576</td><td>Corporate LANs, Docker's default bridge</td></tr>
            <tr><td>192.168.0.0 – 192.168.255.255</td><td><code>192.168.0.0/16</code></td><td>65,536</td><td>Home routers</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Special addresses worth knowing</h2>
      <ul>
        <li><code>127.0.0.1</code>: <b>loopback</b>. Traffic never leaves the machine.</li>
        <li><code>169.254.x.x</code>: <b>link-local</b>. A host gives itself one when DHCP fails. In Azure, <code>169.254.169.254</code> is the Instance Metadata Service and <code>168.63.129.16</code> is the platform's virtual IP for DNS and health probes.</li>
        <li><code>0.0.0.0</code>: "any address". A server listening on 0.0.0.0 accepts connections on every interface; in a route table, <code>0.0.0.0/0</code> means "everything else" (the default route).</li>
        <li><code>255.255.255.255</code>: broadcast to everyone on the local link.</li>
        <li><code>100.64.0.0/10</code>: carrier-grade NAT space used by ISPs.</li>
      </ul>

      <div className="callout">
        <b>Classes are history.</b> The old Class A/B/C scheme (by first octet) was replaced by CIDR in 1993. You'll still hear "Class C" used loosely to mean a <code>/24</code>, but routing ignores classes completely. The next lesson covers what replaced them.
      </div>

      <h2>A word on IPv6</h2>
      <p>
        IPv4 has only 2<sup>32</sup> ≈ 4.3 billion addresses, and they ran out years ago. IPv6 uses 128 bits written as eight groups of hex, like <code>2001:db8:85a3::8a2e:370:7334</code> (<code>::</code> stands for a run of zero groups). Azure VNets can be dual-stack, but IPv4 is still what you'll configure most.
      </p>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>IPv4 = 32 bits = 4 octets, each 0–255.</li>
        <li>An octet's value is the sum of its place values (128 … 1).</li>
        <li>10/8, 172.16/12 and 192.168/16 are private; everything not reserved is public.</li>
        <li>127/8 is loopback, 169.254/16 is link-local, and 0.0.0.0/0 is the default route.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "What is 11000000 in decimal?", options: ["128", "192", "224", "160"], answer: 1, why: "128 + 64 = 192." },
        { q: "Which address is private?", options: ["172.32.1.1", "172.20.1.1", "8.8.4.4", "100.1.1.1"], answer: 1, why: "172.16.0.0/12 covers 172.16.x.x through 172.31.x.x, so 172.20 is inside and 172.32 is outside." },
        { q: "A VM shows 169.254.10.7 as its only address. What probably happened?", options: ["It's on the internet", "DHCP failed", "It's the loopback", "It's multicast"], answer: 1, why: "169.254/16 is self-assigned link-local, used when no DHCP server answered." },
        { q: "How many bits are in an IPv4 address?", options: ["8", "16", "32", "128"], answer: 2, why: "4 octets × 8 bits. IPv6 uses 128." },
      ]} />
    </>
  );
}
