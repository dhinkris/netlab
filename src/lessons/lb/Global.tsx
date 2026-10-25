import { WorldMap } from "../../figures/WorldMap";
import { Quiz } from "../Quiz";

export default function Global() {
  return (
    <>
      <h1>Front Door & Traffic Manager</h1>
      <p className="lede">
        When an app runs in several regions, something has to send each user to a good one and steer around a region that fails. Azure has two global options that solve this in very different ways: <b>Front Door</b> sits in the traffic path; <b>Traffic Manager</b> only answers DNS.
      </p>

      <WorldMap />

      <h2>Side by side</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th className="c-amber">Azure Front Door</th><th>Traffic Manager</th></tr></thead>
          <tbody>
            <tr><td>How it works</td><td>Anycast reverse proxy at Microsoft's edge POPs</td><td>DNS: returns the address of a chosen endpoint</td></tr>
            <tr><td>In the data path?</td><td>Yes</td><td>No: clients connect directly to the endpoint</td></tr>
            <tr><td>Protocols</td><td>HTTP/HTTPS</td><td>Anything (it's just DNS)</td></tr>
            <tr><td>Failover speed</td><td>Seconds (health probes at the edge)</td><td>Bounded by DNS TTL and client caching</td></tr>
            <tr><td>Extras</td><td>TLS offload, caching/CDN, WAF, path routing, rules engine</td><td>Routing methods: priority, weighted, performance, geographic, multivalue, subnet</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Where they fit</h2>
      <ul>
        <li><b>Front Door</b> is the usual front for global web apps and APIs: users hit the nearest edge, get TLS and caching there, and ride Microsoft's backbone to the origin.</li>
        <li><b>Traffic Manager</b> fits non-HTTP workloads (gaming, SMTP, custom TCP), or fronting things Front Door can't, with the DNS-TTL caveat.</li>
        <li>Inside each region you typically still have Application Gateway or a Load Balancer; global and regional balancers stack.</li>
      </ul>
      <div className="callout">
        <b>Lock origins down.</b> With Front Door, make sure origins only accept traffic from Front Door: the <code>AzureFrontDoor.Backend</code> service tag in NSGs, the <code>X-Azure-FDID</code> header check, or Private Link origins. Otherwise attackers can bypass the edge and its WAF.
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Front Door: anycast L7 proxy at the edge, with instant failover, WAF and caching, for HTTP(S).</li>
        <li>Traffic Manager: DNS-based, any protocol, failover limited by TTL and caches.</li>
        <li>Both route users to a nearby, healthy region; they combine with regional load balancers.</li>
        <li>Restrict origins so traffic can't bypass Front Door.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "A region fails. Which recovers users faster, all else equal?", options: ["Traffic Manager", "Front Door", "Both the same", "Neither"], answer: 1, why: "Front Door is in the path and stops using the failed origin at once; Traffic Manager waits on DNS caches." },
        { q: "You need global failover for a custom TCP game server. Which fits?", options: ["Front Door", "Traffic Manager", "Application Gateway", "NAT Gateway"], answer: 1, why: "Front Door is HTTP(S)-only; Traffic Manager works at the DNS level for any protocol." },
        { q: "With Traffic Manager, which way does the data flow?", options: ["Through Traffic Manager", "Directly from client to the chosen endpoint", "Through Front Door", "Through the VPN gateway"], answer: 1, why: "Traffic Manager only answers DNS; it never carries traffic." },
        { q: "How should an App Service origin behind Front Door be protected from direct access?", options: ["Lower TTL", "Accept only Front Door traffic (service tag / X-Azure-FDID / Private Link)", "Bigger SKU", "Turn off TLS"], answer: 1, why: "Otherwise clients could skip the edge WAF by hitting the origin directly." },
      ]} />
    </>
  );
}
