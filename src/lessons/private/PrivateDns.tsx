import { Switchboard } from "../../figures/Switchboard";
import { Quiz } from "../Quiz";

export default function PrivateDns() {
  return (
    <>
      <h1>Private DNS for endpoints</h1>
      <p className="lede">
        A private endpoint gives a storage account a private IP, but applications still connect to <code>mystorage.blob.core.windows.net</code>. DNS has to return the private IP to your networks and the public IP to everyone else, from the same name.
      </p>

      <Switchboard />

      <h2>How the name resolves</h2>
      <ol>
        <li>Public DNS answers <code>mystorage.blob.core.windows.net</code> with a <b>CNAME</b> to <code>mystorage.privatelink.blob.core.windows.net</code>. This happens once a private endpoint exists, for everyone.</li>
        <li>If the resolver asking can see a <b>private DNS zone</b> named <code>privatelink.blob.core.windows.net</code> (because the zone is <b>linked</b> to its VNet), it returns that zone's A record: <b>10.0.1.5</b>.</li>
        <li>Otherwise resolution continues in public DNS and ends at the public IP.</li>
      </ol>

      <h2>Making it work</h2>
      <ul>
        <li>Create the right zone per service: <code>privatelink.blob.core.windows.net</code>, <code>privatelink.database.windows.net</code>, <code>privatelink.vaultcore.azure.net</code>…</li>
        <li><b>Link</b> the zone to every VNet whose VMs use the endpoint (in hub-and-spoke: link to the hub where your DNS resolver lives, and point spokes' DNS at it).</li>
        <li>Let the private endpoint's <b>DNS zone group</b> create and maintain the A record automatically.</li>
        <li>For on-premises: conditional-forward the <i>public</i> zone (e.g. <code>blob.core.windows.net</code>) to an Azure <b>DNS Private Resolver</b> inbound endpoint.</li>
      </ul>
      <div className="callout">
        <b>Don't forward to the privatelink name.</b> On-premises clients query the normal name; forward <code>blob.core.windows.net</code> (not <code>privatelink.blob.core.windows.net</code>) so the CNAME chain is followed inside Azure.
      </div>

      <h2>Troubleshooting</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Symptom</th><th>Likely cause</th></tr></thead>
          <tbody>
            <tr><td><code>nslookup</code> returns a public IP from a VM</td><td>The private zone isn't linked to that VM's VNet, or the VNet uses a custom DNS server that doesn't forward to 168.63.129.16</td></tr>
            <tr><td>Works in Azure, fails on-prem</td><td>No conditional forwarder to the DNS Private Resolver</td></tr>
            <tr><td>Resolves privately but connection refused</td><td>DNS is fine; check NSG on the endpoint subnet or the endpoint's approval state</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>Public DNS aliases the service name to its privatelink name.</li>
        <li>A private DNS zone for that privatelink name, linked to your VNets, returns the private IP.</li>
        <li>Unlinked VNets and the internet still get the public IP.</li>
        <li>On-prem: forward the public zone to a DNS Private Resolver.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "A VM in a peered VNet resolves the storage account to its public IP. Fix?", options: ["Add a public IP", "Link the privatelink zone to that VNet (or use a shared resolver that sees it)", "Open port 443", "Recreate the endpoint"], answer: 1, why: "Only VNets that can see the private zone get the private answer." },
        { q: "What does public DNS return for mystorage.blob.core.windows.net once a private endpoint exists?", options: ["The private IP", "A CNAME to mystorage.privatelink.blob.core.windows.net", "NXDOMAIN", "Nothing"], answer: 1, why: "The CNAME lets private zones intercept the next step." },
        { q: "Which zone should on-prem DNS conditionally forward to Azure?", options: ["privatelink.blob.core.windows.net", "blob.core.windows.net", "windows.net", "core.windows.net only"], answer: 1, why: "Forward the public zone so the whole CNAME chain resolves inside Azure." },
        { q: "Which Azure IP is the platform DNS resolver every VNet can use?", options: ["10.0.0.1", "168.63.129.16", "8.8.8.8", "169.254.169.254"], answer: 1, why: "168.63.129.16 is Azure-provided DNS (and health probe source)." },
      ]} />
    </>
  );
}
