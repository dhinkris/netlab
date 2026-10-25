// Two switches joined by an 802.1Q trunk, plus a router-on-a-stick for inter-VLAN traffic.

export type Vlan = { id: number; name: string; subnet: string };
export const VLANS: Vlan[] = [
  { id: 10, name: "Staff", subnet: "10.10.0.0/24" },
  { id: 20, name: "Voice", subnet: "10.20.0.0/24" },
  { id: 30, name: "Guest", subnet: "10.30.0.0/24" },
];

export type Device = { name: string; sw: 0 | 1; port: number; vlan: number };
export const DEVICES: Device[] = [
  { name: "pc-1", sw: 0, port: 1, vlan: 10 },
  { name: "phone-1", sw: 0, port: 2, vlan: 20 },
  { name: "pc-2", sw: 0, port: 3, vlan: 10 },
  { name: "pc-3", sw: 1, port: 2, vlan: 10 },
  { name: "phone-2", sw: 1, port: 3, vlan: 20 },
  { name: "guest", sw: 1, port: 4, vlan: 30 },
];

/** 802.1Q inserts a 4-byte tag after the source MAC; 12 of its bits are the VLAN ID (1–4094 usable). */
export const TAG_BYTES = 4;
export const VLAN_ID_BITS = 12;
