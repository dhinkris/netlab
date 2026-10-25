import { Carousel } from "../../figures/Carousel";
import { Quiz } from "../Quiz";

export default function AzureLb() {
  return (
    <>
      <h1>Azure Load Balancer (L4)</h1>
      <p className="lede">
        A load balancer gives many servers one front door. <b>Azure Load Balancer</b> works at layer 4: it sees IPs, ports and protocol, picks a healthy backend for each new flow, and forwards packets without ever looking inside them.
      </p>

      <Carousel />

      <h2>The parts</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Part</th><th>What it is</th></tr></thead>
          <tbody>
            <tr><td><b>Frontend IP</b></td><td>Public (internet-facing) or private (internal LB) address clients connect to</td></tr>
            <tr><td><b>Backend pool</b></td><td>The VMs or scale-set instances that serve traffic</td></tr>
            <tr><td><b>Load-balancing rule</b></td><td>Frontend IP:port → backend pool:port, with protocol and probe</td></tr>
            <tr><td><b>Health probe</b></td><td>TCP, HTTP or HTTPS check from 168.63.129.16; failing instances get no new flows</td></tr>
            <tr><td><b>Inbound NAT rule</b></td><td>Maps one frontend port to one specific VM (e.g. for management)</td></tr>
            <tr><td><b>Outbound rule</b></td><td>SNAT for the backend pool (see Outbound connectivity)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>How it distributes traffic</h2>
      <ul>
        <li>Default: a hash of the <b>5-tuple</b> (source IP, source port, destination IP, destination port, protocol). Every packet of one connection goes to the same backend.</li>
        <li><b>Session persistence</b> can switch to a 2-tuple (client IP) or 3-tuple (client IP + protocol) hash, so all of one client's connections land on the same VM.</li>
        <li>It's <b>pass-through</b>: the backend sees the client's real IP, and replies flow back through the LB.</li>
        <li><b>HA ports</b> (internal LB) balance every port and protocol at once, which is used in front of NVAs.</li>
      </ul>
      <div className="callout">
        <b>Remember the probe source.</b> Health probes come from <code>168.63.129.16</code> (service tag AzureLoadBalancer). If an NSG blocks it, every backend looks dead and the LB sends traffic nowhere.
      </div>

      <h2>What L4 can't do</h2>
      <p>It can't route by URL or hostname, terminate TLS, rewrite headers, or block SQL injection. Those need an L7 proxy: Application Gateway or Front Door, the next lessons.</p>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Azure Load Balancer is L4: it hashes the 5-tuple to choose a backend per flow.</li>
        <li>Health probes take failing VMs out of rotation for new flows.</li>
        <li>Public LBs front internet traffic; internal LBs front private tiers.</li>
        <li>Allow the AzureLoadBalancer tag in NSGs, or probes fail.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "Two packets of the same TCP connection arrive. Where do they go?", options: ["Round-robin across VMs", "The same VM, because the 5-tuple hash is the same", "The least busy VM", "A random VM each time"], answer: 1, why: "The hash of an unchanged 5-tuple always selects the same backend." },
        { q: "All backends show unhealthy, but the app works when you test a VM directly. Likely cause?", options: ["DNS", "An NSG blocking probes from 168.63.129.16", "TLS certificate", "Too many VMs"], answer: 1, why: "Probes must be allowed by NSG; the AzureLoadBalancer tag covers them." },
        { q: "You need /api to go to one pool and /images to another. Azure Load Balancer…", options: ["Can do it with rules", "Can't: it doesn't read URLs", "Needs session persistence", "Needs HA ports"], answer: 1, why: "URL routing is L7; use Application Gateway or Front Door." },
        { q: "Which LB feature balances all ports and protocols, e.g. in front of firewall NVAs?", options: ["Inbound NAT rules", "HA ports", "Outbound rules", "Floating IP"], answer: 1, why: "HA ports on an internal Standard LB balance every flow." },
      ]} />
    </>
  );
}
