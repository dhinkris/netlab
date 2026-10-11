export type Port = {
  port: number;
  name: string;
  proto: "TCP" | "UDP" | "TCP/UDP";
  what: string;
};

// The well-known ports you meet every day (IANA assignments).
export const PORTS: Port[] = [
  { port: 22, name: "SSH", proto: "TCP", what: "Secure shell to Linux machines" },
  { port: 53, name: "DNS", proto: "UDP", what: "Name lookups (TCP for large answers / zone transfers)" },
  { port: 80, name: "HTTP", proto: "TCP", what: "Plain web traffic" },
  { port: 123, name: "NTP", proto: "UDP", what: "Time synchronisation" },
  { port: 443, name: "HTTPS", proto: "TCP", what: "Web traffic over TLS (HTTP/3 uses UDP 443)" },
  { port: 3389, name: "RDP", proto: "TCP", what: "Remote desktop to Windows" },
];

export const RANGES = [
  { from: 0, to: 1023, name: "Well-known", note: "System services (need admin to bind on Linux)" },
  { from: 1024, to: 49151, name: "Registered", note: "Apps register these with IANA (e.g. 3306 MySQL, 5432 Postgres)" },
  { from: 49152, to: 65535, name: "Ephemeral (dynamic)", note: "Picked at random by the client for its side of a connection" },
];

/** A TCP connection's lifecycle as the figure plays it. */
export const TCP_STEPS = ["SYN", "SYN-ACK", "ACK", "DATA"] as const;
export const UDP_STEPS = ["DATA"] as const;
