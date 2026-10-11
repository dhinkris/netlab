import { PortBays } from "../../figures/PortBays";
import { PORTS, RANGES } from "../../models/ports";
import { Quiz } from "../Quiz";

export default function Ports() {
  return (
    <>
      <h1>Ports & protocols</h1>
      <p className="lede">
        An IP address gets a packet to the right <b>machine</b>. A <b>port</b> (a 16-bit number, 0–65535) gets it to the right <b>program</b> on that machine. The transport protocol, TCP or UDP, decides how carefully it's delivered.
      </p>

      <PortBays />

      <h2>A connection is identified by five things</h2>
      <p>
        The <b>5-tuple</b>: protocol, source IP, source port, destination IP, destination port. For example <code>TCP 10.0.1.4:51514 → 52.10.20.30:443</code>. Every firewall rule, NSG rule and load-balancer flow you'll meet matches on some part of this tuple.
      </p>

      <h2>TCP vs UDP</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th>TCP</th><th>UDP</th></tr></thead>
          <tbody>
            <tr><td>Connection</td><td>Yes: a 3-way handshake (SYN, SYN-ACK, ACK) first</td><td>No: just send</td></tr>
            <tr><td>Reliability</td><td>Retransmits lost data, delivers in order</td><td>Best effort; the app handles loss</td></tr>
            <tr><td>Overhead</td><td>20+ byte header, 1 RTT before data</td><td>8 byte header, data in the first packet</td></tr>
            <tr><td>Used by</td><td>HTTP/1.1 and 2, HTTPS, SSH, RDP, SMB, SQL</td><td>DNS, NTP, VoIP, video, QUIC (HTTP/3)</td></tr>
            <tr><td>Closed port answers with</td><td>RST (reset)</td><td>ICMP "port unreachable" (often filtered)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Ports to know by heart</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Port</th><th>Service</th><th>Protocol</th><th>Notes</th></tr></thead>
          <tbody>
            {PORTS.map((p) => <tr key={p.port}><td><code>{p.port}</code></td><td>{p.name}</td><td>{p.proto}</td><td>{p.what}</td></tr>)}
            <tr><td><code>25</code></td><td>SMTP</td><td>TCP</td><td>Mail between servers (Azure blocks outbound 25 on most subscriptions)</td></tr>
            <tr><td><code>445</code></td><td>SMB</td><td>TCP</td><td>Windows file shares, Azure Files</td></tr>
            <tr><td><code>1433</code></td><td>SQL Server</td><td>TCP</td><td>Azure SQL Database</td></tr>
            <tr><td><code>3306 / 5432</code></td><td>MySQL / PostgreSQL</td><td>TCP</td><td>Database servers</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Port ranges</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Range</th><th>Name</th><th>Meaning</th></tr></thead>
          <tbody>
            {RANGES.map((r) => <tr key={r.name}><td><code>{r.from}–{r.to}</code></td><td>{r.name}</td><td>{r.note}</td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="callout">
        <b>Why the ephemeral range matters:</b> when your VM connects out, the reply comes back to a random high port. A <b>stateful</b> firewall (like an NSG) remembers the outgoing flow and lets the reply in automatically, so you never need an inbound rule for 49152–65535. The traffic-flow topic covers this in depth.
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>IP picks the host; the port picks the process.</li>
        <li>TCP = handshake + reliable + ordered; UDP = fast and fire-and-forget.</li>
        <li>Servers listen on well-known ports; clients use random ephemeral ports.</li>
        <li>Never expose 22 or 3389 to the internet; use Azure Bastion or just-in-time access instead.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "Which three messages make up the TCP handshake?", options: ["SYN, ACK, FIN", "SYN, SYN-ACK, ACK", "HELLO, ACK, DATA", "SYN, RST, ACK"], answer: 1, why: "The client sends SYN, the server answers SYN-ACK, and the client confirms with ACK." },
        { q: "DNS queries normally use…", options: ["TCP 53", "UDP 53", "UDP 123", "TCP 443"], answer: 1, why: "DNS uses UDP 53 for normal lookups and falls back to TCP 53 for large responses." },
        { q: "Your client connects to a server on port 443. What is the client's source port most likely to be?", options: ["443", "80", "A random port from 49152–65535", "22"], answer: 2, why: "Clients use an ephemeral source port chosen by the OS." },
        { q: "You send a TCP SYN to a port where nothing is listening and no firewall drops it. What comes back?", options: ["SYN-ACK", "Nothing", "RST", "ICMP echo"], answer: 2, why: "The host's TCP stack replies with a reset (RST)." },
      ]} />
    </>
  );
}
