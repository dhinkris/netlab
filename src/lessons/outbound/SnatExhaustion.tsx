import { ParkingGarage } from "../../figures/ParkingGarage";
import { Quiz } from "../Quiz";

export default function SnatExhaustion() {
  return (
    <>
      <h1>SNAT port exhaustion</h1>
      <p className="lede">
        Every outbound connection through SNAT borrows a public <b>source port</b>. Ports are plentiful but finite, and an app that opens connections faster than it closes them, all to the same destination, can run out. New connections then fail or hang, while everything else looks healthy.
      </p>

      <ParkingGarage />

      <h2>Why it happens</h2>
      <ul>
        <li>A connection is identified by its 5-tuple. To the <b>same destination IP and port</b>, each concurrent connection needs a different source port on the public IP.</li>
        <li>One public IP has 64,512 usable ports (1024–65535).</li>
        <li>Closed connections don't free their port instantly: TCP waits (TIME_WAIT), and idle connections hold ports until they time out (4 minutes by default on Azure NAT Gateway and Load Balancer).</li>
        <li>Load balancer outbound rules pre-allocate a fixed block per VM (e.g. 1,024 for small pools), so a single busy VM can exhaust its block even when others sit idle.</li>
      </ul>

      <h2>Symptoms</h2>
      <ul>
        <li>Intermittent connection timeouts to one external API, worse under load.</li>
        <li>Metrics: NAT Gateway <b>SNAT connection count</b> and <b>dropped packets</b>; Load Balancer <b>SNAT port usage</b> and <b>failed connections</b>.</li>
        <li>Thousands of sockets in TIME_WAIT or ESTABLISHED to the same remote endpoint (<code>ss -tan</code>, <code>netstat -an</code>).</li>
      </ul>

      <h2>Fixes, in order of impact</h2>
      <ol>
        <li><b>Reuse connections</b>: HTTP keep-alive, connection pooling, one shared HTTP client per app instead of one per request.</li>
        <li><b>Use NAT Gateway</b> instead of LB outbound rules: ports are allocated on demand across all VMs in the subnet.</li>
        <li><b>Add public IPs</b> (or a public IP prefix) to the NAT Gateway: each adds 64,512 ports, up to 16 IPs.</li>
        <li><b>Use Private Endpoints</b> for Azure PaaS (Storage, SQL, Key Vault): that traffic stops needing SNAT at all.</li>
        <li>Tune timeouts: a lower TCP idle timeout frees idle ports sooner.</li>
      </ol>
      <div className="callout">
        <b>The quick check:</b> is the failing traffic all going to one destination IP:port? If yes and the source is behind SNAT, suspect port exhaustion before suspecting the remote service.
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Each concurrent connection to the same destination needs its own SNAT port.</li>
        <li>One public IP = 64,512 ports; idle and closing connections still hold theirs.</li>
        <li>Connection reuse is the real fix; NAT Gateway and extra IPs add headroom.</li>
        <li>Private Endpoints remove PaaS traffic from SNAT entirely.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "How many SNAT ports does one public IP give a NAT Gateway?", options: ["1,024", "16,384", "64,512", "Unlimited"], answer: 2, why: "Ports 1024–65535: 64,512." },
        { q: "An app creates a new HttpClient for every request to one API and fails under load. Best first fix?", options: ["Bigger VM", "Reuse one client / pool connections", "Lower DNS TTL", "Add an NSG rule"], answer: 1, why: "Connection reuse stops each request from consuming a new port." },
        { q: "Why does LB outbound rule SNAT exhaust sooner than NAT Gateway for one busy VM?", options: ["It uses UDP", "Ports are pre-allocated per VM in fixed blocks", "It has no public IP", "It blocks keep-alive"], answer: 1, why: "A VM can't borrow another VM's unused block." },
        { q: "Traffic to Azure Storage is exhausting SNAT ports. Which design removes it from SNAT completely?", options: ["Add a public IP", "Private Endpoint for the storage account", "Bigger subnet", "Disable TLS"], answer: 1, why: "Private Endpoint traffic stays private and needs no SNAT." },
      ]} />
    </>
  );
}
