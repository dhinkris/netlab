import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, faceText, halo, lerp, line3, pathOf, prism, proj, rotRect, rrect, sortItems,
  type Fam, type Item, type LineItem, type Solid, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { fmt } from "../models/cidr";

const C = camera(28, 34);
const GZ = 3, LH = 16; // ground, level height
const BAYS = 16; // per level, drawn
const PORTS_PER_IP = 64512;
const PER_BAY = PORTS_PER_IP / BAYS; // 4,032 ports per drawn bay
const BAY_W = 10, X0 = 40, ROW_Y = [18, 44];
const bayPos = (lvl: number, b: number): V3 => [X0 + (b % 8) * BAY_W + BAY_W / 2, ROW_Y[Math.floor(b / 8)] + 5, GZ + lvl * LH + 1.2];
const ENTRY: V3 = [16, 34, GZ];

function flat(pts: V3[], fam: Fam, key: number): Solid {
  const d = pathOf(pts.map((p) => proj(C, p)), true);
  return { kind: "solid", faces: [{ d, fill: `var(--${fam}-t)` }], creases: "", outline: d, layer: 0, key };
}

function garage(levels: number): Item[] {
  const it: Item[] = [];
  const plan = rrect(-12, -8, 166, 82, 5);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, GZ, "lo", { key: -100, bevel: 0.6 }));
  // street and entrance
  it.push(box(C, -12, 28, GZ, 46, 12, 0.2, "mid", { key: -99 }));
  let dash = "";
  for (let x = -10; x < 32; x += 6) dash += line3(C, [[x, 34, GZ + 0.25], [x + 3, 34, GZ + 0.25]]);
  it.push({ kind: "line", d: dash, tone: "lit", w: 0.5, layer: 0, key: -98.9 } as LineItem);
  it.push(faceText(C, "→ to api.partner.example:443", [-10, 24, GZ], "top", 2.2, "sig", { anchor: "start", key: -98.8, weight: 700 }));
  for (let l = 0; l < 2; l++) {
    const z = GZ + l * LH;
    const open = l < levels;
    const k = l * 20;
    if (l > 0) {
      // the upper deck is drawn as glass so the ground level stays visible beneath it
      for (const x of [X0 - 3, X0 + 40, X0 + 8 * BAY_W + 1]) for (const y of [11, 57]) it.push(box(C, x, y, GZ, 2, 2, LH - 1.2, "mid", { key: 10 + x * 0.001 + y * 0.0001 }));
      const deck: V3[] = [[X0 - 4, 10, z], [X0 + 8 * BAY_W + 4, 10, z], [X0 + 8 * BAY_W + 4, 60, z], [X0 - 4, 60, z]];
      const d = pathOf(deck.map((q) => proj(C, q)), true);
      it.push({ kind: "solid", faces: [{ d, fill: open ? "color-mix(in srgb, var(--hi-t) 30%, transparent)" : "transparent" }], creases: "", outline: d, layer: 0, key: k - 5 } as Solid);
    } else {
      it.push(box(C, X0 - 4, 10, z, 8 * BAY_W + 8, 50, 0.2, "hi", { key: k - 5 }));
    }
    // bay stripes and port-range labels
    let stripes = "";
    for (const ry of ROW_Y) for (let b = 0; b <= 8; b++) stripes += line3(C, [[X0 + b * BAY_W, ry, z + 0.3], [X0 + b * BAY_W, ry + 12, z + 0.3]]);
    if (open) it.push({ kind: "line", d: stripes, tone: "lit", w: 0.5, layer: 0, key: k - 4.9 } as LineItem);
    it.push(box(C, X0 + 8 * BAY_W + 6, 10, z + 0.2, 0.8, 50, 6, open ? "sig" : "lo", { key: k - 4.8 }));
    it.push(faceText(C, open ? `PUBLIC IP ${l + 1}: 203.0.113.${50 + l}` : "(add a 2nd public IP to open)", [X0 + 8 * BAY_W + 6.8, 35, z + 3], "+x", 2.2, open ? "ink" : "mid", { key: k - 4.7, weight: 700 }));
  }
  // ramp from the street up to level 2
  if (levels > 1) it.push(flat([[X0 - 4, 62, GZ], [X0 + 30, 62, GZ + LH - 1.2], [X0 + 30, 70, GZ + LH - 1.2], [X0 - 4, 70, GZ]], "mid", 30));
  return sortItems(it);
}

type Car = { id: number; lvl: number; bay: number; born: number; dies: number; bounce: boolean };

export function ParkingGarage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [reuse, setReuse] = useState(false);
  const [levels, setLevels] = useState(1);
  const [load, setLoad] = useState(true);
  const S = useRef({ t: 0, next: 0, id: 0, cars: [] as Car[], failed: 0, tour: 0 });
  const [, setTick] = useState(0);

  const base = useMemo(() => garage(levels), [levels]);
  const vb = useMemo(() => { const b = boundsOf(garage(2), 6); return `${b.x} ${b.y - 6} ${b.w} ${b.h + 6}`; }, []);
  const reset = () => { S.current.cars = []; S.current.failed = 0; S.current.t = 0; S.current.next = 0; };

  const poke = useTour(() => {
    const seq: [boolean, number][] = [[false, 1], [false, 2], [true, 1]];
    const [r, l] = seq[++S.current.tour % seq.length];
    setReuse(r); setLevels(l); reset();
  }, inView && !reduced, 9, 6);

  useLoop((_t, dt) => {
    const st = S.current;
    st.t += reduced ? 0 : dt;
    // each "car" is one connection to the same destination, holding one port until it closes
    const rate = !load ? 0 : reuse ? 0.6 : 7; // new connections per second
    const life = reuse ? 999 : 3.2;
    st.cars = st.cars.filter((c) => st.t < c.dies);
    const parked = st.cars.filter((c) => !c.bounce);
    if (reuse && parked.length >= 4) { /* a small pool of kept-alive connections carries every request */ }
    else if (st.t >= st.next && rate > 0) {
      st.next = st.t + 1 / rate;
      const taken = new Set(parked.map((c) => c.lvl * BAYS + c.bay));
      let slot = -1;
      for (let i = 0; i < levels * BAYS; i++) if (!taken.has(i)) { slot = i; break; }
      if (slot < 0) { st.cars.push({ id: st.id++, lvl: 0, bay: 0, born: st.t, dies: st.t + 1.4, bounce: true }); st.failed++; }
      else st.cars.push({ id: st.id++, lvl: Math.floor(slot / BAYS), bay: slot % BAYS, born: st.t, dies: st.t + life, bounce: false });
    }
    setTick((k) => (k + 1) % 1e6);
  }, inView);

  const st = S.current;
  const parked = st.cars.filter((c) => !c.bounce);
  const cap = levels * BAYS;
  const pct = parked.length / cap;
  const dyn: Item[] = [];
  for (const c of st.cars) {
    const age = st.t - c.born;
    let p: V3, a = 0, fam: Fam = c.bounce ? "warn" : pct > 0.85 ? "sig" : "teal";
    if (c.bounce) {
      const u = Math.min(1, age / 1.4);
      p = [lerp(ENTRY[0] - 20, ENTRY[0] + 8, Math.sin(Math.PI * u)), ENTRY[1], GZ];
    } else {
      const target = bayPos(c.lvl, c.bay);
      const u = Math.min(1, age / 0.9);
      const start: V3 = c.lvl ? [X0 - 4, 66, GZ] : ENTRY;
      const mid: V3 = c.lvl ? [X0 + 30, 66, GZ + LH] : [target[0], 34, GZ];
      if (u < 0.5) { const t = u / 0.5; p = [lerp(start[0], mid[0], t), lerp(start[1], mid[1], t), lerp(start[2], mid[2], t)]; a = Math.atan2(mid[1] - start[1], mid[0] - start[0]); }
      else { const t = (u - 0.5) / 0.5; p = [lerp(mid[0], target[0], t), lerp(mid[1], target[1], t), target[2] - 1.2]; a = Math.PI / 2 * (target[1] > 34 ? 1 : -1); }
      if (u >= 1) a = Math.PI / 2;
    }
    const ck = (p[2] > GZ + LH / 2 ? 0.15 : 0.01) + p[1] * 0.0001 + c.id * 1e-8;
    dyn.push(prism(C, rotRect(p[0], p[1], 8, 4.6, a), p[2] + 0.2, 2.2, fam, { key: ck, bevel: 0.3 }));
    dyn.push(prism(C, rotRect(p[0], p[1], 4, 4, a), p[2] + 2.4, 1.6, "lit", { key: ck + 1e-9 }));
  }
  // occupancy meter beside the entrance
  dyn.push(box(C, 2, 2, GZ, 6, 4, 30, "lo", { key: -1 }));
  dyn.push(box(C, 2.5, 6, GZ + 0.5, 5, 0.4, 29 * pct, pct > 0.85 ? "warn" : "teal", { key: -0.9 }));
  dyn.push(faceText(C, "PORTS IN USE", [5, 6.4, GZ + 33], "+y", 1.8, "hi", { key: -0.8, weight: 700 }));

  const portsUsed = Math.round(parked.length * PER_BAY);
  const say = st.failed > 0 && pct >= 1 && !reuse
    ? <><b className="c-rose">SNAT exhaustion</b> · every port to this destination is held · new connections fail ({st.failed} turned away)</>
    : reuse
      ? <><b className="c-teal">Connection reuse</b> · a few long-lived connections carry every request · ports barely used</>
      : <><b>New connection per request</b> · each one holds a port until it closes and times out</>;

  return (
    <div>
      <Card
        n={27}
        title="SNAT garage"
        hint="toggle reuse · add a public IP · pause load"
        readout={<>{say} · {fmt(portsUsed)} / {fmt(cap * PER_BAY)} ports</>}
        viewBox={vb}
        label="A parking garage where each level is one public IP and each bay stands for a block of SNAT ports. Every new outbound connection to the same destination parks a car until it closes. Without connection reuse the bays fill and arriving cars are turned away; adding a second public IP opens another level; reusing connections keeps only a few cars parked."
        onKeyDown={() => poke()}
        svgRef={svgRef}
      >
        <Items items={base.filter((i) => i.key < 14)} />
        <Items items={sortItems(dyn.filter((i) => i.key < 0.1))} />
        <Items items={base.filter((i) => i.key >= 14)} />
        <Items items={sortItems(dyn.filter((i) => i.key >= 0.1))} />
      </Card>
      <div className="controls">
        <button className="pill-btn" onClick={() => { poke(); setReuse((v) => !v); reset(); }} style={{ borderColor: reuse ? "var(--ok)" : undefined }}>Connection reuse: {reuse ? "ON" : "OFF"}</button>
        <button className="pill-btn" onClick={() => { poke(); setLevels((l) => (l === 1 ? 2 : 1)); reset(); }}>Public IPs: {levels} {levels === 1 ? "(add one)" : "(remove one)"}</button>
        <button className="pill-btn" onClick={() => { poke(); setLoad((v) => !v); }}>{load ? "Pause traffic" : "Resume traffic"}</button>
      </div>
      <Legend items={[
        { swatch: "teal", text: "Car = one connection holding a SNAT port" },
        { swatch: "warn", text: "Turned away: no free port" },
        { swatch: "sig", text: "Level = one public IP (64,512 ports)" },
      ]} />
      <p className="caption">
        Drawn to scale per level: 16 bays × {fmt(PER_BAY)} ports = 64,512 ports per public IP. The limit is per destination IP and port: connections to different destinations can reuse the same source port, which is why exhaustion usually hits apps that hammer one API.
      </p>
    </div>
  );
}
