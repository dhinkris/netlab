import { useMemo, useRef, useState } from "react";
import {
  alongPath, box, boundsOf, camera, ease, faceText, frameAt, line3, prism, rrect, screws, sortItems, totalOf, tube,
  type Fam, type Item, type LineItem, type Seg, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { DEVICES, VLANS, TAG_BYTES } from "../models/vlan";

const C = camera(10, 16);
const VFAM: Record<number, Fam> = { 10: "blue", 20: "rose", 30: "teal" };
const FRONT = 14; // switch front face (y)
const CY = 17; // cable plane in front of the wall
const SW = [{ x0: 14 }, { x0: 132 }];
const SW_W = 92, SW_Z = 70, SW_H = 9;
const PORT_PITCH = 10;
const portX = (sw: number, p: number) => SW[sw].x0 + 8 + (p - 1) * PORT_PITCH; // p = 1..8
const PORT_Z = SW_Z + 2.6;
const SHELF_Z = 22;
const DEV_TOP = SHELF_Z + 12;
const ROUTER = { x0: 46, z: 100, w: 46 };
const TRUNK_A = portX(0, 8), TRUNK_B = portX(1, 1);
const STICK = portX(0, 7);

const devX = (d: number) => portX(DEVICES[d].sw, DEVICES[d].port);
const drop = (d: number): V3[] => [[devX(d) + 2, CY, PORT_Z], [devX(d) + 2, CY, DEV_TOP]];
const TRUNK: V3[] = (() => {
  const pts: V3[] = [];
  for (let k = 0; k <= 30; k++) {
    const u = k / 30;
    pts.push([TRUNK_A + 2 + (TRUNK_B - TRUNK_A) * u, CY + 1, PORT_Z - 16 * Math.sin(Math.PI * u)]);
  }
  return pts;
})();
const STICK_PATH: V3[] = [[STICK + 2, CY, PORT_Z + 4], [STICK + 2, CY, ROUTER.z]];

function staticItems(): Item[] {
  const it: Item[] = [];
  // wall with panel seams, and a skirting floor strip
  it.push(box(C, -6, -6, 0, 246, 6, 124, "sand", { key: -100 }));
  let seams = "";
  for (let z = 12; z < 124; z += 14) seams += line3(C, [[-6, 0, z], [240, 0, z]]);
  for (let x = 24; x < 240; x += 40) for (let z = 0; z < 124; z += 28) {
    const xs = x + (z % 56 ? 20 : 0);
    if (xs < 238) seams += line3(C, [[xs, 0, z], [xs, 0, Math.min(124, z + 14)]]);
  }
  it.push({ kind: "line", d: seams, tone: "faint", w: 0.5, layer: 0, key: -99 } as LineItem);
  it.push(prism(C, rrect(-6, 0, 246, 30, 2), 0, 3, "lo", { key: -98 }));
  // shelf on brackets
  it.push(box(C, 4, 0, SHELF_Z - 2, 228, 26, 2, "mid", { key: -50, bevel: 0.5 }));
  for (const x of [20, 116, 214]) it.push(box(C, x, 0, SHELF_Z - 12, 2.4, 14, 10, "hi", { key: -51, shift: [0, 0] }));
  // two switches on wall brackets, with port groups
  SW.forEach((s, i) => {
    it.push(box(C, s.x0 - 3, 0, SW_Z - 3, 4, FRONT + 2, 3, "hi", { key: -40 + i }));
    it.push(box(C, s.x0 + SW_W - 1, 0, SW_Z - 3, 4, FRONT + 2, 3, "hi", { key: -40 + i }));
    it.push(box(C, s.x0, 0, SW_Z, SW_W, FRONT, SW_H, "mid", { key: -30 + i, bevel: 0.6 }));
    it.push(screws(C, s.x0, 0, SW_W, FRONT, SW_Z + SW_H, 2));
    it.push(faceText(C, `SWITCH ${i + 1}`, [s.x0 + SW_W / 2, FRONT / 2, SW_Z + SW_H], "top", 2.6, "hi", { key: -29 + i, weight: 700 }));
    for (let p = 1; p <= 8; p++) {
      const dev = DEVICES.find((d) => d.sw === i && d.port === p);
      const trunk = (i === 0 && (p === 7 || p === 8)) || (i === 1 && p === 1);
      const fam: Fam = trunk ? "sig" : dev ? VFAM[dev.vlan] : "lo";
      it.push(box(C, portX(i, p) - 0.6, FRONT, SW_Z + 1.2, 5.2, 0.4, 5.4, fam, { key: -28 + i }));
      it.push(box(C, portX(i, p), FRONT + 0.4, SW_Z + 1.8, 4, 0.3, 3.6, "lo", { key: -27.9 + i }));
      it.push(faceText(C, trunk ? "T" : dev ? String(dev.vlan) : String(p), [portX(i, p) + 2, FRONT + 0.4, SW_Z + 8], "+y", 1.6, trunk ? "sig" : dev ? VFAM[dev.vlan] : "mid", { key: -27.8 + i, weight: 700 }));
    }
  });
  // router on a stick above switch 1
  it.push(box(C, ROUTER.x0 - 3, 0, ROUTER.z - 3, ROUTER.w + 6, FRONT, 3, "hi", { key: -20 }));
  it.push(box(C, ROUTER.x0, 0, ROUTER.z, ROUTER.w, FRONT - 2, 10, "lo", { key: -19, bevel: 0.6 }));
  it.push(box(C, ROUTER.x0 + 3, FRONT - 2, ROUTER.z + 2.5, 20, 0.4, 5, "sig", { key: -18.9 }));
  it.push(faceText(C, "ROUTER", [ROUTER.x0 + 13, FRONT - 1.6, ROUTER.z + 5], "+y", 2.4, "ink", { key: -18.8, weight: 700 }));
  it.push(faceText(C, ".1 on each VLAN", [ROUTER.x0 + 35, FRONT - 2, ROUTER.z + 5], "+y", 1.8, "mid", { key: -18.8 }));
  // cables: device drops coloured by VLAN, trunk and stick in amber
  DEVICES.forEach((d, k) => it.push(...tube(C, drop(k), VFAM[d.vlan], -10 + k * 0.01, 2.4)));
  it.push(...tube(C, TRUNK, "sig", -9, 3.2));
  it.push(...tube(C, STICK_PATH, "sig", -9, 3.2));
  // devices on the shelf
  DEVICES.forEach((d, k) => {
    const x = devX(k) + 2;
    const fam = VFAM[d.vlan];
    it.push(box(C, x - 4.3, 4, SHELF_Z, 8.6, 10, 12, "hi", { key: k, bevel: 0.4 }));
    it.push(box(C, x - 3.6, 14, SHELF_Z + 4, 7.2, 0.4, 6, fam, { key: k + 0.1 }));
    it.push(faceText(C, d.name, [x, 14.4, SHELF_Z + 7.4], "+y", 1.45, "ink", { key: k + 0.2, weight: 700 }));
    it.push(faceText(C, `VLAN ${d.vlan}`, [x, 14, SHELF_Z + 2], "+y", 1.5, fam, { key: k + 0.2, weight: 700 }));
  });
  return sortItems(it);
}

// ---------- script ----------

type Cap = { path: V3[]; u: number; vlan: number; tagged: boolean };
type Fr = { caps: Cap[]; blink: number[]; say: string };
type Scene = "b10" | "b20" | "route";

function script(sc: Scene): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  const up = (d: number) => [...drop(d)].reverse();
  const F = (caps: Cap[], say: string, blink: number[] = []): Fr => ({ caps, blink, say });
  const run = (d: number, legs: { path: V3[]; vlan: number; tagged: boolean }[], say: string, blink: number[] = []) =>
    segs.push({ d, f: (u) => F(legs.map((l) => ({ ...l, u: ease(u) })), say, blink) });
  const pause = (d: number, say: string, blink: number[]) => segs.push({ d, f: () => F([], say, blink) });
  if (sc === "b10") {
    run(1.1, [{ path: up(0), vlan: 10, tagged: false }], "pc-1 sends a broadcast · untagged on an access port");
    pause(0.5, "Switch 1 floods it to VLAN 10 ports only · phone-1 (VLAN 20) never sees it", [0]);
    run(1.4, [{ path: drop(2), vlan: 10, tagged: false }, { path: TRUNK, vlan: 10, tagged: true }], "Out the access port untagged · out the trunk with an 802.1Q tag: VLAN 10", [0]);
    pause(0.4, "Switch 2 reads the tag · VLAN 10", [1]);
    run(1.1, [{ path: drop(3), vlan: 10, tagged: false }], "Tag removed · delivered to pc-3, the only VLAN 10 port on switch 2", [1]);
  } else if (sc === "b20") {
    run(1.1, [{ path: up(4), vlan: 20, tagged: false }], "phone-2 sends a broadcast in VLAN 20");
    pause(0.5, "Switch 2 floods VLAN 20 only · guest (VLAN 30) and pc-3 (VLAN 10) stay quiet", [1]);
    run(1.4, [{ path: [...TRUNK].reverse(), vlan: 20, tagged: true }], "Across the trunk tagged VLAN 20", [1]);
    pause(0.4, "Switch 1 reads the tag · VLAN 20", [0]);
    run(1.1, [{ path: drop(1), vlan: 20, tagged: false }], "Delivered to phone-1 untagged", [0]);
  } else {
    run(1.1, [{ path: up(0), vlan: 10, tagged: false }], "pc-1 (VLAN 10) sends to phone-1 (VLAN 20) · different VLAN = different subnet, so it goes to its gateway");
    pause(0.4, "Switches never forward between VLANs · up the trunk to the router", [0]);
    run(1.1, [{ path: STICK_PATH, vlan: 10, tagged: true }], "Up the stick tagged VLAN 10", [0]);
    pause(0.6, "Router routes 10.10.0.0/24 → 10.20.0.0/24 · re-tags it", []);
    run(1.1, [{ path: [...STICK_PATH].reverse(), vlan: 20, tagged: true }], "Back down tagged VLAN 20", [0]);
    run(1.1, [{ path: drop(1), vlan: 20, tagged: false }], "Delivered to phone-1 · inter-VLAN traffic always passes a router (or firewall)", [0]);
  }
  segs.push({ d: 1.4, f: () => F([], segs.length ? segs[segs.length - 1].f(1).say : "") });
  return segs;
}

function capItems(c: Cap): Item[] {
  const [x, y, z] = alongPath(c.path, c.u);
  const it: Item[] = [box(C, x - 2.6, y - 2.4, z - 2, 5.2, 4.8, 4, VFAM[c.vlan], { key: 0, bevel: 0.4 })];
  if (c.tagged) {
    it.push(box(C, x - 3.2, y - 3, z - 0.6, 6.4, 6, 1.2, "sig", { key: 1 }));
    it.push(faceText(C, String(c.vlan), [x, y + 3, z - 4.2], "+y", 2.2, "sig", { key: 2, weight: 700 }));
  }
  return it;
}

function blinkItems(sws: number[]): Item[] {
  return sws.flatMap((i) => [box(C, SW[i].x0 + SW_W - 9, FRONT, SW_Z + 6.2, 6, 0.6, 1.4, "ok", { key: 0 })]);
}

export function VlanWall() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [scene, setScene] = useState<Scene>("b10");
  const [run, setRun] = useState(0);
  const [fr, setFr] = useState<Fr>({ caps: [], blink: [], say: "" });
  const live = useRef({ t: 0, run: -1, done: false, tour: 0 });

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const segs = useMemo(() => script(scene), [scene, run]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (s: Scene) => { setScene(s); setRun((r) => r + 1); };
  const poke = useTour(() => { const seq: Scene[] = ["b10", "b20", "route"]; go(seq[++live.current.tour % 3]); }, inView && !reduced, totalOf(segs) + 1, 6);

  useLoop((_t, dt) => {
    const L = live.current;
    if (L.run !== run) { L.run = run; L.t = 0; L.done = false; }
    if (L.done) return;
    const T = totalOf(segs);
    L.t = reduced ? T : Math.min(T, L.t + dt);
    setFr(frameAt(segs, L.t).fr);
    if (L.t >= T) L.done = true;
  }, inView);

  const dyn = useMemo(() => ({ caps: fr.caps.flatMap(capItems), blink: blinkItems(fr.blink) }), [fr]);
  const onKey = (e: React.KeyboardEvent) => {
    poke();
    if (e.key === "1") go("b10");
    if (e.key === "2") go("b20");
    if (e.key === "3") go("route");
  };

  return (
    <div>
      <Card
        n={13}
        title="Wall rack"
        hint="1 VLAN 10 broadcast · 2 VLAN 20 broadcast · 3 inter-VLAN"
        readout={<>{fr.say.split(" · ").map((s, i) => (i === 0 ? <b key={i}>{s}</b> : <span key={i}> · {s}</span>))}</>}
        viewBox={vb}
        label="Two switches mounted on a wall with colour-coded VLAN ports, devices on a shelf below, a drooping trunk cable between the switches and a router above. Broadcast frames stay inside their VLAN colour; on the trunk each frame wears an amber 802.1Q tag ring; traffic between VLANs goes up to the router and back."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={dyn.blink} />
        <Items items={sortItems(dyn.caps)} />
      </Card>
      <div className="controls">
        <div className="seg">
          <button className={scene === "b10" ? "on" : ""} onClick={() => { poke(); go("b10"); }}>Broadcast in <span className="c-blue">VLAN 10</span></button>
          <button className={scene === "b20" ? "on" : ""} onClick={() => { poke(); go("b20"); }}>Broadcast in <span className="c-rose">VLAN 20</span></button>
          <button className={scene === "route" ? "on" : ""} onClick={() => { poke(); go("route"); }}>VLAN 10 → VLAN 20</button>
        </div>
      </div>
      <Legend items={[
        ...VLANS.map((v) => ({ swatch: VFAM[v.id], text: `VLAN ${v.id} ${v.name} · ${v.subnet}` })),
        { swatch: "sig", text: `Trunk (802.1Q tag, +${TAG_BYTES} B)` },
      ]} />
      <p className="caption">
        Each colour is a separate network that happens to share the hardware: a frame never leaves its VLAN on its own. Access ports carry one VLAN untagged; the trunk carries all of them, each frame wearing a tag with its VLAN ID. Getting from one colour to another always takes a router.
      </p>
    </div>
  );
}
