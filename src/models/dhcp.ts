// DHCP (RFC 2131) as the figure plays it.

export const SERVER_IP = "10.0.1.1";
export const POOL = Array.from({ length: 8 }, (_, i) => `10.0.1.${4 + i}`); // .4 – .11
export const LEASE_H = 24; // a typical home-router lease
export const T1 = 0.5; // renew at 50% of the lease (unicast to the server)
export const T2 = 0.875; // rebind at 87.5% (broadcast to any server)
export const SECONDS_PER_HOUR = 1; // figure time: 1 s = 1 h

export type Msg = "DISCOVER" | "OFFER" | "REQUEST" | "ACK" | "RELEASE";

export const WIRE: Record<Msg, string> = {
  DISCOVER: "0.0.0.0:68 → 255.255.255.255:67 (broadcast)",
  OFFER: `${SERVER_IP}:67 → client:68 · "you can have this address"`,
  REQUEST: "0.0.0.0:68 → 255.255.255.255:67 · \"I'll take it\" (broadcast so other servers know)",
  ACK: `${SERVER_IP}:67 → client:68 · lease confirmed`,
  RELEASE: `client:68 → ${SERVER_IP}:67 · address handed back`,
};
