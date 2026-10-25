import { DdosDam } from "../../figures/DdosDam";
import { Quiz } from "../Quiz";

export default function Ddos() {
  return (
    <>
      <h1>DDoS protection</h1>
      <p className="lede">
        A <b>distributed denial-of-service</b> attack doesn't break in; it drowns you. Thousands of compromised machines send more traffic than your links, load balancers or servers can handle, so real users can't get through.
      </p>

      <DdosDam />

      <h2>Kinds of attack</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Kind</th><th>Layer</th><th>How it hurts</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td><b>Volumetric</b></td><td>L3/L4</td><td>Saturates bandwidth</td><td>UDP floods, DNS/NTP amplification</td></tr>
            <tr><td><b>Protocol</b></td><td>L3/L4</td><td>Exhausts connection state in servers or firewalls</td><td>SYN floods, fragmented packets</td></tr>
            <tr><td><b>Application</b></td><td>L7</td><td>Expensive requests that look legitimate</td><td>HTTP floods hitting search or login pages</td></tr>
          </tbody>
        </table>
      </div>

      <h2>How mitigation works</h2>
      <ol>
        <li><b>Always-on monitoring</b> of traffic to each protected public IP.</li>
        <li><b>Adaptive tuning</b>: the service learns each IP's normal traffic profile, so thresholds fit your app rather than a generic limit.</li>
        <li><b>Mitigation</b>: when traffic exceeds the policy, packets are scrubbed at the edge of Microsoft's network, dropping attack traffic and forwarding the rest.</li>
        <li><b>Telemetry and alerts</b>: metrics, flow logs and post-attack reports show what happened.</li>
      </ol>

      <h2>In Azure</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Option</th><th>What you get</th></tr></thead>
          <tbody>
            <tr><td>Infrastructure protection (default)</td><td>Protects Azure's own platform for everyone; not tuned to your app</td></tr>
            <tr><td><b>DDoS Network Protection</b></td><td>Per-VNet plan covering all public IPs in it: adaptive tuning, metrics, alerts, rapid-response support, cost protection</td></tr>
            <tr><td><b>DDoS IP Protection</b></td><td>The same mitigation, enabled per public IP</td></tr>
            <tr><td>WAF + Front Door / Application Gateway</td><td>L7 floods: rate limiting, bot protection, geo-filtering</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <b>Layers again.</b> DDoS Protection handles L3/L4 volume; a WAF with rate-limit rules handles L7 floods; autoscaling buys headroom. Use all three for internet-facing apps.
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>DDoS attacks exhaust capacity: bandwidth, connection state, or application resources.</li>
        <li>Mitigation learns a baseline and scrubs abnormal traffic upstream.</li>
        <li>Azure DDoS Network/IP Protection covers public IPs; WAF covers L7 floods.</li>
        <li>Volumetric attacks need no vulnerability, so every public endpoint is a target.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "A SYN flood mainly exhausts…", options: ["Disk space", "Connection-state tables", "DNS caches", "TLS certificates"], answer: 1, why: "Half-open TCP connections fill state tables in servers and firewalls." },
        { q: "What does adaptive tuning do?", options: ["Scales VMs", "Learns each IP's normal traffic so thresholds fit it", "Changes DNS TTLs", "Encrypts traffic"], answer: 1, why: "The baseline lets mitigation trigger on abnormal traffic for that specific app." },
        { q: "Which tool fits an HTTP flood of valid-looking requests?", options: ["NSG", "WAF rate-limiting rules", "Route table", "NAT Gateway"], answer: 1, why: "L7 floods look like real requests; WAF rate limits and bot rules handle them." },
        { q: "Where does Azure scrub attack traffic?", options: ["Inside your VM", "At the edge of Microsoft's network, before it reaches your IP", "In your NSG", "In the browser"], answer: 1, why: "Mitigation happens upstream so the flood never reaches your resources." },
      ]} />
    </>
  );
}
