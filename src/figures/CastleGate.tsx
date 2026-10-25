import { useMemo, useRef, useState } from "react";
import {
  alongPath, box, boundsOf, camera, cyl, ease, faceText, frameAt, halo, headingAt, lerp, line3, offsetPath, pathOf, prism, proj,
  rotRect, rrect, sortItems, totalOf, type Fam, type Item, type LineItem, type Seg, type Solid, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";

const C = camera(26, 30);
const GZ = 4;
const WALL_H = 18;
const GATE_Y0 = 40, GATE_Y1 = 50, GATE_Y = 45;
const HINGE_X = 121, BRIDGE_L = 14;
const ROAD_END = 236;

type Vm = { name: string; ip: string; y0: number; y1: number; fam: Fam };
const VMS: Vm[] = [
  { name: "vm-web", ip: "10.0.1.4", y0: 16, y1: 38, fam: "blue" },
  { name: "vm-app", ip: "10.0.1.5", y0: 54, y1: 76, fam: "violet" },
];
const doorOf = (v: Vm): V3 => [58, (v.y0 + v.y1) / 2, GZ];
const routeOut = (v: Vm): V3[] => [doorOf(v), [92, (v.y0 + v.y1) / 2, GZ], [108, GATE_Y, GZ], [HINGE_X, GATE_Y, GZ], [HINGE_X + BRIDGE_L, GATE_Y, GZ], [ROAD_END - 8, GATE_Y, GZ]];

function flat(pts: V3[], fam: Fam, key: number): Solid {
  const d = pathOf(pts.map((p) => proj(C, p)), true);
  return { kind: "solid", faces: [{ d, fill: `var(--${fam}-t)` }], creases: "", outline: "", layer: 0, key };
}

/** A row of merlons along a wall top, from (x0,y0) to (x1,y1). */
function merlons(x0: number, y0: number, x1: number, y1: number, z: number, key: number): Item[] {
  const it: Item[] = [];
  const L = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(L / 6);
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n;
    const x = lerp(x0, x1, u), y = lerp(y0, y1, u);
    it.push(box(C, x - 1.6, y - 2.5, z, 3.2, 5, 3, "sand", { key: key + k * 0.001 }));
  }
  return it;
}

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-14, -16, 262, 124, 8);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, GZ - 1, "sand", { key: -100, bevel: 1 }));
  it.push(prism(C, rrect(-13, -15, 260, 122, 7.5), GZ - 1, 1, "moss", { key: -99 }));
  // moat in front of the east wall, with stone edges
  it.push(flat([[HINGE_X, -12, GZ + 0.05], [HINGE_X + BRIDGE_L, -12, GZ + 0.05], [HINGE_X + BRIDGE_L, 104, GZ + 0.05], [HINGE_X, 104, GZ + 0.05]], "sea", -98));
  it.push({ kind: "line", d: line3(C, [[HINGE_X, -12, GZ + 0.1], [HINGE_X, 104, GZ + 0.1]]) + line3(C, [[HINGE_X + BRIDGE_L, -12, GZ + 0.1], [HINGE_X + BRIDGE_L, 104, GZ + 0.1]]), tone: "hi", w: 0.8, layer: 0, key: -97.9 } as LineItem);
  let ripples = "";
  for (let y = -8; y < 102; y += 7) ripples += line3(C, [[HINGE_X + 3, y, GZ + 0.1], [HINGE_X + 5, y - 1, GZ + 0.1], [HINGE_X + 7, y, GZ + 0.1]]);
  it.push({ kind: "line", d: ripples, tone: "blue", w: 0.5, layer: 0, key: -97.8 } as LineItem);
  // courtyard paths and the road, as packed-earth strips on the grass
  const strip = (path: V3[], w: number, key: number) => it.push(flat([
    ...offsetPath(path, w).map(([x, y]): V3 => [x, y, GZ + 0.05]),
    ...offsetPath(path, -w).reverse().map(([x, y]): V3 => [x, y, GZ + 0.05]),
  ], "sand", key));
  VMS.forEach((v, i) => strip(routeOut(v).slice(0, 4), 3, -97 + i * 0.01));
  strip([[HINGE_X + BRIDGE_L, GATE_Y, GZ], [ROAD_END, GATE_Y, GZ]], 4, -96.9);
  // back and left walls at full height with merlons
  it.push(box(C, 0, 0, GZ, 120, 5, WALL_H, "hi", { key: -60, bevel: 0.4 }));
  it.push(...merlons(0, 2.5, 120, 2.5, GZ + WALL_H, -59.9));
  it.push(box(C, 0, 5, GZ, 5, 85, WALL_H, "hi", { key: -59, bevel: 0.4 }));
  it.push(...merlons(2.5, 5, 2.5, 90, GZ + WALL_H, -58.9));
  // inside: the two VMs as keeps with coloured roofs
  VMS.forEach((v, i) => {
    it.push(box(C, 30, v.y0, GZ, 28, v.y1 - v.y0, 14, "hi", { key: -30 + i, bevel: 0.4 }));
    it.push(box(C, 29, v.y0 - 1, GZ + 14, 30, v.y1 - v.y0 + 2, 1.6, v.fam, { key: -29.9 + i, bevel: 0.3 }));
    it.push(faceText(C, v.name, [44, (v.y0 + v.y1) / 2 - 2, GZ + 15.6], "top", 2.8, "ink", { key: -29.8 + i, weight: 700 }));
    it.push(faceText(C, v.ip, [44, (v.y0 + v.y1) / 2 + 2.5, GZ + 15.6], "top", 2.3, "ink", { key: -29.8 + i }));
    it.push(box(C, 57.6, (v.y0 + v.y1) / 2 - 3, GZ, 0.4, 6, 7, "lo", { key: -29.7 + i }));
  });
  // east wall split by the gate, two towers with stepped tops, gatehouse lintel
  it.push(box(C, 115, 5, GZ, 5, GATE_Y0 - 12, WALL_H, "hi", { key: -20, bevel: 0.4 }));
  // the wall and tower south of the gate stand nearer the viewer than the gateway, so they paint after carts
  it.push(box(C, 115, GATE_Y1 + 7, GZ, 5, 90 - GATE_Y1 - 7, WALL_H, "hi", { key: 21, bevel: 0.4 }));
  it.push(...merlons(117.5, 6, 117.5, GATE_Y0 - 8, GZ + WALL_H, -18.9));
  it.push(...merlons(117.5, GATE_Y1 + 8, 117.5, 89, GZ + WALL_H, 21.1));
  for (const y of [GATE_Y0 - 6, GATE_Y1 + 6]) {
    const k = y > GATE_Y ? 22 : -10;
    it.push(cyl(C, 118, y, GZ, 7, 26, "hi", { key: k, n: 28 }));
    it.push(cyl(C, 118, y, GZ + 26, 8, 2, "sand", { key: k + 0.1, n: 28 }));
    it.push(cyl(C, 118, y, GZ + 28, 5, 3, "warn", { key: k + 0.2, n: 20 }));
    it.push(cyl(C, 118, y, GZ + 31, 2.6, 2.4, "warn", { key: k + 0.3, n: 14 }));
  }
  it.push(box(C, 115, GATE_Y0 - 1, GZ + 13, 7, GATE_Y1 - GATE_Y0 + 2, 9, "hi", { key: -8, bevel: 0.4 }));
  it.push(box(C, 122, GATE_Y0 + 1, GZ + 15, 0.4, GATE_Y1 - GATE_Y0 - 2, 4, "sig", { key: -7.9 }));
  it.push(faceText(C, "NSG", [122.4, GATE_Y, GZ + 17], "+x", 2.4, "ink", { key: -7.8, weight: 700 }));
  // front wall, cut away to show the inside: a low section with hatching on the cut
  it.push(box(C, 0, 85, GZ, 120, 5, 4, "hi", { key: 20 }));
  let hatch = "";
  for (let x = 1; x < 119; x += 2.4) hatch += line3(C, [[x, 85.4, GZ + 4], [x + 1.6, 89.6, GZ + 4]]);
  it.push({ kind: "line", d: hatch, tone: "mid", w: 0.4, layer: 0, key: 20.1 } as LineItem);
  it.push(faceText(C, "VNET 10.0.1.0/24 (inside)", [4, 90, GZ + 2], "+y", 2.2, "ink", { anchor: "start", key: 20.2, weight: 700 }));
  // NSG rule board on two posts beside the road
  const bx = 150, by = 14;
  for (const x of [bx, bx + 40]) it.push(box(C, x, by, GZ, 1.4, 1.4, 16, "hi", { key: 30 }));
  it.push(box(C, bx - 1, by + 1.4, GZ + 5, 43.4, 0.8, 12, "lo", { key: 30.1, bevel: 0.3 }));
  ["INBOUND  443 → vm-web   ALLOW", "INBOUND  22  → any      DENY", "OUTBOUND any → internet ALLOW"].forEach((t, k) => {
    it.push(faceText(C, t, [bx + 1, by + 2.2, GZ + 14.4 - k * 3.4], "+y", 1.9, k === 1 ? "warn" : k === 0 ? "sig" : "teal", { anchor: "start", key: 30.2, weight: 600 }));
  });
  // the internet at the end of the road
  it.push(box(C, ROAD_END - 8, GATE_Y - 9, GZ, 16, 18, 10, "mid", { key: 40, bevel: 0.5 }));
  it.push(box(C, ROAD_END - 9, GATE_Y - 10, GZ + 10, 18, 20, 1.4, "sig", { key: 40.1 }));
  it.push(faceText(C, "INTERNET", [ROAD_END, GATE_Y, GZ + 11.4], "top", 2.6, "ink", { key: 40.2, weight: 700 }));
  return sortItems(it);
}

// ---------- script ----------

type Cart = { path: V3[]; u: number; fam: Fam; label: string; alpha: number };
type Fr = { cart: Cart | null; bridge: number; say: string };
type Scene = "out" | "in443" | "in22";

function script(sc: Scene): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  const F = (p: Partial<Fr>): Fr => ({ cart: null, bridge: 90, say: "", ...p });
  /** First fraction along the path where test(x) holds (sampled). */
  const firstU = (path: V3[], test: (x: number) => boolean) => {
    for (let k = 0; k <= 400; k++) if (test(alongPath(path, k / 400)[0])) return k / 400;
    return 1;
  };
  const travel = (path: V3[], fam: Fam, label: string, say: string, d: number, from = 0, to = 1, bridge = 0) =>
    segs.push({ d, f: (u) => F({ cart: { path, u: lerp(from, to, ease(u)), fam, label, alpha: 1 }, bridge, say }) });
  const lower = (cart: Cart | null, say: string, down: boolean) =>
    segs.push({ d: 0.8, f: (u) => F({ cart, bridge: down ? lerp(90, 0, ease(u)) : lerp(0, 90, ease(u)), say }) });

  if (sc === "out") {
    const p = routeOut(VMS[1]);
    const g = firstU(p, (x) => x >= HINGE_X - 7); // waits just inside the gate
    travel(p, "teal", "SYN", "vm-app opens a connection to the internet · OUTBOUND: it started inside", 1.4, 0, g, 90);
    lower({ path: p, u: g, fam: "teal", label: "SYN", alpha: 1 }, "Outbound rule allows it · the bridge comes down", true);
    travel(p, "teal", "SYN", "Out through the gate", 1.4, g, 1);
    segs.push({ d: 0.5, f: () => F({ cart: null, bridge: 0, say: "The server answers" }) });
    const back = [...p].reverse();
    travel(back, "teal", "REPLY", "The reply comes IN through the gate · but it belongs to the same outbound flow", 2.6, 0, 1);
    lower(null, "No inbound rule was needed: the gate remembers the flow vm-app started", false);
    segs.push({ d: 1.2, f: () => F({ say: "No inbound rule was needed: the gate remembers the flow vm-app started" }) });
  } else {
    const allowed = sc === "in443";
    const v = allowed ? VMS[0] : VMS[1];
    const p = [...routeOut(v)].reverse();
    const stop = firstU(p, (x) => x <= HINGE_X + BRIDGE_L + 5); // waits on the far bank
    travel(p, "sig", allowed ? ":443" : ":22", `A visitor from the internet asks for ${v.name}${allowed ? " on 443" : " on 22"} · INBOUND: it started outside`, 1.6, 0, stop, 90);
    if (!allowed) {
      segs.push({ d: 1, f: () => F({ cart: { path: p, u: stop, fam: "warn", label: ":22", alpha: 1 }, bridge: 90, say: "INBOUND 22 → DENY · the bridge stays up" }) });
      segs.push({ d: 1.3, f: (u) => F({ cart: { path: p, u: lerp(stop, 0, ease(u)), fam: "warn", label: ":22", alpha: 1 - u * 0.6 }, bridge: 90, say: "Turned away at the moat · inbound needs an explicit allow rule" }) });
      segs.push({ d: 1.2, f: () => F({ say: "Turned away at the moat · inbound needs an explicit allow rule" }) });
      return segs;
    }
    lower({ path: p, u: stop, fam: "sig", label: ":443", alpha: 1 }, "INBOUND 443 → vm-web: ALLOW · the bridge comes down", true);
    travel(p, "sig", ":443", "Into the courtyard to vm-web", 1.6, stop, 1);
    segs.push({ d: 0.5, f: () => F({ bridge: 0, say: "vm-web answers" }) });
    travel([...p].reverse(), "sig", "REPLY", "The reply goes OUT · part of the same inbound flow, so no outbound rule is consulted", 2.6, 0, 1);
    lower(null, "Direction belongs to the flow, set by whoever sent the first packet", false);
    segs.push({ d: 1.2, f: () => F({ say: "Direction belongs to the flow, set by whoever sent the first packet" }) });
  }
  return segs;
}

// ---------- live parts ----------

function bridgeItems(deg: number): Item[] {
  const it: Item[] = [];
  const a = (deg * Math.PI) / 180;
  if (deg < 3) {
    it.push(box(C, HINGE_X, GATE_Y0, GZ, BRIDGE_L, GATE_Y1 - GATE_Y0, 1.2, "sand", { key: 0 }));
    let planks = "";
    for (let x = HINGE_X + 2; x < HINGE_X + BRIDGE_L; x += 2) planks += line3(C, [[x, GATE_Y0, GZ + 1.2], [x, GATE_Y1, GZ + 1.2]]);
    it.push({ kind: "line", d: planks, tone: "lo", w: 0.4, layer: 0, key: 0.1 } as LineItem);
  } else {
    it.push(box(C, HINGE_X, GATE_Y0, GZ, 1.2, GATE_Y1 - GATE_Y0, BRIDGE_L * Math.sin(a), "sand", { key: 0, shift: [BRIDGE_L * Math.cos(a), 0] }));
  }
  // chains from the gatehouse to the free end
  const ex = HINGE_X + BRIDGE_L * Math.cos(a), ez = GZ + BRIDGE_L * Math.sin(a) + 1;
  for (const y of [GATE_Y0 + 1, GATE_Y1 - 1]) it.push({ kind: "line", d: line3(C, [[122, y, GZ + 20], [ex, y, ez]]), tone: "mid", w: 0.5, layer: 0, key: 1 } as LineItem);
  return it;
}

function cartItems(c: Cart | null): Item[] {
  if (!c) return [];
  const p = alongPath(c.path, c.u);
  const a = headingAt(c.path, c.u);
  const onBridge = p[0] > HINGE_X && p[0] < HINGE_X + BRIDGE_L;
  const z = p[2] + (onBridge ? 1.2 : 0);
  return sortItems([
    prism(C, rotRect(p[0], p[1], 9, 6, a), z, 3, "hi", { key: 0, bevel: 0.3 }),
    box(C, p[0] - 0.4, p[1] - 0.4, z + 3, 0.8, 0.8, 7, "mid", { key: 1 }),
    box(C, p[0] + 0.4, p[1] - 0.3, z + 6.5, 6, 0.6, 3.4, c.fam, { key: 2 }),
    faceText(C, c.label, [p[0] + 3.4, p[1] + 0.3, z + 8.2], "+y", 1.6, "ink", { key: 3, weight: 700 }),
  ]);
}

export function CastleGate() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [scene, setScene] = useState<Scene>("out");
  const [run, setRun] = useState(0);
  const [fr, setFr] = useState<Fr>({ cart: null, bridge: 90, say: "" });
  const live = useRef({ t: 0, run: -1, done: false, tour: 0 });

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 8); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const segs = useMemo(() => script(scene), [scene, run]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (s: Scene) => { setScene(s); setRun((r) => r + 1); };
  const poke = useTour(() => { const seq: Scene[] = ["out", "in443", "in22"]; go(seq[++live.current.tour % 3]); }, inView && !reduced, totalOf(segs) + 1, 6);

  useLoop((_t, dt) => {
    const L = live.current;
    if (L.run !== run) { L.run = run; L.t = 0; L.done = false; }
    if (L.done) return;
    const T = totalOf(segs);
    L.t = reduced ? T : Math.min(T, L.t + dt);
    setFr(frameAt(segs, L.t).fr);
    if (L.t >= T) L.done = true;
  }, inView);

  const dyn = useMemo(() => ({ bridge: bridgeItems(fr.bridge), cart: cartItems(fr.cart) }), [fr]);
  const onKey = (e: React.KeyboardEvent) => {
    poke();
    if (e.key === "1") go("out");
    if (e.key === "2") go("in443");
    if (e.key === "3") go("in22");
  };

  return (
    <div>
      <Card
        n={14}
        title="Castle gate"
        hint="1 outbound · 2 inbound 443 · 3 inbound 22"
        readout={<>{fr.say.split(" · ").map((s, i) => (i === 0 ? <b key={i}>{s}</b> : <span key={i}> · {s}</span>))}</>}
        viewBox={vb}
        label="A walled castle stands for a VNet, with two VMs inside, a moat and a drawbridge at the east gate, an NSG rule board outside and the internet at the end of the road. Carts leaving from inside are outbound flows whose replies come back in; visitors from outside are inbound flows that need an allow rule."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <g style={{ isolation: "isolate" }}>
          <Items items={stat.filter((i) => i.key < 20)} />
          <Items items={dyn.bridge} />
          <g opacity={fr.cart?.alpha ?? 1}><Items items={dyn.cart} /></g>
          <Items items={stat.filter((i) => i.key >= 20)} />
        </g>
      </Card>
      <div className="controls">
        <div className="seg">
          <button className={scene === "out" ? "on" : ""} onClick={() => { poke(); go("out"); }}><span className="c-teal">●</span> vm-app → internet</button>
          <button className={scene === "in443" ? "on" : ""} onClick={() => { poke(); go("in443"); }}><span className="c-amber">●</span> internet → vm-web :443</button>
          <button className={scene === "in22" ? "on" : ""} onClick={() => { poke(); go("in22"); }}><span className="c-rose">●</span> internet → :22</button>
        </div>
      </div>
      <Legend items={[
        { swatch: "teal", text: "Outbound flow (started inside)" },
        { swatch: "sig", text: "Inbound flow (started outside)" },
        { swatch: "warn", text: "Denied" },
        { swatch: "sea", text: "Moat: the VNet boundary" },
      ]} />
      <p className="caption">
        Both kinds of flow cross the gate in both directions. What makes a flow inbound or outbound is only who sent the first packet. Rules are written for that first packet; the replies ride on the decision already made.
      </p>
    </div>
  );
}
