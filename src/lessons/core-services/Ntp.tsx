import { NtpClocks } from "../../figures/NtpClocks";
import { STRATA } from "../../models/ntp";
import { Quiz } from "../Quiz";

export default function Ntp() {
  return (
    <>
      <h1>NTP</h1>
      <p className="lede">
        Every computer's clock drifts. Network Time Protocol keeps them within milliseconds of each other, which matters more than it sounds: TLS certificates, Kerberos logins, log correlation and distributed databases all break when clocks disagree.
      </p>

      <NtpClocks />

      <h2>Four timestamps</h2>
      <p>
        The client can't see the server's clock directly, and the network adds delay in both directions. So one exchange records four times, two on each clock:
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Stamp</th><th>Taken by</th><th>When</th></tr></thead>
          <tbody>
            <tr><td><b className="c-rose">t1</b></td><td>Client</td><td>Request leaves</td></tr>
            <tr><td><b className="c-violet">t2</b></td><td>Server</td><td>Request arrives</td></tr>
            <tr><td><b className="c-violet">t3</b></td><td>Server</td><td>Reply leaves</td></tr>
            <tr><td><b className="c-rose">t4</b></td><td>Client</td><td>Reply arrives</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        <b>Round-trip delay</b> = (t4 − t1) − (t3 − t2): the total time minus the time the server spent thinking.<br />
        <b>Offset</b> = ((t2 − t1) + (t3 − t4)) / 2: how far the client is behind (positive) or ahead (negative). This is exact only if the path takes the same time each way. Otherwise the error is half the difference.
      </p>

      <h2>Stratum: distance from the source</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Stratum</th><th>Meaning</th></tr></thead>
          <tbody>{STRATA.map((s) => <tr key={s.n}><td><b>{s.n}</b></td><td>{s.what}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="callout">
        <b>Slew, don't step.</b> Real NTP daemons correct small errors by gently speeding up or slowing down the clock (slewing), so time never jumps backwards. They only step for large errors, typically more than 128 ms.
      </div>

      <h2>Time in Azure</h2>
      <ul>
        <li>Azure VMs get time from the host they run on, which is kept in sync with Microsoft's stratum-1 servers.</li>
        <li>Windows VMs use the VMICTimeProvider (host time) and <code>time.windows.com</code>; Linux images use chrony with the Hyper-V PTP clock source (<code>/dev/ptp_hyperv</code>).</li>
        <li>NTP is UDP 123. If you point VMs at your own NTP servers, make sure NSGs and firewalls allow it.</li>
      </ul>

      <h2>Useful commands</h2>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr><td>Windows: sync status and source</td><td><code>w32tm /query /status</code></td></tr>
            <tr><td>Linux (chrony): current offset</td><td><code>chronyc tracking</code></td></tr>
            <tr><td>Linux (chrony): sources and their stratum</td><td><code>chronyc sources -v</code></td></tr>
          </tbody>
        </table>
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>One exchange gives four timestamps; offset and delay fall out of simple arithmetic.</li>
        <li>NTP assumes symmetric delay; asymmetric paths leave an error of half the difference.</li>
        <li>Stratum counts hops from a reference clock; 16 means unsynchronised.</li>
        <li>NTP uses UDP 123; clocks are corrected by slewing, not jumping.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "t1 = 100, t2 = 160, t3 = 162, t4 = 122 (ms). What is the round-trip delay?", options: ["22 ms", "20 ms", "62 ms", "2 ms"], answer: 1, why: "(122 − 100) − (162 − 160) = 22 − 2 = 20 ms." },
        { q: "Same stamps: what is the client's offset?", options: ["+50 ms (client is behind)", "−50 ms", "+60 ms", "0"], answer: 0, why: "((160 − 100) + (162 − 122)) / 2 = (60 + 40) / 2 = 50 ms; the client must add 50 ms." },
        { q: "A server is directly attached to a GPS receiver. What stratum is it?", options: ["0", "1", "2", "16"], answer: 1, why: "The GPS receiver is stratum 0; a server wired to it is stratum 1." },
        { q: "Kerberos logins fail across a domain with 'clock skew too great'. What's the fix?", options: ["Open port 88", "Get every machine syncing to a common NTP source", "Lower the DNS TTL", "Renew the DHCP lease"], answer: 1, why: "Kerberos rejects tickets when clocks differ by more than 5 minutes by default." },
      ]} />
    </>
  );
}
