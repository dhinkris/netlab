import { CustomsHall } from "../../figures/CustomsHall";
import { Quiz } from "../Quiz";

export default function FirewallWaf() {
  return (
    <>
      <h1>Azure Firewall & WAF</h1>
      <p className="lede">
        NSGs filter on addresses and ports. Some decisions need more context than that: <i>which website</i> is this VM trying to reach? <i>What</i> is inside this HTTP request? That's the job of a central firewall and a web application firewall.
      </p>

      <CustomsHall />

      <h2>What each layer can see</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Control</th><th>Layer</th><th>Decides on</th><th>Typical placement</th></tr></thead>
          <tbody>
            <tr><td><b>NSG</b></td><td>L3/L4</td><td>Source/destination IP, port, protocol, ASGs, service tags</td><td>Every subnet / NIC</td></tr>
            <tr><td><b className="c-violet">Azure Firewall</b></td><td>L3–L7</td><td>Network rules (IP/port), application rules (FQDN, URL with Premium), DNAT, threat intelligence</td><td>Hub VNet; all spoke and internet traffic routed through it with UDRs</td></tr>
            <tr><td><b className="c-teal">WAF</b></td><td>L7 (HTTP)</td><td>Request contents: SQL injection, XSS, protocol violations, bots, custom rules</td><td>In front of web apps: Application Gateway (regional) or Front Door (global)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Azure Firewall rule types</h2>
      <ul>
        <li><b>DNAT rules</b>: publish an inbound port on the firewall's public IP to a private server.</li>
        <li><b>Network rules</b>: allow or deny by IP, port and protocol (also service tags and IP groups).</li>
        <li><b>Application rules</b>: allow outbound HTTP/S by <b>FQDN</b> (e.g. <code>*.ubuntu.com</code>) or FQDN tags (e.g. WindowsUpdate). Everything not allowed is denied.</li>
      </ul>
      <p>They're processed in that order: DNAT, then network, then application. A flow that a network rule allows doesn't reach the application rules. Premium adds TLS inspection, IDPS and URL filtering.</p>

      <h2>WAF rules</h2>
      <ul>
        <li><b>Managed rule sets</b> (based on the OWASP Core Rule Set, plus Microsoft's Default Rule Set) catch common attacks: SQL injection, cross-site scripting, local file inclusion, and so on.</li>
        <li><b>Custom rules</b>: geo-filtering, rate limits, IP allow/deny lists, header matches.</li>
        <li><b>Detection vs prevention mode</b>: start in detection (log only) to tune false positives, then switch to prevention (block with 403).</li>
      </ul>
      <div className="callout">
        <b>A WAF only sees what it can decrypt.</b> Application Gateway and Front Door terminate TLS, inspect, then re-encrypt to the backend. An Azure Firewall without TLS inspection sees an HTTPS destination name (via SNI), not the request inside.
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>NSG = L4 per subnet; Azure Firewall = central L3–L7 with FQDN filtering; WAF = HTTP content inspection.</li>
        <li>Azure Firewall processes DNAT, then network, then application rules.</li>
        <li>Application rules let you allow only the domains your VMs need.</li>
        <li>WAF blocks attacks like SQL injection and XSS before they reach the app; start in detection mode.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "You want VMs to reach only *.ubuntu.com for updates. Which control fits?", options: ["NSG with a service tag", "Azure Firewall application rule", "WAF custom rule", "Route table"], answer: 1, why: "Application rules filter outbound traffic by FQDN." },
        { q: "A request contains id=1' OR 1=1--. Which component is designed to block it?", options: ["NSG", "WAF", "NAT Gateway", "DNS"], answer: 1, why: "SQL injection is in the HTTP request content, which only a WAF inspects." },
        { q: "In which order does Azure Firewall process rule collections?", options: ["Application, network, DNAT", "DNAT, network, application", "Network, DNAT, application", "Any order"], answer: 1, why: "DNAT first, then network rules, then application rules." },
        { q: "Why run a new WAF policy in detection mode first?", options: ["It's faster", "To find false positives before blocking real users", "Prevention mode costs more", "Detection mode encrypts traffic"], answer: 1, why: "Detection logs matches without blocking, so you can tune exclusions first." },
      ]} />
    </>
  );
}
