import { DhcpDesk } from "../../figures/DhcpDesk";
import { Quiz } from "../Quiz";

export default function Dhcp() {
  return (
    <>
      <h1>DHCP</h1>
      <p className="lede">
        A device that has just plugged in has no IP address, doesn't know its subnet, and has no idea where the router or DNS server is. The Dynamic Host Configuration Protocol hands it all of that, on loan, in four messages.
      </p>

      <DhcpDesk />

      <h2>DORA: the four-message exchange</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Message</th><th>From → To</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td>1</td><td><b className="c-amber">Discover</b></td><td><code>0.0.0.0:68 → 255.255.255.255:67</code></td><td>"Is there a DHCP server out there?" (broadcast: the device has no address yet)</td></tr>
            <tr><td>2</td><td><b className="c-teal">Offer</b></td><td>server:67 → client:68</td><td>"You can have 10.0.1.4, plus these settings."</td></tr>
            <tr><td>3</td><td><b className="c-blue">Request</b></td><td><code>0.0.0.0:68 → 255.255.255.255:67</code></td><td>"I'll take 10.0.1.4." (broadcast, so any other server that offered knows it lost)</td></tr>
            <tr><td>4</td><td><b className="c-teal">Ack</b></td><td>server:67 → client:68</td><td>"Confirmed. It's yours for 24 hours."</td></tr>
          </tbody>
        </table>
      </div>

      <h2>What's in a lease</h2>
      <p>More than an address. A typical offer carries:</p>
      <ul>
        <li><b>IP address and subnet mask</b>: <code>10.0.1.4/24</code></li>
        <li><b>Default gateway (router)</b>: <code>10.0.1.1</code></li>
        <li><b>DNS servers</b>: e.g. <code>168.63.129.16</code> in Azure</li>
        <li><b>Lease time</b>, plus options such as the domain name and NTP servers</li>
      </ul>

      <h2>Lease timers</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Point</th><th>Default</th><th>What the client does</th></tr></thead>
          <tbody>
            <tr><td><b className="c-blue">T1</b> (renew)</td><td>50% of the lease</td><td>Unicast REQUEST to the server that gave the lease</td></tr>
            <tr><td><b className="c-amber">T2</b> (rebind)</td><td>87.5% of the lease</td><td>Broadcast REQUEST to any server</td></tr>
            <tr><td>Expiry</td><td>100%</td><td>Must stop using the address and start over with DISCOVER</td></tr>
          </tbody>
        </table>
      </div>
      <div className="callout">
        <b>No answer at all?</b> The device gives itself a link-local address from <code>169.254.0.0/16</code>. If you see 169.254.x.x on a machine, DHCP failed.
      </div>

      <h2>Across routers: DHCP relay</h2>
      <p>
        Broadcasts stop at routers, so one central DHCP server can't hear Discovers from other subnets on its own. A <b>DHCP relay</b> (the <code>ip helper-address</code> on a router) listens for them, then forwards them by unicast to the server, adding which subnet they came from.
      </p>

      <h2>DHCP in Azure</h2>
      <ul>
        <li>Azure runs DHCP for every VNet for you. VMs get their private IP from the platform, starting at <code>.4</code> in each subnet (.0–.3 are reserved).</li>
        <li>A "static" private IP in Azure is set on the <b>NIC in Azure</b>, not inside the OS. Keep the OS on DHCP, or you risk losing connectivity.</li>
        <li>You can't run your own DHCP server for VMs in a VNet, because the platform answers first. DNS server settings are pushed through DHCP from the VNet's DNS setting.</li>
      </ul>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>DORA: Discover, Offer, Request, Ack. Client port 68, server port 67, both UDP.</li>
        <li>Discover and Request are broadcasts because the client has no address yet.</li>
        <li>Leases expire; clients renew at T1 (50%) and rebind at T2 (87.5%).</li>
        <li>169.254.x.x means DHCP failed; relays carry DHCP across routers.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "What source IP does a DHCP Discover use?", options: ["The last address it had", "0.0.0.0", "255.255.255.255", "The gateway's IP"], answer: 1, why: "The client has no address yet, so it sends from 0.0.0.0 to the broadcast address." },
        { q: "With a 24-hour lease, when does a client first try to renew?", options: ["After 1 hour", "After 12 hours", "After 21 hours", "At expiry"], answer: 1, why: "T1 is 50% of the lease: 12 hours." },
        { q: "A VM in Azure needs a fixed private IP. Where do you set it?", options: ["Inside the OS network settings", "On the Azure NIC's IP configuration (static)", "On a DHCP server VM", "In DNS"], answer: 1, why: "Azure assigns the reserved address via its own DHCP; set it static on the NIC and keep the OS on DHCP." },
        { q: "Clients on subnet B get no address from the DHCP server on subnet A. What's missing?", options: ["A DHCP relay (helper) on the router", "A bigger pool", "An MX record", "NAT"], answer: 0, why: "Broadcast Discovers don't cross the router unless a relay forwards them." },
      ]} />
    </>
  );
}
