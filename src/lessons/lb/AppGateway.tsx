import { SortingOffice } from "../../figures/SortingOffice";
import { Quiz } from "../Quiz";

export default function AppGateway() {
  return (
    <>
      <h1>Application Gateway (L7)</h1>
      <p className="lede">
        <b>Application Gateway</b> is a regional layer-7 load balancer: a reverse proxy that terminates HTTPS, reads each request, and decides where it goes based on hostname, path and headers. It can also run a web application firewall on the way.
      </p>

      <SortingOffice />

      <h2>The building blocks</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Piece</th><th>Role</th></tr></thead>
          <tbody>
            <tr><td><b>Frontend IP</b></td><td>Public and/or private address the gateway listens on</td></tr>
            <tr><td><b>Listener</b></td><td>Port + protocol + hostname (+ certificate for HTTPS): "https://shop.example.com:443"</td></tr>
            <tr><td><b>Routing rule</b></td><td>Ties a listener to backends: basic, or path-based (/images/*, /api/*)</td></tr>
            <tr><td><b>Backend pool</b></td><td>VMs, scale sets, App Service, IPs or FQDNs</td></tr>
            <tr><td><b>Backend settings</b></td><td>Port, protocol (HTTP/HTTPS re-encryption), cookie affinity, timeouts, custom probe</td></tr>
            <tr><td><b>WAF policy</b></td><td>Managed OWASP-based rules + custom rules (WAF_v2 SKU)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>What L7 adds over L4</h2>
      <ul>
        <li><b>TLS termination</b> and central certificate management (from Key Vault).</li>
        <li><b>Path- and host-based routing</b>: many sites and microservices behind one IP.</li>
        <li><b>Header and URL rewrites, redirects</b> (HTTP → HTTPS).</li>
        <li><b>Cookie-based session affinity</b> instead of IP-hash stickiness.</li>
        <li><b>WAF</b>: blocks SQL injection, XSS and other common attacks before the app sees them.</li>
      </ul>
      <div className="callout">
        <b>It's a proxy, not pass-through.</b> The backend's TCP connection comes from the gateway's own subnet IP. The client's address arrives in the <code>X-Forwarded-For</code> header, so log that, and make the backend NSG allow the gateway subnet.
      </div>

      <h2>Practical notes</h2>
      <ul>
        <li>Application Gateway v2 needs its own dedicated subnet (a /24 is recommended for scale).</li>
        <li>For end-to-end encryption, use HTTPS backend settings so it re-encrypts to the backend.</li>
        <li>Default health probes expect HTTP 200–399 from the backend's root path; set a custom probe path for real apps.</li>
      </ul>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Application Gateway is a regional L7 reverse proxy for HTTP/HTTPS.</li>
        <li>It terminates TLS, so it can read paths and headers, route by them, and run a WAF.</li>
        <li>Listener → rule → backend pool; path rules send /api, /images, etc. to different pools.</li>
        <li>Backends see the gateway's IP; the client IP is in X-Forwarded-For.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "Why must Application Gateway terminate TLS to route by path?", options: ["It's faster", "The path is inside the encrypted HTTP request", "Certificates are required by law", "It isn't required"], answer: 1, why: "Until the request is decrypted the gateway can't read its URL." },
        { q: "GET /api/orders with rules /images/* → A, /api/* → B, default → C. Which pool?", options: ["A", "B", "C", "Dropped"], answer: 1, why: "It matches /api/*." },
        { q: "Backend logs show every request from 10.0.5.x, not the client. Why?", options: ["NAT Gateway", "The gateway proxies; the client IP is in X-Forwarded-For", "DNS caching", "A misconfigured NSG"], answer: 1, why: "As a proxy, the gateway opens its own connection to the backend." },
        { q: "Which SKU do you need for WAF on Application Gateway v2?", options: ["Standard_v2", "WAF_v2", "Basic", "Any SKU"], answer: 1, why: "WAF requires the WAF_v2 SKU." },
      ]} />
    </>
  );
}
