import { useMemo, useRef, useState } from "react";
import {
  alongPath, blob, box, boundsOf, camera, cyl, ease, faceText, halo, headingAt, line3, offsetPath, pathOf, prism, proj, rotRect,
  rrect, smoothPath, sortItems, type Fam, type Item, type LineItem, type Seg, type Solid, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useReducedMotion, useTour } from "../iso/live";
import { splitSay, useScript } from "../iso/script";
import { DEFAULT_HOP_CHOICES, DESTS, pick, routes, type Hop } from "../models/udr";

const C = camera(24, 42);
const GZ = 5, WZ = GZ + 0.05;
const J: V3 = [84, 62, WZ];
const START: V3 = [28, 62, WZ];
const CH: Record<Hop, V3[]> = {
  Internet: smoothPath([J, [130, 64, WZ], [190, 60, WZ], [236, 58, WZ]], 3),
  VirtualAppliance: smoothPath([J, [104, 36, WZ], [140, 22, WZ], [176, 22, WZ], [204, 44, WZ], [236, 58, WZ]], 3),
  VirtualNetworkGateway: smoothPath([J, [118, 86, WZ], [150, 102, WZ], [172, 108, WZ]], 3),
  None: smoothPath([J, [92, 92, WZ], [96, 114, WZ]], 3),
  VnetLocal: smoothPath([J, [66, 92, WZ], [44, 112, WZ], [30, 118, WZ]], 3),
};
const HOP_FAM: Record<Hop, Fam> = { Internet: "sig", VirtualAppliance: "rose", VirtualNetworkGateway: "blue", None: "warn", VnetLocal: "teal" };
const LOCK_X = 158;

function water(path: V3[], w: number, key: number): Item[] {
  const band = [...offsetPath(path, w), ...offsetPath(path, -w).reverse()].map((p) => proj(C, [p[0], p[1], WZ]));
  const d = pathOf(band, true);
  const s: Solid = { kind: "solid", faces: [{ d, fill: "var(--sea-t)" }], creases: "", outline: "", layer: 0, key };
  // quay edges stop short of the junction, where channels merge into one pool of water
  const away = (q: V3) => Math.hypot(q[0] - J[0], q[1] - J[1]) > 14;
  const edge = (side: number) => { const pts = offsetPath(path, side).filter(away).map(([x, y]) => [x, y, GZ + 0.1] as V3); return pts.length > 1 ? line3(C, pts) : ""; };
  // edges are drawn in a later pass (key + 10), after every channel's water
  return [s, { kind: "line", d: edge(w) + edge(-w), tone: "hi", w: 0.7, layer: 0, key: key + 10 } as LineItem];
}
function pool(cx: number, cy: number, rx: number, ry: number, seed: number, key: number): Item[] {
  const pts = blob(cx, cy, rx, ry, seed, 0.1).pts.map(([x, y]) => proj(C, [x, y, WZ]));
  const d = pathOf(pts, true);
  return [{ kind: "solid", faces: [{ d, fill: "var(--sea-t)" }], creases: "", outline: d, layer: 0, key } as Solid];
}

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-12, -8, 262, 140, 8);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, GZ - 1, "sand", { key: -100, bevel: 1 }));
  it.push(prism(C, rrect(-11, -7, 260, 138, 7.5), GZ - 1, 1, "moss", { key: -99 }));
  // basins and channels
  it.push(...pool(20, 62, 22, 14, 1, -90));
  it.push(...water(smoothPath([START, J], 2), 6, -89));
  (Object.keys(CH) as Hop[]).forEach((h, i) => it.push(...water(CH[h], h === "None" || h === "VnetLocal" ? 5 : 6, -88 + i * 0.01)));
  it.push(...pool(30, 120, 16, 8, 2, -87));
  it.push(...pool(98, 120, 9, 6, 3, -86.9));
  // sea on the right edge
  it.push(box(C, 230, -7, GZ - 0.6, 19, 138, 0.7, "sea", { key: -86 }));
  // labels painted on the quays
  const lbl = (t: string, x: number, y: number, fam: Fam) => it.push(faceText(C, t, [x, y, GZ], "top", 2.4, fam, { key: -80, weight: 700 }));
  lbl("snet-app 10.0.2.0/24", 20, 80, "violet");
  lbl("snet-db (VnetLocal)", 32, 130, "teal");
  lbl("DROPPED (None)", 100, 130, "warn");
  // lighthouse at the sea: the internet
  it.push(cyl(C, 222, 40, GZ, 4, 22, "hi", { key: 10, n: 18 }));
  it.push(cyl(C, 222, 40, GZ + 22, 5, 3, "sig", { key: 10.1, n: 18 }));
  it.push(cyl(C, 222, 40, GZ + 25, 3, 2, "warn", { key: 10.2, n: 14 }));
  lbl("INTERNET", 222, 50, "sig");
  // firewall lock on the appliance channel: two walls and a gatehouse
  for (const y of [14, 30]) it.push(box(C, LOCK_X - 12, y - 1.5, GZ, 24, 3, 4, "hi", { key: 5 + y * 0.01 }));
  it.push(box(C, LOCK_X - 5, 2, GZ, 10, 9, 10, "sand", { key: 4, bevel: 0.3 }));
  it.push(box(C, LOCK_X - 6, 1, GZ + 10, 12, 11, 1.4, "rose", { key: 4.1 }));
  it.push(faceText(C, "FIREWALL 10.0.0.4", [LOCK_X, 11, GZ + 6], "+y", 1.8, "ink", { key: 4.2, weight: 700 }));
  // tunnel portal in a hill: the VPN gateway to on-premises
  for (let l = 0; l < 3; l++) it.push(prism(C, blob(184, 112, 18 - l * 5, 14 - l * 4, 4 + l, 0.1), GZ + l * 5, 5, l === 2 ? "moss" : "sand", { key: 20 + l * 0.01 }));
  it.push(box(C, 168, 104, GZ, 4, 10, 9, "lo", { key: 21 }));
  lbl("VPN GW → ON-PREM", 186, 130, "blue");
  // route-table house at the junction
  it.push(box(C, J[0] - 12, 26, GZ, 24, 14, 12, "hi", { key: 1, bevel: 0.4 }));
  it.push(box(C, J[0] - 13, 25, GZ + 12, 26, 16, 1.6, "violet", { key: 1.1 }));
  it.push(faceText(C, "ROUTE TABLE", [J[0], 40, GZ + 8], "+y", 2.2, "ink", { key: 1.2, weight: 700 }));
  it.push(faceText(C, "rt-app → snet-app", [J[0], 40, GZ + 5], "+y", 1.6, "ink", { key: 1.2 }));
  return sortItems(it);
}

// ---------- script ----------

type Boat = { path: V3[]; u: number; fam: Fam };
type Fr = { boat: Boat | null; gate: number; say: string };

function script(dest: string, defHop: Hop): Seg<Fr>[] {
  const rs = routes(defHop);
  const i = pick(dest, rs);
  const r = rs[i];
  const path = [START, ...CH[r.hop]];
  const segs: Seg<Fr>[] = [];
  const F = (p: Partial<Fr>): Fr => ({ boat: null, gate: 0, say: "", ...p });
  const head = `${dest} matches ${r.prefix}/${r.len} → ${r.hop}`;
  const why = r.len === 0 ? (r.source === "User" ? "your UDR replaced the default route" : "system default route") : r.hop === "VnetLocal" ? "the VNet route is more specific than any 0.0.0.0/0" : "a more specific learned route beats 0.0.0.0/0";
  segs.push({ d: 0.9, f: (u) => F({ boat: { path: [START, J], u: ease(u) * 0.95, fam: "hi" }, say: `Packet for ${dest} leaves snet-app` }) });
  segs.push({ d: 0.7, f: () => F({ boat: { path: [START, J], u: 0.95, fam: HOP_FAM[r.hop] }, say: `${head} · ${why}` }) });
  if (r.hop === "VirtualAppliance") {
    const lockU = (() => { for (let k = 0; k <= 400; k++) if (alongPath(path, k / 400)[0] >= LOCK_X - 14) return k / 400; return 0.6; })();
    const startU = (() => { for (let k = 0; k <= 400; k++) if (alongPath(path, k / 400)[0] >= J[0]) return k / 400; return 0.3; })();
    segs.push({ d: 1.4, f: (u) => F({ boat: { path, u: startU + (lockU - startU) * ease(u), fam: HOP_FAM[r.hop] }, say: `${head} · sent to the firewall at 10.0.0.4` }) });
    segs.push({ d: 0.9, f: (u) => F({ boat: { path, u: lockU, fam: HOP_FAM[r.hop] }, gate: ease(u), say: "Firewall inspects it · lock gates open" }) });
    segs.push({ d: 1.8, f: (u) => F({ boat: { path, u: lockU + (1 - lockU) * ease(u), fam: HOP_FAM[r.hop] }, gate: 1 - ease(u), say: "Out to the internet from the firewall's public IP" }) });
  } else {
    const startU = (() => { for (let k = 0; k <= 400; k++) { const p = alongPath(path, k / 400); if (Math.hypot(p[0] - J[0], p[1] - J[1]) < 1) return k / 400; } return 0.3; })();
    segs.push({ d: 2.2, f: (u) => F({ boat: { path, u: startU + (1 - startU) * ease(u), fam: HOP_FAM[r.hop] }, say: `${head} · ${why}` }) });
  }
  const end = { None: "Dropped silently · next hop None is a black hole", VnetLocal: "Delivered inside the VNet", Internet: "Out to the internet", VirtualAppliance: "Inspected, then out", VirtualNetworkGateway: dest === "8.8.8.8" ? "Forced tunnelling: internet-bound traffic goes to on-premises first" : "Through the VPN gateway to on-premises" }[r.hop];
  segs.push({ d: 1.4, f: () => F({ say: `${end} · ${head}` }) });
  return segs;
}

function liveItems(fr: Fr, defHop: Hop): Item[] {
  const it: Item[] = [];
  // the lever for 0.0.0.0/0, leaning toward the chosen channel
  const lean: Record<Hop, [number, number]> = { Internet: [5, 0], VirtualAppliance: [3, -4], VirtualNetworkGateway: [3, 4], None: [0, 5], VnetLocal: [-3, 4] };
  it.push(box(C, J[0] - 0.8, 41, GZ, 1.6, 1.6, 9, "hi", { key: 0, shift: lean[defHop] }));
  it.push(box(C, J[0] - 1.4 + lean[defHop][0], 40.4 + lean[defHop][1], GZ + 9, 2.8, 2.8, 2, HOP_FAM[defHop], { key: 0.1 }));
  // lock gates (rise to open)
  for (const x of [LOCK_X - 12, LOCK_X + 11]) it.push(box(C, x, 15.5, GZ - 1 + fr.gate * 7, 1.2, 13, 6, "rose", { key: 1 }));
  if (fr.boat) {
    const p = alongPath(fr.boat.path, fr.boat.u);
    const a = headingAt(fr.boat.path, Math.min(0.99, Math.max(0.01, fr.boat.u)));
    const ca = Math.cos(a), sa = Math.sin(a);
    it.push(prism(C, rotRect(p[0], p[1], 13, 5.6, a), WZ, 2.2, fr.boat.fam, { key: 2, bevel: 0.4 }));
    it.push(prism(C, rotRect(p[0] - ca * 2, p[1] - sa * 2, 5, 4, a), WZ + 2.2, 2.6, "hi", { key: 2.1 }));
  }
  return sortItems(it);
}

export function CanalLocks() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [dest, setDest] = useState("8.8.8.8");
  const [defHop, setDefHop] = useState<Hop>("VirtualAppliance");
  const [run, setRun] = useState(0);
  const tour = useRef(0);

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const segs = useMemo(() => script(dest, defHop), [dest, defHop]);
  const fr = useScript(segs, `${run}-${dest}-${defHop}`, inView, reduced, { boat: null, gate: 0, say: "" } as Fr);

  const poke = useTour(() => {
    const seq: [string, Hop][] = [["8.8.8.8", "VirtualAppliance"], ["8.8.8.8", "Internet"], ["10.0.3.4", "VirtualAppliance"], ["192.168.10.5", "None"], ["8.8.8.8", "None"], ["8.8.8.8", "VirtualNetworkGateway"]];
    const [d, h] = seq[++tour.current % seq.length];
    setDest(d); setDefHop(h); setRun((r) => r + 1);
  }, inView && !reduced, 7, 6);

  const rs = routes(defHop);
  const best = pick(dest, rs);
  const dyn = useMemo(() => liveItems(fr, defHop), [fr, defHop]);
  const { head, rest } = splitSay(fr.say);

  return (
    <div>
      <Card
        n={25}
        title="Canal locks"
        hint="pick a destination and where 0.0.0.0/0 goes"
        readout={<><b>{head}</b>{rest.map((s, i) => <span key={i}> · {s}</span>)}</>}
        viewBox={vb}
        label="A canal map. Boats leave the snet-app harbour and reach a junction with a route-table house whose lever sets the next hop for 0.0.0.0/0. Channels lead to the internet lighthouse, through a firewall lock, into a VPN tunnel to on-premises, to a neighbouring subnet's basin, or into a dead-end pond for next hop None."
        onKeyDown={() => poke()}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={dyn} />
      </Card>
      <div className="controls">
        <div className="seg">
          {DESTS.map((d) => <button key={d.ip} className={dest === d.ip ? "on" : ""} title={d.why} onClick={() => { poke(); setDest(d.ip); setRun((r) => r + 1); }}>{d.ip}</button>)}
        </div>
        <div className="seg">
          {DEFAULT_HOP_CHOICES.map((h) => <button key={h} className={defHop === h ? "on" : ""} onClick={() => { poke(); setDefHop(h); setRun((r) => r + 1); }}>0/0 → {h}</button>)}
        </div>
      </div>
      <div className="table-wrap">
        <table className="mono" style={{ fontSize: 13 }}>
          <thead><tr><th>Effective route</th><th>Next hop type</th><th>Source</th><th></th></tr></thead>
          <tbody>
            {rs.map((r, i) => (
              <tr key={i} style={{ fontWeight: i === best ? 700 : 400 }}>
                <td>{r.prefix}/{r.len}</td>
                <td className={`c-${{ sig: "amber", rose: "rose", blue: "blue", warn: "rose", teal: "teal" }[HOP_FAM[r.hop] as string]}`}>{r.hop}</td>
                <td>{r.source}</td>
                <td style={{ color: "var(--muted)" }}>{i === best ? `← ${dest} uses this` : r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Legend items={[
        { swatch: "sig", text: "Internet" }, { swatch: "rose", text: "VirtualAppliance (firewall)" },
        { swatch: "blue", text: "VirtualNetworkGateway" }, { swatch: "warn", text: "None (drop)" }, { swatch: "teal", text: "VnetLocal" },
      ]} />
      <p className="caption">
        A route table attached to a subnet overrides the system routes for the prefixes it names. Longest-prefix match still rules: changing where 0.0.0.0/0 goes never affects traffic that a more specific route (the VNet itself, a learned on-premises prefix) already covers.
      </p>
    </div>
  );
}
