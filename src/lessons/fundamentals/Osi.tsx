import { OsiLift } from "../../figures/OsiLift";
import { LAYERS, PAYLOAD, sizeAt } from "../../models/encap";
import { Quiz } from "../Quiz";

export default function Osi() {
  return (
    <>
      <h1>OSI & TCP/IP models</h1>
      <p className="lede">
        Networks are built in layers. Each layer does one job and talks only to the layers directly above and below it. Sending data means wrapping it, layer by layer; receiving means unwrapping it in reverse.
      </p>

      <OsiLift />

      <h2>Encapsulation in one sentence</h2>
      <p>
        On the way <b>down</b> the sender, each layer puts its own <b>header</b> in front of what it got from the layer above (Ethernet also adds a trailer). On the way <b>up</b> the receiver, each layer reads and removes its header, then hands the rest up. That is what the lift in Fig 1 does: the {PAYLOAD.toLocaleString()}-byte request becomes a {sizeAt(6).toLocaleString()}-byte frame on the wire.
      </p>

      <h2>The seven OSI layers</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Layer</th><th>Unit (PDU)</th><th>What it adds / does</th><th>Examples</th><th>Device</th></tr>
          </thead>
          <tbody>
            {LAYERS.map((l) => (
              <tr key={l.n}>
                <td><b>L{l.n}</b></td>
                <td>{l.name}</td>
                <td>{l.pdu}</td>
                <td>{l.adds}{l.header + l.trailer ? ` (+${l.header + l.trailer} B)` : ""}</td>
                <td>{l.examples}</td>
                <td>{l.device}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="callout">
        <b>Memory aid (top → bottom):</b> <i>All People Seem To Need Data Processing</i> — Application, Presentation, Session, Transport, Network, Data link, Physical.
      </div>

      <h2>TCP/IP: the model the internet actually uses</h2>
      <p>OSI is the teaching model. Real stacks follow the 4-layer TCP/IP model, which merges some OSI layers:</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>TCP/IP layer</th><th>OSI layers</th><th>Addresses used</th><th>Key protocols</th></tr></thead>
          <tbody>
            <tr><td>Application</td><td>7, 6, 5</td><td>Names (DNS), URLs</td><td>HTTP, DNS, TLS, SSH</td></tr>
            <tr><td>Transport</td><td>4</td><td>Ports</td><td>TCP, UDP</td></tr>
            <tr><td>Internet</td><td>3</td><td>IP addresses</td><td>IPv4, IPv6, ICMP</td></tr>
            <tr><td>Link</td><td>2, 1</td><td>MAC addresses</td><td>Ethernet, Wi-Fi, ARP</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Why it matters in the cloud</h2>
      <ul>
        <li><b>NSGs and Azure Load Balancer</b> work at <b>L4</b>: they see IPs and ports, not URLs.</li>
        <li><b>Application Gateway, Front Door and WAF</b> work at <b>L7</b>: they can route on hostnames and paths and inspect HTTP.</li>
        <li>When troubleshooting, go bottom-up: is the link up (L1/L2)? Is there a route (L3)? Is the port open (L4)? Does the app answer (L7)?</li>
      </ul>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Each layer wraps the data from the layer above with its own header.</li>
        <li>PDU names: data → segment (L4) → packet (L3) → frame (L2) → bits (L1).</li>
        <li>TCP/IP has 4 layers; OSI's 5–7 collapse into Application and 1–2 into Link.</li>
        <li>"L4 vs L7" is the most common way cloud services describe themselves.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "At which OSI layer does a router make its forwarding decision?", options: ["L2 Data Link", "L3 Network", "L4 Transport", "L7 Application"], answer: 1, why: "Routers forward packets using destination IP addresses, which live in the L3 header." },
        { q: "What is the PDU called at the Transport layer when using TCP?", options: ["Frame", "Packet", "Segment", "Bits"], answer: 2, why: "TCP data units are segments (UDP's are often called datagrams)." },
        { q: "Which layer adds a trailer (FCS) as well as a header?", options: ["Transport", "Network", "Data Link", "Application"], answer: 2, why: "Ethernet appends a 4-byte frame check sequence so the receiver can detect corruption." },
        { q: "An Azure NSG rule can match on…", options: ["URL path", "Source IP and destination port", "HTTP header", "Cookie"], answer: 1, why: "NSGs are L3/L4 filters: IP addresses, ports and protocol." },
      ]} />
    </>
  );
}
