import { VlanWall } from "../../figures/VlanWall";
import { Quiz } from "../Quiz";

export default function Vlans() {
  return (
    <>
      <h1>VLANs & trunks</h1>
      <p className="lede">
        A <b>VLAN</b> (virtual LAN) splits one physical switch, or a whole set of switches, into several separate Layer 2 networks. Devices in different VLANs can't see each other's frames or broadcasts, even when they're plugged into the same box.
      </p>

      <VlanWall />

      <h2>Access ports and trunk ports</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th>Access port</th><th>Trunk port</th></tr></thead>
          <tbody>
            <tr><td>Carries</td><td>One VLAN</td><td>Many VLANs</td></tr>
            <tr><td>Frames on the wire</td><td>Untagged (the device doesn't know about VLANs)</td><td>Tagged with 802.1Q (except the native VLAN)</td></tr>
            <tr><td>Connects to</td><td>PCs, phones, printers, servers</td><td>Other switches, routers, hypervisors</td></tr>
          </tbody>
        </table>
      </div>

      <h2>The 802.1Q tag</h2>
      <p>
        A trunk keeps VLANs apart by inserting a <b>4-byte tag</b> into each Ethernet frame, right after the source MAC. Twelve of its bits are the <b>VLAN ID</b> (1–4094 usable); three more are a priority value used for voice and video QoS. The receiving switch reads the tag, strips it, and delivers the frame only to ports in that VLAN.
      </p>
      <div className="callout">
        <b>Native VLAN:</b> one VLAN per trunk travels untagged (VLAN 1 by default). Mismatched native VLANs on the two ends silently leak traffic between VLANs. Set it explicitly, and preferably to an unused VLAN.
      </div>

      <h2>VLAN = subnet = broadcast domain</h2>
      <ul>
        <li>Each VLAN normally gets its own IP subnet (VLAN 10 → 10.10.0.0/24).</li>
        <li>Broadcasts, including ARP and DHCP Discover, stay inside the VLAN.</li>
        <li>Traffic <b>between</b> VLANs must be routed: by a router-on-a-stick (one trunk, a sub-interface per VLAN), a Layer 3 switch, or a firewall that also enforces policy.</li>
      </ul>

      <h2>Why use VLANs</h2>
      <ul>
        <li><b>Security:</b> keep guests, IoT devices and payment terminals off the staff network.</li>
        <li><b>Smaller broadcast domains:</b> less noise, fewer hosts affected by a misbehaving device.</li>
        <li><b>Flexibility:</b> move someone to another network by changing a port setting, not a cable.</li>
      </ul>

      <h2>And in Azure?</h2>
      <p>
        Azure VNets don't expose VLANs; <b>subnets</b> play the same role. Each subnet is its own broadcast-free segment, traffic between subnets is routed by the platform, and NSGs filter it, much like a firewall between VLANs. On-premises VLANs typically reach Azure through ExpressRoute or VPN, each mapping to a routed prefix.
      </p>

      <h2>Key takeaways</h2>
      <ul className="takeaways">
        <li>A VLAN is a separate Layer 2 network on shared switches; one VLAN ≈ one subnet.</li>
        <li>Access ports carry one VLAN untagged; trunks carry many, with 802.1Q tags (4 bytes, 12-bit ID).</li>
        <li>Broadcasts never cross VLANs; inter-VLAN traffic needs a router or Layer 3 switch.</li>
        <li>In Azure, subnets and NSGs replace VLANs.</li>
      </ul>

      <h2>Check yourself</h2>
      <Quiz items={[
        { q: "pc-1 (VLAN 10) sends an ARP broadcast. Who receives it?", options: ["Every device on both switches", "Only devices in VLAN 10, on either switch", "Only devices on the same switch", "Only the router"], answer: 1, why: "Broadcasts flood within the VLAN, across trunks, but never into other VLANs." },
        { q: "How does the receiving switch know which VLAN a frame on a trunk belongs to?", options: ["From the destination IP", "From the 802.1Q tag", "From the MAC address OUI", "It guesses"], answer: 1, why: "The 4-byte 802.1Q tag carries the 12-bit VLAN ID." },
        { q: "What's needed for VLAN 10 to talk to VLAN 20?", options: ["A trunk port", "A bigger switch", "A router, Layer 3 switch or firewall", "Nothing; they share a switch"], answer: 2, why: "Different VLANs are different subnets, so traffic between them must be routed." },
        { q: "How many usable VLAN IDs does 802.1Q allow?", options: ["256", "1,024", "4,094", "65,535"], answer: 2, why: "12 bits give 4,096 values; 0 and 4095 are reserved." },
      ]} />
    </>
  );
}
