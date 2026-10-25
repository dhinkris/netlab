import { useMemo, useRef, useState } from "react";
import {
  alongPath, box, boundsOf, camera, cyl, ease, faceText, frameAt, halo, headingAt, lerp, line3, prism,
  rotRect, rrect, sortItems, totalOf, type Fam, type Item, type LineItem, type Seg, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";

const C = camera(34, 38);
const GZ = 3; // street level
const SZ = GZ + 1; // sidewalk level
const AV_Y = 72; // east-west avenue centre, in front of the districts
const ST_X = 67; // north-south street centre, between WEB and APP
const GATE_Y = 4;
type District = { name: string; tier: string; x0: number; x1: number; fam: Fam; door: number };
const DISTRICTS: District[] = [
  { name: "WEB", tier: "web tier", x0: 4, x1: 59, fam: "blue", door: 31 },
  { name: "APP", tier: "app tier", x0: 75, x1: 130, fam: "violet", door: 102 },
  { name: "DATA", tier: "data tier", x0: 138, x1: 193, fam: "teal", door: 165 },
];
const D_Y0 = 12, D_Y1 = 64;
const CHECK_Y = 66; // checkpoints sit between each district and the avenue

/** Window grid on a tower's two visible faces. */
function windows(x: number, y: number, w: number, d: number, z0: number, h: number, key: number): LineItem {
  let s = "";
  for (let z = z0 + 3; z < z0 + h - 2; z += 3.2) {
    for (let k = x + 2; k < x + w - 1.5; k += 3) s += line3(C, [[k, y + d, z], [k + 1.4, y + d, z]]);
    for (let k = y + 2; k < y + d - 1.5; k += 3) s += line3(C, [[x + w, k, z], [x + w, k + 1.4, z]]);
  }
  return { kind: "line", d: s, tone: "sig", w: 0.9, layer: 0, key };
}

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-14, -22, 216, 172, 6);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, GZ, "lo", { key: -100, bevel: 1 }));
  // outside the wall to the north: the internet road
  it.push(faceText(C, "INTERNET ↑ NORTH", [ST_X, -16, GZ], "top", 3, "sig", { key: -99, weight: 700 }));
  // lane markings
  let dash = "";
  for (let x = 2; x < 196; x += 6) dash += line3(C, [[x, AV_Y, GZ + 0.02], [x + 3, AV_Y, GZ + 0.02]]);
  for (let y = -18; y < AV_Y - 6; y += 6) dash += line3(C, [[ST_X, y, GZ + 0.02], [ST_X, y + 3, GZ + 0.02]]);
  // the south side is one long park, low enough not to hide the avenue
  it.push({ kind: "line", d: dash, tone: "lit", w: 0.5, layer: 0, key: -98 } as LineItem);
  // a park south of the avenue
  it.push(box(C, 0, AV_Y + 8, GZ, 194, 140 - AV_Y - 8, 1, "moss", { key: -90, r: 2 }));
  for (let k = 0; k < 14; k++) {
    const tx = 30 + ((k * 37) % 156), ty = AV_Y + 16 + ((k * 23) % 44);
    it.push(cyl(C, tx, ty, SZ, 0.8, 3, "sand", { key: -80 + tx * 0.001 + ty * 0.0001, n: 10 }));
    it.push(cyl(C, tx, ty, SZ + 3, 3.4, 3, "moss", { key: -79.9 + tx * 0.001 + ty * 0.0001, n: 16 }));
  }
  // compass rose on the south-west park corner
  const [cx, cy] = [14, 122];
  it.push(cyl(C, cx, cy, SZ, 7, 0.4, "hi", { key: -70, n: 32 }));
  it.push({ kind: "line", d: line3(C, [[cx, cy + 5, SZ + 0.4], [cx - 1.5, cy, SZ + 0.4], [cx, cy - 6, SZ + 0.4], [cx + 1.5, cy, SZ + 0.4]], true), tone: "warn", w: 0.7, layer: 0, key: -69.9 } as LineItem);
  it.push({ kind: "line", d: line3(C, [[cx - 5, cy, SZ + 0.4], [cx + 5, cy, SZ + 0.4]]), tone: "mid", w: 0.5, layer: 0, key: -69.9 } as LineItem);
  for (const [t, dx, dy] of [["N", 0, -8.5], ["S", 0, 8.5], ["W", -8.5, 0], ["E", 8.5, 0]] as const) {
    it.push(faceText(C, t, [cx + dx, cy + dy, SZ + 0.4], "top", 2.4, t === "N" ? "warn" : "mid", { key: -69.8, weight: 700 }));
  }
  // perimeter wall with the north gate (the perimeter firewall)
  it.push(box(C, -10, GATE_Y - 2, GZ, ST_X - 8 + 10, 3, 7, "hi", { key: -60, bevel: 0.3 }));
  it.push(box(C, ST_X + 8, GATE_Y - 2, GZ, 198 - ST_X - 8, 3, 7, "hi", { key: -60, bevel: 0.3 }));
  it.push(box(C, -10, GATE_Y + 1, GZ, 3, 140 - GATE_Y, 7, "hi", { key: -59, bevel: 0.3 }));
  it.push(box(C, ST_X - 9, GATE_Y - 4, GZ, 4, 7, 12, "sig", { key: -58, bevel: 0.4 }));
  it.push(box(C, ST_X + 5, GATE_Y - 4, GZ, 4, 7, 12, "sig", { key: -58, bevel: 0.4 }));
  it.push(box(C, ST_X - 9, GATE_Y - 4, GZ + 12, 18, 7, 3, "sig", { key: -57, bevel: 0.4 }));
  it.push(faceText(C, "PERIMETER FIREWALL", [ST_X, GATE_Y - 0.5, GZ + 15], "top", 1.7, "ink", { key: -56.9, weight: 700 }));
  // districts: sidewalk plinths with towers
  DISTRICTS.forEach((d, i) => {
    it.push(box(C, d.x0, D_Y0, GZ, d.x1 - d.x0, D_Y1 - D_Y0, 1, "hi", { key: 10 + i, r: 1.5 }));
    const towers = [[d.x0 + 4, D_Y0 + 4, 14, 12, 30 - i * 4], [d.x0 + 22, D_Y0 + 3, 12, 14, 20 + i * 5], [d.x0 + 38, D_Y0 + 6, 13, 12, 14 + (i % 2) * 10], [d.x0 + 3, D_Y0 + 26, 18, 16, 10 + i * 3], [d.x0 + 35, D_Y0 + 28, 16, 14, 18]];
    towers.forEach(([x, y, w, dd, h], k) => {
      const key = 11 + i + (x + y) * 0.0001 + k * 0.00001;
      it.push(box(C, x, y, SZ, w, dd, h, "mid", { key, bevel: 0.4 }));
      it.push(windows(x, y, w, dd, SZ, h, key + 0.000001));
      it.push(box(C, x - 0.5, y - 0.5, SZ + h, w + 1, dd + 1, 1, d.fam, { key: key + 0.000002 }));
    });
    it.push(faceText(C, d.name, [d.x0 + 4, D_Y1 - 4, SZ], "top", 3.6, d.fam, { anchor: "start", key: 10.5 + i, weight: 700 }));
  });
  return sortItems(it);
}

// ---------- script ----------

type Car = { path: V3[]; u: number; fam: Fam };
type Fr = { cars: Car[]; arms: number[]; stopped: number; say: string };
type Scene = "ns" | "ew" | "lateral";

const doorPt = (i: number): V3 => [DISTRICTS[i].door, D_Y1 + 1.5, GZ]; // on the kerb in front of the district
const avPt = (i: number): V3 => [DISTRICTS[i].door, AV_Y - 2.5, GZ];
const NS_PATH: V3[] = [[ST_X - 2.5, -18, GZ], [ST_X - 2.5, AV_Y - 2.5, GZ], avPt(0), doorPt(0)];
const ewPath = (a: number, b: number): V3[] => [doorPt(a), avPt(a), avPt(b), doorPt(b)];

function script(sc: Scene, seg: boolean): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  const F = (p: Partial<Fr>): Fr => ({ cars: [], arms: [0, 0, 0], stopped: -1, say: "", ...p });
  const drive = (path: V3[], fam: Fam, d: number, say: string, from = 0, to = 1, arms = [0, 0, 0]) =>
    segs.push({ d, f: (u) => F({ cars: [{ path, u: lerp(from, to, ease(u)), fam }], arms, say }) });
  /** Where the car waits: just south of the destination's checkpoint. */
  const checkU = (path: V3[]) => { for (let k = 400; k >= 0; k--) if (alongPath(path, k / 400)[1] > CHECK_Y + 3) return k / 400; return 0.9; };
  if (sc === "ns") {
    drive(NS_PATH, "sig", 3, "A user on the internet reaches the web tier · NORTH-SOUTH: it crosses the perimeter");
    segs.push({ d: 0.5, f: () => F({ say: "The web tier answers" }) });
    drive([...NS_PATH].reverse(), "sig", 3, "The reply leaves north through the same gate · the perimeter firewall saw both directions");
    segs.push({ d: 1.2, f: () => F({ say: "North-south traffic is the classic job of a perimeter firewall" }) });
    return segs;
  }
  const hops: [number, number][] = sc === "ew" ? [[0, 1], [1, 2]] : [[0, 2]];
  for (const [a, b] of hops) {
    const p = ewPath(a, b);
    const allowed = !(sc === "lateral" && seg);
    const label = sc === "lateral" ? "A compromised web server tries the database directly" : `${DISTRICTS[a].tier} calls the ${DISTRICTS[b].tier}`;
    if (!seg) {
      drive(p, sc === "lateral" ? "warn" : "teal", 2.4, `${label} · EAST-WEST: it never touches the perimeter`);
      if (sc === "lateral") segs.push({ d: 1.4, f: () => F({ say: "Nothing inside checked it · that's lateral movement, how breaches spread" }) });
      continue;
    }
    const cu = checkU(p);
    drive(p, allowed ? "teal" : "warn", 1.8, `${label} · EAST-WEST`, 0, cu);
    const arms = [0, 0, 0];
    if (allowed) {
      segs.push({ d: 0.7, f: (u) => { const a2 = [...arms]; a2[b] = ease(u); return F({ cars: [{ path: p, u: cu, fam: "teal" }], arms: a2, stopped: b, say: `Checkpoint at the ${DISTRICTS[b].tier}: policy allows ${DISTRICTS[a].name} → ${DISTRICTS[b].name}` }); } });
      const open = [...arms]; open[b] = 1;
      drive(p, "teal", 0.9, `Checkpoint at the ${DISTRICTS[b].tier}: policy allows ${DISTRICTS[a].name} → ${DISTRICTS[b].name}`, cu, 1, open);
    } else {
      segs.push({ d: 1.2, f: () => F({ cars: [{ path: p, u: cu, fam: "warn" }], stopped: b, say: `Checkpoint at the data tier: ${DISTRICTS[a].name} → ${DISTRICTS[b].name} is not allowed · denied` }) });
      drive(p, "warn", 1.4, "Turned back · micro-segmentation contained the breach", cu, 0);
    }
  }
  segs.push({ d: 1.3, f: () => F({ say: sc === "ew" ? "East-west traffic stays inside the walls, so the perimeter firewall never sees it" : seg ? "Only the paths you allowed exist between districts" : "Turn on micro-segmentation and try again" }) });
  return segs;
}

// ---------- live parts ----------

function carItems(c: Car): Item[] {
  const p = alongPath(c.path, c.u);
  const a = headingAt(c.path, c.u);
  const ca = Math.cos(a), sa = Math.sin(a);
  return sortItems([
    prism(C, rotRect(p[0], p[1], 10, 4.8, a), GZ, 2.4, c.fam, { key: 0, bevel: 0.3 }),
    prism(C, rotRect(p[0] - ca * 0.8, p[1] - sa * 0.8, 5, 4.2, a), GZ + 2.4, 1.8, "lit", { key: 1 }),
  ]);
}

function checkpointItems(on: boolean, arms: number[], stopped: number): Item[] {
  if (!on) return [];
  const it: Item[] = [];
  DISTRICTS.forEach((d, i) => {
    const x = d.door + 5;
    it.push(box(C, x, CHECK_Y - 1, GZ, 3, 3, 7, stopped === i ? "warn" : "sig", { key: i, bevel: 0.3 }));
    const lift = arms[i];
    it.push(box(C, x - 10 + 10 * lift * 0.0, CHECK_Y, GZ + 5, 10 - 9 * lift, 1, 1, "lit", { key: i + 0.1, shift: [0, 0] }));
    if (lift > 0.05) it.push(box(C, x, CHECK_Y, GZ + 6, 1, 1, 9 * lift, "lit", { key: i + 0.2 }));
  });
  return it;
}

export function CityBlock() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [scene, setScene] = useState<Scene>("ns");
  const [seg, setSeg] = useState(false);
  const [run, setRun] = useState(0);
  const [fr, setFr] = useState<Fr>({ cars: [], arms: [0, 0, 0], stopped: -1, say: "" });
  const [tally, setTally] = useState({ ns: 0, ew: 0 });
  const live = useRef({ t: 0, run: -1, done: false, tour: 0 });

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const segs = useMemo(() => script(scene, seg), [scene, seg, run]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (s: Scene) => { setScene(s); setRun((r) => r + 1); setTally((t) => (s === "ns" ? { ...t, ns: t.ns + 1 } : { ...t, ew: t.ew + (s === "ew" ? 2 : 1) })); };
  const poke = useTour(() => {
    const seq: [Scene, boolean][] = [["ns", false], ["ew", false], ["lateral", false], ["lateral", true]];
    const [s, m] = seq[++live.current.tour % seq.length];
    setSeg(m); go(s);
  }, inView && !reduced, totalOf(segs) + 1, 6);

  useLoop((_t, dt) => {
    const L = live.current;
    if (L.run !== run) { L.run = run; L.t = 0; L.done = false; }
    if (L.done) return;
    const T = totalOf(segs);
    L.t = reduced ? T : Math.min(T, L.t + dt);
    setFr(frameAt(segs, L.t).fr);
    if (L.t >= T) L.done = true;
  }, inView);

  const dyn = useMemo(() => ({ cars: fr.cars.flatMap(carItems), checks: checkpointItems(seg, fr.arms, fr.stopped) }), [fr, seg]);
  const onKey = (e: React.KeyboardEvent) => {
    poke();
    if (e.key === "1") go("ns");
    if (e.key === "2") go("ew");
    if (e.key === "3") go("lateral");
    if (e.key === "m") { setSeg((v) => !v); setRun((r) => r + 1); }
  };

  return (
    <div>
      <Card
        n={15}
        title="City block"
        hint="1 north-south · 2 east-west · 3 lateral · m segmentation"
        readout={<>{fr.say.split(" · ").map((s, i) => (i === 0 ? <b key={i}>{s}</b> : <span key={i}> · {s}</span>))}</>}
        viewBox={vb}
        label="A walled city with one north gate, the perimeter firewall. Three districts of buildings stand for the web, app and data tiers along an east-west avenue. Cars from the internet come in through the gate (north-south); cars between districts never pass the gate (east-west). Micro-segmentation adds checkpoints at each district that stop disallowed lateral movement."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={dyn.checks} />
        <Items items={sortItems(dyn.cars)} />
      </Card>
      <div className="controls">
        <div className="seg">
          <button className={scene === "ns" ? "on" : ""} onClick={() => { poke(); go("ns"); }}><span className="c-amber">●</span> user → web</button>
          <button className={scene === "ew" ? "on" : ""} onClick={() => { poke(); go("ew"); }}><span className="c-teal">●</span> web → app → data</button>
          <button className={scene === "lateral" ? "on" : ""} onClick={() => { poke(); go("lateral"); }}><span className="c-rose">●</span> compromised web → data</button>
        </div>
        <button className={`pill-btn${seg ? "" : ""}`} onClick={() => { poke(); setSeg((v) => !v); setRun((r) => r + 1); }} style={{ borderColor: seg ? "var(--ok)" : undefined }}>
          Micro-segmentation: {seg ? "ON" : "OFF"}
        </button>
        <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>flows sent · N-S {tally.ns} · E-W {tally.ew}</span>
      </div>
      <Legend items={[
        { swatch: "sig", text: "North-south (crosses the perimeter)" },
        { swatch: "teal", text: "East-west (stays inside)" },
        { swatch: "warn", text: "Lateral movement / denied" },
        { swatch: "blue", text: "Web tier" }, { swatch: "violet", text: "App tier" }, { swatch: "teal", text: "Data tier" },
      ]} />
      <p className="caption">
        "North-south" and "east-west" borrow the picture of a data centre drawn with the internet at the top. The perimeter firewall only sees traffic that passes its gate; everything between your own workloads travels on inside streets unless you put checkpoints there too.
      </p>
    </div>
  );
}
