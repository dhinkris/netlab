// Encapsulation of one HTTP request sent over TCP/IPv4/Ethernet.
// Header sizes are the minimum real sizes (no options).

export type Layer = {
  n: number; // OSI number
  name: string;
  tcpip: "Application" | "Transport" | "Internet" | "Link";
  pdu: string;
  adds: string; // what this layer adds
  header: number; // bytes added in front
  trailer: number; // bytes added behind
  examples: string;
  device: string;
};

export const PAYLOAD = 1200; // bytes of application data (an HTTP request with a body)

export const LAYERS: Layer[] = [
  { n: 7, name: "Application", tcpip: "Application", pdu: "Data", adds: "HTTP request (the data itself)", header: 0, trailer: 0, examples: "HTTP, DNS, SMTP, SSH", device: "—" },
  { n: 6, name: "Presentation", tcpip: "Application", pdu: "Data", adds: "Encoding / encryption (e.g. TLS, UTF-8, gzip)", header: 0, trailer: 0, examples: "TLS, JPEG, ASCII", device: "—" },
  { n: 5, name: "Session", tcpip: "Application", pdu: "Data", adds: "Dialogue control (in practice, part of the app)", header: 0, trailer: 0, examples: "RPC, NetBIOS", device: "—" },
  { n: 4, name: "Transport", tcpip: "Transport", pdu: "Segment", adds: "TCP header: source/destination port, sequence, ACK", header: 20, trailer: 0, examples: "TCP, UDP", device: "Firewall (L4), load balancer" },
  { n: 3, name: "Network", tcpip: "Internet", pdu: "Packet", adds: "IPv4 header: source/destination IP, TTL", header: 20, trailer: 0, examples: "IPv4, IPv6, ICMP", device: "Router" },
  { n: 2, name: "Data Link", tcpip: "Link", pdu: "Frame", adds: "Ethernet header (MACs, EtherType) + FCS checksum", header: 14, trailer: 4, examples: "Ethernet, Wi-Fi (802.11), ARP", device: "Switch" },
  { n: 1, name: "Physical", tcpip: "Link", pdu: "Bits", adds: "Preamble + SFD, then signals on the wire", header: 8, trailer: 0, examples: "Copper, fibre, radio", device: "Cable, hub, NIC PHY" },
];

/** Size of the unit after layer index i (0 = L7 … 6 = L1) has wrapped it. */
export function sizeAt(i: number) {
  let s = PAYLOAD;
  for (let k = 0; k <= i; k++) s += LAYERS[k].header + LAYERS[k].trailer;
  return s;
}

export const IFG_BYTES = 12; // inter-frame gap, idle time after every frame

export function bitsOnWire() {
  return sizeAt(6) * 8;
}
