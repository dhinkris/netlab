import { useMemo, useRef, useState } from "react";
import {
  alongPath, box, boundsOf, camera, cyl, dotsItem, faceText, halo, line3, prism, rrect, sortItems,
  type Fam, type Item, type LineItem, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";

const C = camera(22, 26);
const SOIL = 22; // ground surface height
const D = 70; // plinth depth (front face at y = D)
const PIPE_Z = 10;
type House = { id: string; tenant: string; space: string; tap: string; x: number; fam: Fam };
const HOUSES: House[] = [
  { id: "a", tenant: "Tenant A", space: "VNet 10.0.0.0/16", tap: "PE 10.0.1.9", x: 30, fam: "blue" },
  { id: "b", tenant: "Tenant B", space: "VNet 10.0.0.0/16", tap: "PE 10.0.1.9", x: 84, fam: "violet" },
  { id: "c", tenant: "Tenant C", space: "VNet 172.16.0.0/16", tap: "PE 172.16.2.4", x: 138, fam: "rose" },
];
const TOWER_X = 200;
const pipeTo = (h: House): V3[] => [[TOWER_X, D, SOIL - 2], [TOWER_X, D, PIPE_Z], [h.x, D, PIPE_Z], [h.x, D, SOIL - 2]];

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-6, -6, 232, D + 6, 2);
  it.push(halo(C, plan, 6));
  // soil block with strata on the cut face, grass on top
  it.push(prism(C, plan, 0, SOIL - 1, "sand", { key: -100 }));
  it.push(prism(C, rrect(-6, -6, 232, D + 6, 2), SOIL - 1, 1, "moss", { key: -99 }));
  let strata = "";
  for (const z of [4, 8.5, 14, 18]) { const pts: V3[] = []; for (let x = -6; x <= 226; x += 6) pts.push([x, D, z + Math.sin(x / 13 + z) * 0.8]); strata += line3(C, pts); }
  it.push({ kind: "line", d: strata, tone: "lo", w: 0.5, layer: 0, key: -98 } as LineItem);
  it.push(faceText(C, "underground: Private Link (Microsoft backbone, never the internet)", [-2, D, 2], "+y", 1.9, "ink", { anchor: "start", key: -97, weight: 700 }));
  // pipes drawn in the cut face: main run + risers
  const main: V3[] = [[TOWER_X, D, SOIL - 1], [TOWER_X, D, PIPE_Z], [HOUSES[0].x, D, PIPE_Z]];
  it.push({ kind: "line", d: line3(C, main), tone: "lo", w: 4, layer: 0, key: -96 } as LineItem);
  it.push({ kind: "line", d: line3(C, main), tone: "sea", w: 2.6, layer: 0, key: -95.9 } as LineItem);
  HOUSES.forEach((h) => {
    const riser: V3[] = [[h.x, D, PIPE_Z], [h.x, D, SOIL - 1]];
    it.push({ kind: "line", d: line3(C, riser), tone: "lo", w: 4, layer: 0, key: -95.8 } as LineItem);
    it.push({ kind: "line", d: line3(C, riser), tone: "sea", w: 2.6, layer: 0, key: -95.7 } as LineItem);
  });
  // houses
  HOUSES.forEach((h, i) => {
    const k = i * 0.1;
    it.push(box(C, h.x - 14, D - 26, SOIL, 28, 22, 18, "hi", { key: k, bevel: 0.4 }));
    it.push(box(C, h.x - 15, D - 27, SOIL + 18, 30, 24, 2, h.fam, { key: k + 0.01, bevel: 0.4 }));
    it.push(box(C, h.x - 9, D - 27, SOIL + 20, 18, 24, 3, h.fam, { key: k + 0.02, bevel: 0.4 }));
    it.push(faceText(C, h.tenant, [h.x, D - 4, SOIL + 13], "+y", 2.4, "ink", { key: k + 0.03, weight: 700 }));
    it.push(faceText(C, h.space, [h.x, D - 4, SOIL + 10], "+y", 1.8, "ink", { key: k + 0.03 }));
    // the tap (private endpoint) by the front door
    it.push(box(C, h.x - 3, D - 4, SOIL + 2, 6, 2, 5, "teal", { key: k + 0.04, bevel: 0.3 }));
    it.push(box(C, h.x - 1, D - 2, SOIL + 4.5, 2, 4, 1.4, "teal", { key: k + 0.05 }));
    it.push(faceText(C, h.tap, [h.x + 10, D - 3.8, SOIL + 4], "+y", 1.6, "ink", { key: k + 0.06, weight: 700 }));
  });
  // provider: water tower on legs, valve house = Private Link service
  for (const [dx, dy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) it.push(box(C, TOWER_X + dx - 1, 34 + dy - 1, SOIL, 2, 2, 34, "mid", { key: 5 + dy * 0.01 }));
  it.push(cyl(C, TOWER_X, 34, SOIL + 34, 14, 14, "teal", { key: 6, n: 30, bevel: 0.6 }));
  it.push(cyl(C, TOWER_X, 34, SOIL + 48, 9, 3, "hi", { key: 6.1, n: 24 }));
  it.push(faceText(C, "PROVIDER SERVICE", [TOWER_X, 48, SOIL + 43], "+y", 2.4, "ink", { key: 6.2, weight: 700 }));
  it.push(faceText(C, "behind a Standard LB", [TOWER_X, 48, SOIL + 39.5], "+y", 1.8, "ink", { key: 6.2 }));
  it.push(box(C, TOWER_X - 10, D - 18, SOIL, 20, 14, 10, "sand", { key: 7, bevel: 0.4 }));
  it.push(box(C, TOWER_X - 11, D - 19, SOIL + 10, 22, 16, 1.4, "sig", { key: 7.1 }));
  it.push(faceText(C, "PRIVATE LINK SERVICE", [TOWER_X, D - 4, SOIL + 6.6], "+y", 1.6, "ink", { key: 7.2, weight: 700 }));
  it.push(faceText(C, "pls-orders · NAT 10.9.0.x", [TOWER_X, D - 4, SOIL + 3.6], "+y", 1.5, "ink", { key: 7.2 }));
  return sortItems(it);
}

type State = "approved" | "pending";

export function WaterTower() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [active, setActive] = useState(0);
  const [approval, setApproval] = useState<Record<string, State>>({ a: "approved", b: "approved", c: "pending" });
  const S = useRef({ t: 0, tour: 0 });
  const [, setTick] = useState(0);

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const poke = useTour(() => {
    const step = ++S.current.tour % 5;
    if (step === 0) { setApproval({ a: "approved", b: "approved", c: "pending" }); setActive(0); }
    else if (step === 1) setActive(1);
    else if (step === 2) setActive(2);
    else if (step === 3) setApproval((a) => ({ ...a, c: "approved" }));
    else setActive(0);
  }, inView && !reduced, 4.5, 6);
  useLoop((_t, dt) => { S.current.t += reduced ? 0 : dt; setTick((k) => (k + 1) % 1e6); }, inView);

  const h = HOUSES[active];
  const flowing = approval[h.id] === "approved";
  const dyn: Item[] = [];
  // valves at each riser: green approved, red pending
  HOUSES.forEach((hh, i) => {
    const ok = approval[hh.id] === "approved";
    dyn.push(cyl(C, hh.x, D - 2, PIPE_Z + 4, 2.6, 0.01, ok ? "ok" : "warn", { key: 20 + i, n: 14 }));
    dyn.push({ kind: "line", d: line3(C, ok ? [[hh.x, D, PIPE_Z + 1.5], [hh.x, D, PIPE_Z + 6.5]] : [[hh.x - 2.5, D, PIPE_Z + 4], [hh.x + 2.5, D, PIPE_Z + 4]]), tone: "lit", w: 1.2, layer: 0, key: 20.1 + i } as LineItem);
    // a beacon on the roof marks the tenant that's asking
    if (i === active) {
      dyn.push(cyl(C, hh.x, D - 15, SOIL + 23, 1, 6, "hi", { key: 20.5 + i, n: 10 }));
      dyn.push(cyl(C, hh.x, D - 15, SOIL + 29, 2.6, 2.6, ok ? "sig" : "warn", { key: 20.6 + i, n: 14, bevel: 0.3 }));
    }
  });
  if (flowing) {
    const path = pipeTo(h);
    const drops: V3[] = [];
    for (let k = 0; k < 10; k++) drops.push(alongPath(path, (S.current.t * 0.35 + k / 10) % 1));
    dyn.push({ ...dotsItem(C, drops, 1.3, "lit", 0), key: 30 });
    // water from the tap
    const tz = SOIL + 4.5 - ((S.current.t * 6) % 4);
    dyn.push({ ...dotsItem(C, [[h.x, D + 1.6, tz]], 0.9, "sea", 0), key: 31 });
  }

  const say = !flowing
    ? <><b className="c-rose">{h.tenant}'s connection is pending</b> · the provider must approve it before any traffic flows</>
    : <><b>{h.tenant} → provider</b> · through its own private endpoint ({h.tap}) · provider sees source 10.9.0.x (NAT), not {h.space.split(" ")[1]}</>;

  return (
    <div>
      <Card
        n={34}
        title="Water tower"
        hint="pick a tenant · approve pending connections"
        readout={say}
        viewBox={vb}
        label="A provider's water tower stands for a service published with Private Link. Three customer houses each have their own tap (private endpoint) fed by pipes running underground, shown in a cut-away soil section. Tenants A and B use the same address space without conflict. Tenant C's valve stays closed until the provider approves the connection."
        onKeyDown={() => poke()}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={sortItems(dyn)} />
      </Card>
      <div className="controls">
        <div className="seg">
          {HOUSES.map((x, i) => <button key={x.id} className={active === i ? "on" : ""} onClick={() => { poke(); setActive(i); }}>{x.tenant}</button>)}
        </div>
        <button className="pill-btn" disabled={approval.c === "approved"} onClick={() => { poke(); setApproval((a) => ({ ...a, c: "approved" })); setActive(2); }}>Approve Tenant C</button>
        <button className="pill-btn" onClick={() => { poke(); setApproval({ a: "approved", b: "approved", c: "pending" }); }}>Reset</button>
      </div>
      <Legend items={[
        { swatch: "teal", text: "Private endpoint (tap) in the consumer's VNet" },
        { swatch: "sig", text: "Private Link service (provider side)" },
        { swatch: "ok", text: "Approved connection" },
        { swatch: "warn", text: "Pending approval" },
      ]} />
      <p className="caption">
        Each consumer gets a private IP from its own address space, so overlaps between customers don't matter, and nobody's VNets are peered. The provider's service sees the traffic arriving from its own Private Link NAT addresses, and approves each connection.
      </p>
    </div>
  );
}
