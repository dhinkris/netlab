import { WaterTower } from "../../figures/WaterTower";
import { Quiz } from "../Quiz";

export default function PrivateLinkService() {
  return (
    <>
      <h1>Private Link service</h1>
      <p className="lede">
        Private endpoints aren't only for Microsoft's PaaS. With <b>Private Link service</b> you can publish <i>your own</i> service, so other teams, subscriptions or customers can consume it through a private endpoint in their own VNet: no peering, no public IPs, no address-space coordination.
      </p>

      <WaterTower />

      <h2>How it's built</h2>
      <ol>
        <li>The provider runs the service behind a <b>Standard internal load balancer</b>.</li>
        <li>The provider creates a <b>Private Link service</b> attached to that LB's frontend, with NAT IPs from a provider subnet.</li>
        <li>A consumer creates a <b>private endpoint</b> in their own VNet pointing at the Private Link service (by resource ID or alias).</li>
        <li>The provider <b>approves</b> the connection (or auto-approves listed subscriptions).</li>
      </ol>

      <h2>Why it's useful</h2>
      <ul>
        <li><b>Overlapping address spaces are fine</b>: each consumer's endpoint takes an IP from its own range.</li>
        <li><b>One direction only</b>: consumers reach the service; the provider can't initiate connections into consumer VNets.</li>
        <li><b>No peering</b>: consumers see one IP, not the provider's network.</li>
        <li><b>SaaS-friendly</b>: vendors use it to offer private connectivity to customers in other tenants.</li>
      </ul>
      <div className="callout">
        <b>Source IPs are NATed.</b> The service sees connections from the Private Link service's NAT IPs, not the consumer's address. If you need the original client IP, enable TCP Proxy Protocol v2 on the Private Link service and parse it in your app.
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Private Link service publishes your own LB-fronted service to private endpoints elsewhere.</li>
        <li>Consumers connect from their own address space; overlaps don't matter.</li>
        <li>Providers approve connections; traffic is consumer-initiated only.</li>
        <li>The service sees NAT IPs; use Proxy Protocol v2 for real client IPs.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "Two customers both use 10.0.0.0/16. Can both consume your Private Link service?", options: ["No, addresses overlap", "Yes: each private endpoint uses an IP from its own VNet", "Only one at a time", "Only with peering"], answer: 1, why: "Nothing is peered; each side keeps its own addressing." },
        { q: "What must sit in front of the provider's service?", options: ["Application Gateway", "Standard internal load balancer", "NAT Gateway", "Front Door"], answer: 1, why: "Private Link service attaches to a Standard LB frontend." },
        { q: "What source IP does the provider's backend see?", options: ["The consumer VM's IP", "The Private Link service's NAT IPs", "The consumer's public IP", "168.63.129.16"], answer: 1, why: "Traffic is NATed into the provider's subnet." },
        { q: "A consumer's private endpoint shows 'Pending'. What's needed?", options: ["DNS change", "Provider approval of the connection", "A route table", "A public IP"], answer: 1, why: "Connections need approval unless the subscription is auto-approved." },
      ]} />
    </>
  );
}
