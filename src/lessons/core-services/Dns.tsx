import { DnsCourier } from "../../figures/DnsCourier";
import { AZURE_DNS } from "../../models/dns";
import { Quiz } from "../Quiz";

export default function Dns() {
  return (
    <>
      <h1>DNS</h1>
      <p className="lede">
        The Domain Name System turns names people can remember (<code>www.example.com</code>) into the addresses machines route to (<code>203.0.113.10</code>). It's a distributed, cached, hierarchical database, and when something "can't connect", DNS is the first thing to check.
      </p>

      <DnsCourier />

      <h2>Who does what</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Role</th><th>Job</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td><b>Stub resolver</b></td><td>The tiny client in your OS. Asks one question and waits for a final answer.</td><td>Your laptop, a VM</td></tr>
            <tr><td><b className="c-amber">Recursive resolver</b></td><td>Does the legwork: walks the tree, follows referrals, caches answers.</td><td>Your ISP, 1.1.1.1, 8.8.8.8, Azure's {AZURE_DNS}</td></tr>
            <tr><td><b className="c-violet">Root servers</b></td><td>Know where every TLD's servers are. 13 identities (a–m), hundreds of anycast sites.</td><td>a.root-servers.net</td></tr>
            <tr><td><b className="c-blue">TLD servers</b></td><td>Know which name servers are authoritative for each domain under the TLD.</td><td>a.gtld-servers.net for .com</td></tr>
            <tr><td><b className="c-teal">Authoritative servers</b></td><td>Hold the actual records for a zone and give the final answer.</td><td>ns1.example.com, Azure DNS zones</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Record types you'll use</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Type</th><th>Maps</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td><code>A</code></td><td>Name → IPv4</td><td><code>www → 203.0.113.10</code></td></tr>
            <tr><td><code>AAAA</code></td><td>Name → IPv6</td><td><code>www → 2001:db8::10</code></td></tr>
            <tr><td><code>CNAME</code></td><td>Name → another name (alias)</td><td><code>shop → www.example.com</code></td></tr>
            <tr><td><code>MX</code></td><td>Domain → mail servers, with priority</td><td><code>example.com → 10 mail.example.com</code></td></tr>
            <tr><td><code>TXT</code></td><td>Free text: domain verification, SPF, DKIM</td><td><code>"v=spf1 include:… -all"</code></td></tr>
            <tr><td><code>NS</code></td><td>Which servers are authoritative for a zone</td><td><code>example.com → ns1.example.com</code></td></tr>
            <tr><td><code>PTR</code></td><td>IP → name (reverse lookup)</td><td><code>10.113.0.203.in-addr.arpa → www</code></td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <b>TTL is a trade-off.</b> A long TTL means fewer lookups and faster answers, but changes take that long to reach everyone. Before a migration, lower the TTL (to 300 s, say) a day ahead, so the switch-over spreads in minutes rather than hours.
      </div>

      <h2>DNS in Azure</h2>
      <ul>
        <li><b>Azure-provided DNS</b> (<code>{AZURE_DNS}</code>) is the default resolver in every VNet. It resolves public names and VM hostnames in the same VNet.</li>
        <li><b>Azure DNS public zones</b> host your domain's authoritative records.</li>
        <li><b>Private DNS zones</b> (e.g. <code>privatelink.blob.core.windows.net</code>) give private-endpoint IPs to names, but only for VNets you <b>link</b> to the zone. A missing link is the most common Private Link bug.</li>
        <li><b>DNS Private Resolver</b> lets on-premises servers resolve Azure private zones, and Azure resolve on-premises names, via conditional forwarding.</li>
      </ul>

      <h2>Troubleshooting commands</h2>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr><td>Ask your resolver</td><td><code>nslookup www.example.com</code></td></tr>
            <tr><td>Ask a specific server, a specific type</td><td><code>dig @8.8.8.8 example.com MX</code></td></tr>
            <tr><td>Watch the whole walk from the root</td><td><code>dig +trace www.example.com</code></td></tr>
            <tr><td>See remaining TTL</td><td>the number column in <code>dig</code> output</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>The stub asks once; the recursive resolver walks root → TLD → authoritative.</li>
        <li>Each server either answers or refers the resolver one level down.</li>
        <li>Answers are cached for their TTL; lower it before planned changes.</li>
        <li>DNS normally uses UDP 53, and falls back to TCP 53 for large answers.</li>
        <li>In Azure, private endpoints need a private DNS zone linked to the VNet.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "Which server finally returns the A record for www.example.com?", options: ["A root server", "The .com TLD server", "example.com's authoritative server", "Your laptop"], answer: 2, why: "Root and TLD servers only refer; the zone's authoritative server holds the record." },
        { q: "You change an A record whose TTL is 3600. Some users still reach the old IP. Why?", options: ["DNS is broken", "Resolvers cached the old answer for up to an hour", "The record didn't save", "Browsers ignore DNS"], answer: 1, why: "Caches keep the old answer until its TTL runs out." },
        { q: "Which record makes shop.example.com an alias of www.example.com?", options: ["A", "MX", "CNAME", "TXT"], answer: 2, why: "A CNAME points one name at another name." },
        { q: "A VM can't resolve mystorage.privatelink.blob.core.windows.net to its private IP. What's the likeliest fix?", options: ["Open port 443", "Link the private DNS zone to the VM's VNet", "Add an MX record", "Restart the storage account"], answer: 1, why: "Private DNS zones only answer for VNets that are linked to them." },
      ]} />
    </>
  );
}
