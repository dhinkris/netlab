import { useMemo, useRef, useState } from "react";
import {
  alongPath, box, boundsOf, camera, cyl, dotsItem, ease, faceText, halo, headingAt, line3, prism, rotRect, rrect, sortItems, tube,
  type Fam, type Item, type LineItem, type Seg, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useReducedMotion, useTour } from "../iso/live";
import { splitSay, useScript } from "../iso/script";

const C = camera(30, 40);
const GZ = 4;
type Field = { id: string; name: string; cidr: string; x: number; y: number; fam: Fam };
const HUB: Field = { id: "hub", name: "hub VNet", cidr: "10.0.0.0/16", x: 128, y: 74, fam: "sig" };
const SPOKES: Field[] = [
  { id: "web", name: "spoke-web", cidr: "10.1.0.0/16", x: 52, y: 18, fam: "blue" },
  { id: "app", name: "spoke-app", cidr: "10.2.0.0/16", x: 216, y: 26, fam: "violet" },
  { id: "data", name: "spoke-data", cidr: "10.3.0.0/16", x: 206, y: 126, fam: "teal" },
];
const ONPREM: V3 = [8, 110, GZ];
const TOWER: V3 = [152, 58, GZ];
const HANGAR = { x: 96, y: 54 };
const field = (id: string) => (id === "hub" ? HUB : SPOKES.find((s) => s.id === id)!);
const pad = (f: Field): V3 => (f.id === "hub" ? [HUB.x, HUB.y + 8, GZ + 0.4] : [f.x, f.y + 6, GZ + 0.4]);

/** A flight: climb out, cruise, descend. */
function flight(a: V3, b: V3, alt = 30): V3[] {
  const pts: V3[] = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const h = Math.min(1, Math.min(u, 1 - u) * 4.5);
    pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, GZ + 0.4 + alt * ease(h)]);
  }
  return pts;
}

function airfield(f: Field, big: boolean): Item[] {
  const it: Item[] = [];
  const k = (f.x + f.y) * 0.01;
  const L = big ? 76 : 40, W = big ? 9 : 6;
  it.push(box(C, f.x - L / 2, f.y + 6 - W / 2, GZ, L, W, 0.3, "lo", { key: k }));
  let dash = "";
  for (let x = f.x - L / 2 + 3; x < f.x + L / 2 - 3; x += 6) dash += line3(C, [[x, f.y + 6, GZ + 0.32], [x + 3, f.y + 6, GZ + 0.32]]);
  it.push({ kind: "line", d: dash, tone: "lit", w: 0.5, layer: 0, key: k + 0.001 } as LineItem);
  if (!big) {
    it.push(box(C, f.x - 10, f.y - 12, GZ, 20, 12, 8, "hi", { key: k + 0.002, bevel: 0.4 }));
    it.push(box(C, f.x - 11, f.y - 13, GZ + 8, 22, 14, 1.4, f.fam, { key: k + 0.003 }));
    it.push(faceText(C, f.name, [f.x, f.y, GZ + 5.4], "+y", 2.8, "ink", { key: k + 0.004, weight: 700 }));
    it.push(faceText(C, f.cidr, [f.x, f.y, GZ + 2.2], "+y", 2.1, "ink", { key: k + 0.004 }));
  }
  return it;
}

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-12, -12, 262, 156, 8);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, GZ - 1, "sand", { key: -100, bevel: 1 }));
  it.push(prism(C, rrect(-11, -11, 260, 154, 7.5), GZ - 1, 1, "moss", { key: -99 }));
  // peering corridors: dotted lines from the hub to each spoke
  SPOKES.forEach((sp, i) => {
    const a = pad(HUB), b = pad(sp), pts: V3[] = [];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let d = 26; d < L - 22; d += 4) pts.push([a[0] + ((b[0] - a[0]) * d) / L, a[1] + ((b[1] - a[1]) * d) / L, GZ + 0.2]);
    it.push({ ...dotsItem(C, pts, 0.8, "sig", 0), key: -95 + i * 0.01 });
    const m = pts[Math.floor(pts.length / 2)];
    it.push(faceText(C, "peering", [m[0], m[1] - 3, GZ + 0.2], "top", 1.9, "sig", { key: -94.9, weight: 700 }));
  });
  // hub apron
  it.push(box(C, HUB.x - 46, HUB.y - 26, GZ, 92, 44, 0.2, "sand", { key: -90, r: 3 }));
  it.push(...airfield(HUB, true));
  SPOKES.forEach((s) => it.push(...airfield(s, false)));
  // terminal
  it.push(box(C, HUB.x - 18, HUB.y - 22, GZ, 36, 14, 10, "hi", { key: 1, bevel: 0.4 }));
  it.push(box(C, HUB.x - 19, HUB.y - 23, GZ + 10, 38, 16, 1.4, "sig", { key: 1.1 }));
  it.push(faceText(C, "HUB VNET 10.0.0.0/16", [HUB.x, HUB.y - 8, GZ + 6], "+y", 2.4, "ink", { key: 1.2, weight: 700 }));
  it.push(faceText(C, "shared services", [HUB.x, HUB.y - 8, GZ + 3], "+y", 1.8, "ink", { key: 1.2 }));
  // VPN gateway hangar and its tunnel to on-premises
  it.push(box(C, HANGAR.x - 10, HANGAR.y - 8, GZ, 16, 12, 9, "hi", { key: 2, bevel: 0.4 }));
  it.push(box(C, HANGAR.x - 11, HANGAR.y - 9, GZ + 9, 18, 14, 1.4, "blue", { key: 2.1 }));
  it.push(faceText(C, "VPN GW", [HANGAR.x - 2, HANGAR.y + 4, GZ + 4.5], "+y", 2, "ink", { key: 2.2, weight: 700 }));
  it.push(...tube(C, [[HANGAR.x - 10, HANGAR.y, GZ + 1.4], [40, HANGAR.y, GZ + 1.4], [40, ONPREM[1], GZ + 1.4], [ONPREM[0] + 12, ONPREM[1], GZ + 1.4]], "blue", -50, 3.6));
  it.push(box(C, ONPREM[0] - 12, ONPREM[1] - 12, GZ, 24, 22, 16, "hi", { key: -40, bevel: 0.5 }));
  it.push(box(C, ONPREM[0] - 13, ONPREM[1] - 13, GZ + 16, 26, 24, 1.4, "rose", { key: -39.9 }));
  it.push(faceText(C, "ON-PREM HQ", [ONPREM[0], ONPREM[1] + 10, GZ + 10], "+y", 2.4, "ink", { key: -39.8, weight: 700 }));
  it.push(faceText(C, "IPsec tunnel", [24, HANGAR.y + 2.4, GZ], "top", 1.8, "blue", { key: -39.7, weight: 700 }));
  // firewall control tower
  it.push(cyl(C, TOWER[0], TOWER[1], GZ, 4, 22, "hi", { key: 3, n: 20 }));
  it.push(cyl(C, TOWER[0], TOWER[1], GZ + 22, 7, 6, "warn", { key: 3.1, n: 24, bevel: 0.4 }));
  it.push(cyl(C, TOWER[0], TOWER[1], GZ + 28, 7.6, 1.2, "hi", { key: 3.2, n: 24 }));
  it.push(faceText(C, "FIREWALL", [TOWER[0] + 9, TOWER[1] + 2, GZ + 24], "+y", 2.2, "warn", { anchor: "start", key: 3.3, weight: 700 }));
  // "internet" edge marker
  it.push(faceText(C, "→ INTERNET", [238, 80, GZ], "top", 3, "sig", { key: 4, weight: 700 }));
  return sortItems(it);
}

// ---------- script ----------

type Plane = { path: V3[]; u: number; fam: Fam };
type Fr = { plane: Plane | null; pulse: V3 | null; tower: Fam; peering: boolean; say: string };
type Scene = "web-app" | "onprem-data" | "app-internet" | "direct";

function script(sc: Scene): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  const F = (p: Partial<Fr>): Fr => ({ plane: null, pulse: null, tower: "mid", peering: false, say: "", ...p });
  const fly = (a: V3, b: V3, fam: Fam, say: string, extra: Partial<Fr> = {}, d = 2.2) => { const path = flight(a, b); segs.push({ d, f: (u) => F({ ...extra, plane: { path, u: ease(u), fam }, say }) }); };
  const inspect = (fam: Fam, say: string) => {
    const atHub = pad(HUB);
    segs.push({ d: 0.8, f: (u) => F({ plane: { path: [atHub, [TOWER[0] - 6, HUB.y + 8, GZ + 0.4]], u: ease(u), fam }, tower: "sig", say }) });
    segs.push({ d: 0.8, f: () => F({ plane: { path: [[TOWER[0] - 6, HUB.y + 8, GZ + 0.4]], u: 0, fam }, tower: "ok", say: `${say} · allowed by policy` }) });
    return [TOWER[0] - 6, HUB.y + 8, GZ + 0.4] as V3;
  };
  if (sc === "web-app") {
    fly(pad(field("web")), pad(HUB), "blue", "spoke-web → spoke-app · the spoke's UDR sends 10.2.0.0/16 to the hub firewall");
    const from = inspect("blue", "Firewall inspects and logs it");
    fly(from, pad(field("app")), "blue", "Hub → spoke-app · spoke-to-spoke always transits the hub");
    segs.push({ d: 1.3, f: () => F({ tower: "ok", say: "Two peerings + UDRs, one inspection point" }) });
  } else if (sc === "onprem-data") {
    const tun: V3[] = [[ONPREM[0] + 12, ONPREM[1], GZ + 2.4], [40, ONPREM[1], GZ + 2.4], [40, HANGAR.y, GZ + 2.4], [HANGAR.x - 10, HANGAR.y, GZ + 2.4]];
    segs.push({ d: 1.6, f: (u) => F({ pulse: alongPath(tun, ease(u)), say: "On-prem → spoke-data · through the IPsec tunnel to the hub's VPN gateway" }) });
    const from = inspect("rose", "Gateway transit: the spoke uses the hub's gateway, traffic still passes the firewall");
    fly(from, pad(field("data")), "rose", "Hub → spoke-data · the spoke never needed its own gateway");
    segs.push({ d: 1.3, f: () => F({ tower: "ok", say: "One gateway in the hub serves every spoke" }) });
  } else if (sc === "app-internet") {
    fly(pad(field("app")), pad(HUB), "violet", "spoke-app → internet · 0.0.0.0/0 UDR points at the hub firewall");
    const from = inspect("violet", "Firewall applies FQDN rules and SNATs to its public IP");
    fly(from, [262, 80, GZ + 0.4], "violet", "Out to the internet from one well-known IP");
    segs.push({ d: 1.2, f: () => F({ tower: "ok", say: "Central egress: one place to filter and log outbound" }) });
  } else {
    fly(pad(field("web")), pad(field("app")), "warn", "Direct peering spoke-web ↔ spoke-app · traffic skips the hub", { peering: true }, 2.6);
    segs.push({ d: 1.6, f: () => F({ peering: true, say: "Faster, but the firewall never sees it · only do this deliberately" }) });
  }
  return segs;
}

function liveItems(fr: Fr): Item[] {
  const it: Item[] = [];
  it.push(cyl(C, TOWER[0], TOWER[1], GZ + 29.2, 2, 2, fr.tower, { key: 0, n: 14 }));
  if (fr.peering) {
    const a = SPOKES[0], b = SPOKES[1];
    it.push({ kind: "line", d: line3(C, [[a.x + 10, a.y - 4, GZ + 9], [b.x - 10, b.y - 4, GZ + 9]]), tone: "warn", w: 0.8, layer: 0, key: 1, dash: "3 2" } as LineItem);
  }
  if (fr.pulse) it.push({ ...dotsItem(C, [fr.pulse], 2.2, "rose", 0), key: 2 });
  if (fr.plane) {
    const p = alongPath(fr.plane.path, fr.plane.u);
    const a = fr.plane.path.length > 1 ? headingAt(fr.plane.path, Math.min(0.99, Math.max(0.01, fr.plane.u))) : 0;
    const ca = Math.cos(a), sa = Math.sin(a);
    // shadow on the ground, then fuselage, wings, tail
    it.push(prism(C, rotRect(p[0], p[1], 21, 4.5, a), GZ + 0.1, 0.05, "lo", { key: 3 }));
    it.push(prism(C, rotRect(p[0], p[1], 22, 4.5, a), p[2], 3.6, fr.plane.fam, { key: 4, bevel: 0.4 }));
    it.push(prism(C, rotRect(p[0] + ca * 1.5, p[1] + sa * 1.5, 6, 27, a), p[2] + 1.4, 0.8, "hi", { key: 4.1 }));
    it.push(prism(C, rotRect(p[0] - ca * 9.5, p[1] - sa * 9.5, 3, 1.4, a), p[2] + 3.6, 4.5, fr.plane.fam, { key: 4.2 }));
  }
  return sortItems(it);
}

export function HubAirport() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [scene, setScene] = useState<Scene>("web-app");
  const [run, setRun] = useState(0);
  const tour = useRef(0);

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y - 20} ${b.w} ${b.h + 20}`; }, [stat]);
  const segs = useMemo(() => script(scene), [scene]);
  const fr = useScript(segs, `${run}-${scene}`, inView, reduced, { plane: null, pulse: null, tower: "mid", peering: false, say: "" } as Fr);

  const go = (s: Scene) => { setScene(s); setRun((r) => r + 1); };
  const poke = useTour(() => { const seq: Scene[] = ["web-app", "onprem-data", "app-internet", "direct"]; go(seq[++tour.current % 4]); }, inView && !reduced, 7.5, 6);
  const dyn = useMemo(() => liveItems(fr), [fr]);
  const { head, rest } = splitSay(fr.say);

  return (
    <div>
      <Card
        n={24}
        title="Hub airport"
        hint="pick a journey"
        readout={<><b>{head}</b>{rest.map((s, i) => <span key={i}> · {s}</span>)}</>}
        viewBox={vb}
        label="An airfield map. The hub airport holds the shared services: a firewall control tower and a VPN gateway hangar with an IPsec tunnel to on-premises HQ. Three spoke airfields connect only to the hub. Flights between spokes land at the hub and pass the tower; on-premises traffic arrives through the hub's gateway; a direct spoke-to-spoke peering skips inspection."
        onKeyDown={() => poke()}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={dyn} />
      </Card>
      <div className="controls">
        <div className="seg">
          <button className={scene === "web-app" ? "on" : ""} onClick={() => { poke(); go("web-app"); }}><span className="c-blue">●</span> spoke-web → spoke-app</button>
          <button className={scene === "onprem-data" ? "on" : ""} onClick={() => { poke(); go("onprem-data"); }}><span className="c-rose">●</span> on-prem → spoke-data</button>
          <button className={scene === "app-internet" ? "on" : ""} onClick={() => { poke(); go("app-internet"); }}><span className="c-violet">●</span> spoke-app → internet</button>
          <button className={scene === "direct" ? "on" : ""} onClick={() => { poke(); go("direct"); }}>direct spoke peering</button>
        </div>
      </div>
      <Legend items={[
        { swatch: "sig", text: "Hub: shared services" },
        { swatch: "warn", text: "Firewall (inspection point)" },
        { swatch: "blue", text: "VPN gateway + tunnel" },
        { swatch: "moss", text: "Spokes: one per workload/team" },
      ]} />
      <p className="caption">
        Spokes peer only with the hub, and their route tables send everything else to the hub firewall. That gives one place to inspect, log and egress, one gateway for on-premises, and spokes that can be added without touching each other.
      </p>
    </div>
  );
}
