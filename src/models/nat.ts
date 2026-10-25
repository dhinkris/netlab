// Source NAT as a NAT gateway does it: many private sources share one public IP,
// told apart by the public port each flow is given.

export const PUBLIC_IP = "203.0.113.50";
export const SERVER = { ip: "198.51.100.7", port: 443 };
export const STRANGER = "192.0.2.66";
export const FIRST_PORT = 1024;
/** Ports 1024–65535 on one public IP: what Azure NAT Gateway can hand out per address. */
export const SNAT_PORTS_PER_IP = 65536 - FIRST_PORT; // 64,512
/** Azure NAT Gateway's default TCP idle timeout, in minutes. */
export const IDLE_TIMEOUT_MIN = 4;

export const VMS = [
  { name: "vm-web", ip: "10.0.1.4", port: 51514 },
  { name: "vm-api", ip: "10.0.1.5", port: 49822 },
];

export type Mapping = { vm: number; priv: string; pub: string };
