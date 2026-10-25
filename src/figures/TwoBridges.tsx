import { useMemo, useRef, useState } from "react";
import {
  alongPath, box, boundsOf, camera, ease, faceText, frameAt, halo, headingAt, lerp, line3, offsetPath, pathOf, prism, proj, rotRect, rrect,
  sortItems, totalOf, type Fam, type Item, type LineItem, type Seg, type Solid, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";

const C = camera(28, 34);
const GZ = 6; // bank top
const WZ = 3; // water surface
const RIVER = { x0: 70, x1: 122 };
const BA = 26, BB = 78; // bridge centre lines (y)
const BOOTH_X = 96;
const DECK_Z = GZ + 0.2;

const west = (y: number): V3[] => [[32, 52, GZ], [50, 52, GZ], [50, y, GZ], [RIVER.x0 - 4, y, GZ]];
const east = (y: number): V3[] => [[RIVER.x1 + 4, y, GZ], [142, y, GZ], [142, 52, GZ], [160, 52, GZ]];
const route = (y: number): V3[] => [...west(y), ...east(y)];
const viaA = route(BA), viaB = route(BB);
const stopAt = (path: V3[], x: number, dir: 1 | -1) => { for (let k = 0; k <= 400; k++) { const p = alongPath(path, k / 400); if (dir > 0 ? p[0] >= x : p[0] <= x) return k / 400; } return 0.5; };

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-12, -14, 224, 124, 8);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, WZ, "sea", { key: -100, bevel: 1 }));
  // flowing water lines
  let flow = "";
  for (let y = -10; y < 108; y += 5) for (let x = RIVER.x0 + 4 + ((y * 7) % 10); x < RIVER.x1 - 6; x += 18) flow += line3(C, [[x, y, WZ], [x + 5, y + 0.6, WZ]]);
  it.push({ kind: "line", d: flow, tone: "blue", w: 0.5, layer: 0, key: -99 } as LineItem);
  // two banks
  it.push(prism(C, rrect(-12, -14, RIVER.x0 + 12, 124, 6), WZ, GZ - WZ, "moss", { key: -90 }));
  it.push(prism(C, rrect(RIVER.x1, -14, 212 - RIVER.x1, 124, 6), WZ, GZ - WZ, "moss", { key: -89 }));
  // roads on each bank (packed earth)
  for (const y of [BA, BB]) {
    for (const p of [west(y), east(y)]) {
      // packed-earth road strip (a filled shape, so it reads the same in both themes)
      const band = [...offsetPath(p, 3), ...offsetPath(p, -3).reverse()].map((q): [number, number] => proj(C, [q[0], q[1], GZ + 0.04]));
      const d = pathOf(band, true);
      it.push({ kind: "solid", faces: [{ d, fill: "var(--sand-t)" }], creases: "", outline: "", layer: 0, key: -80 } as Solid);
    }
  }
  // subnets as buildings
  for (const [x, name, sub, fam] of [[18, "vm-app", "subnet A 10.1.1.0/24", "blue"], [174, "vm-db", "subnet B 10.1.2.0/24", "violet"]] as const) {
    it.push(box(C, x - 14, 40, GZ, 28, 24, 14, "hi", { key: -70 + x * 0.001, bevel: 0.4 }));
    it.push(box(C, x - 15, 39, GZ + 14, 30, 26, 1.6, fam, { key: -69.9 + x * 0.001 }));
    it.push(faceText(C, name, [x, 48, GZ + 15.6], "top", 2.8, "ink", { key: -69.8 + x * 0.001, weight: 700 }));
    it.push(faceText(C, sub, [x, 53, GZ + 15.6], "top", 1.7, "ink", { key: -69.8 + x * 0.001 }));
  }
  // bridges: piers, deck, railings
  for (const [y, k] of [[BA, 0], [BB, 10]] as const) {
    for (const px of [86, 106]) it.push(box(C, px - 2, y - 4, 0.5, 4, 8, DECK_Z - 0.5, "mid", { key: -60 + k + px * 0.001 }));
    it.push(box(C, RIVER.x0 - 4, y - 5, DECK_Z, RIVER.x1 - RIVER.x0 + 8, 10, 1.4, "sand", { key: -59 + k, bevel: 0.3 }));
    let rail = "";
    for (const ry of [y - 5, y + 5]) {
      rail += line3(C, [[RIVER.x0 - 4, ry, DECK_Z + 4], [RIVER.x1 + 4, ry, DECK_Z + 4]]);
      for (let x = RIVER.x0 - 4; x <= RIVER.x1 + 4; x += 6) rail += line3(C, [[x, ry, DECK_Z + 1.4], [x, ry, DECK_Z + 4]]);
    }
    it.push({ kind: "line", d: rail, tone: "mid", w: 0.5, layer: 0, key: -58 + k } as LineItem);
  }
  // bridge B sign
  it.push(box(C, RIVER.x1 + 8, BB + 8, GZ, 1.2, 1.2, 10, "hi", { key: -50 }));
  it.push(box(C, RIVER.x1 + 8, BB + 9.2, GZ + 6, 30, 0.8, 5, "lo", { key: -49.9 }));
  it.push(faceText(C, "DIRECT · system route", [RIVER.x1 + 23, BB + 10, GZ + 8.5], "+y", 1.9, "hi", { key: -49.8, weight: 700 }));
  // toll booth (the firewall appliance) on bridge A
  it.push(box(C, BOOTH_X - 5, BA - 12, DECK_Z - 2, 10, 7, 13, "sand", { key: -40, bevel: 0.3 }));
  it.push(box(C, BOOTH_X - 6, BA - 13, DECK_Z + 11, 12, 9, 1.6, "sig", { key: -39.9 }));
  it.push(box(C, BOOTH_X - 3.5, BA - 5, DECK_Z + 4, 7, 0.3, 4, "sea", { key: -39.8 }));
  it.push(faceText(C, "FIREWALL NVA", [BOOTH_X + 12, BA - 14, DECK_Z + 13], "top", 2, "sig", { anchor: "start", key: -39.7, weight: 700 }));
  return sortItems(it);
}

// ---------- script ----------

type Car = { path: V3[]; u: number; fam: Fam; label: string };
type Log = { text: string; ok: boolean };
type Fr = { car: Car | null; arm: number; log: Log[]; say: string };
type Scene = "asym" | "sym";

function script(sc: Scene): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  let log: Log[] = [];
  const F = (p: Partial<Fr>): Fr => ({ car: null, arm: 0, log, say: "", ...p });
  const drive = (path: V3[], fam: Fam, label: string, say: string, from = 0, to = 1, d = 1.8, arm = 0) => {
    const lg = log;
    segs.push({ d, f: (u) => F({ car: { path, u: lerp(from, to, ease(u)), fam, label }, arm, log: lg, say }) });
  };
  const booth = (path: V3[], dir: 1 | -1, fam: Fam, label: string, entry: Log, sayStop: string, sayGo: string) => {
    const s = stopAt(path, BOOTH_X + (dir > 0 ? -9 : 9), dir);
    drive(path, fam, label, sayGo, 0, s, 1.3);
    const before = log;
    log = [...log, entry].slice(-4);
    const lg = log;
    if (entry.ok) {
      segs.push({ d: 0.8, f: (u) => F({ car: { path, u: s, fam, label }, arm: ease(u), log: lg, say: sayStop }) });
      drive(path, fam, label, sayStop, s, 1, 1.4, 1);
      segs.push({ d: 0.3, f: (u) => F({ arm: 1 - u, log: lg, say: sayStop }) });
    } else {
      void before;
      segs.push({ d: 1.1, f: () => F({ car: { path, u: s, fam: "warn", label }, log: lg, say: sayStop }) });
      drive(path, "warn", label, "Dropped · the connection never completes", s, 0, 1.3);
    }
  };
  const back = (p: V3[]) => [...p].reverse();
  booth(viaA, 1, "blue", "SYN", { text: "SYN  A→B :1433  new", ok: true }, "Firewall sees SYN · records a new connection · lifts the arm", "vm-app → vm-db:1433 · subnet A has a UDR: 10.1.2.0/24 → firewall");
  if (sc === "asym") {
    drive(back(viaB), "violet", "SYN-ACK", "vm-db replies · subnet B has no UDR, so the system route takes the direct bridge", 0, 1, 3.2);
    segs.push({ d: 0.6, f: () => F({ say: "The firewall never saw the SYN-ACK" }) });
    booth(viaA, 1, "blue", "ACK", { text: "ACK  A→B  no SYN-ACK seen", ok: false }, "vm-app's ACK reaches the firewall · it never saw a SYN-ACK, so the packet is out of state", "vm-app completes the handshake · back through the firewall");
    segs.push({ d: 1.4, f: () => F({ say: "Asymmetric routing: the two directions took different paths" }) });
  } else {
    const r = back(viaA);
    booth(r, -1, "violet", "SYN-ACK", { text: "SYN-ACK  B→A  ✓ state", ok: true }, "Firewall sees the SYN-ACK · it matches the recorded connection", "vm-db replies · subnet B also has a UDR: 10.1.1.0/24 → firewall");
    booth(viaA, 1, "blue", "ACK", { text: "ACK  A→B  ✓ established", ok: true }, "ACK matches · connection established", "vm-app completes the handshake");
    segs.push({ d: 1.4, f: () => F({ say: "Symmetric: UDRs on both subnets send both directions through the same firewall" }) });
  }
  return segs;
}

// ---------- live parts ----------

function carItems(c: Car | null): Item[] {
  if (!c) return [];
  const p = alongPath(c.path, c.u);
  const a = headingAt(c.path, c.u);
  const onDeck = p[0] > RIVER.x0 - 4 && p[0] < RIVER.x1 + 4;
  const z = onDeck ? DECK_Z + 1.4 : GZ;
  const ca = Math.cos(a), sa = Math.sin(a);
  return sortItems([
    prism(C, rotRect(p[0], p[1], 10, 5, a), z, 2.4, c.fam, { key: 0, bevel: 0.3 }),
    prism(C, rotRect(p[0] - ca, p[1] - sa, 5, 4.4, a), z + 2.4, 1.8, "lit", { key: 1 }),
    faceText(C, c.label, [p[0], p[1] + 2.6, z + 6.5], "+y", 2, c.fam === "warn" ? "warn" : "hi", { key: 2, weight: 700 }),
  ]);
}

function boothItems(arm: number, log: Log[]): Item[] {
  const it: Item[] = [];
  // barrier arm across the deck, lifting about its post
  it.push(box(C, BOOTH_X - 1, BA - 6, DECK_Z + 1.4, 2, 2, 5, "hi", { key: 0 }));
  if (arm < 0.95) it.push(box(C, BOOTH_X - 0.5, BA - 5, DECK_Z + 5.5 + arm * 0, 1, 10 * (1 - arm) + 0.6, 1, "warn", { key: 1 }));
  if (arm > 0.05) it.push(box(C, BOOTH_X - 0.5, BA - 5, DECK_Z + 6.4, 1, 1, 10 * arm, "warn", { key: 1.1 }));
  // the log card pinned to the booth's front
  it.push(box(C, BOOTH_X + 6, BA - 13, DECK_Z - 2, 22, 0.6, 12, "hi", { key: 2 }));
  log.forEach((l, k) => it.push(faceText(C, l.text, [BOOTH_X + 7, BA - 12.4, DECK_Z + 8 - k * 2.6], "+y", 1.35, l.ok ? "ink" : "warn", { anchor: "start", key: 3, weight: 700 })));
  if (!log.length) it.push(faceText(C, "flow log (empty)", [BOOTH_X + 7, BA - 12.4, DECK_Z + 8], "+y", 1.35, "mid", { anchor: "start", key: 3 }));
  return it;
}

export function TwoBridges() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [scene, setScene] = useState<Scene>("asym");
  const [run, setRun] = useState(0);
  const [fr, setFr] = useState<Fr>({ car: null, arm: 0, log: [], say: "" });
  const live = useRef({ t: 0, run: -1, done: false, tour: 0 });

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const segs = useMemo(() => script(scene), [scene, run]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (s: Scene) => { setScene(s); setRun((r) => r + 1); };
  const poke = useTour(() => go(++live.current.tour % 2 ? "sym" : "asym"), inView && !reduced, totalOf(segs) + 1.2, 6);

  useLoop((_t, dt) => {
    const L = live.current;
    if (L.run !== run) { L.run = run; L.t = 0; L.done = false; }
    if (L.done) return;
    const T = totalOf(segs);
    L.t = reduced ? T : Math.min(T, L.t + dt);
    setFr(frameAt(segs, L.t).fr);
    if (L.t >= T) L.done = true;
  }, inView);

  const dyn = useMemo(() => ({ booth: boothItems(fr.arm, fr.log), car: carItems(fr.car) }), [fr]);
  const onKey = (e: React.KeyboardEvent) => {
    poke();
    if (e.key === "1") go("asym");
    if (e.key === "2") go("sym");
  };

  return (
    <div>
      <Card
        n={17}
        title="Two bridges"
        hint="1 UDR on one side · 2 UDR on both sides"
        readout={<>{fr.say.split(" · ").map((s, i) => (i === 0 ? <b key={i}>{s}</b> : <span key={i}> · {s}</span>))}</>}
        viewBox={vb}
        label="A river separates subnet A on the west bank from subnet B on the east. Bridge A carries a toll booth, the firewall appliance; bridge B is the direct system route. With a route table on subnet A only, the request crosses the booth but the reply takes the direct bridge, so the booth drops the next packet as out of state. With route tables on both subnets, every packet crosses the booth and the connection completes."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={dyn.booth} />
        <Items items={dyn.car} />
      </Card>
      <div className="controls">
        <div className="seg">
          <button className={scene === "asym" ? "on" : ""} onClick={() => { poke(); go("asym"); }}>UDR on subnet A only</button>
          <button className={scene === "sym" ? "on" : ""} onClick={() => { poke(); go("sym"); }}>UDR on both subnets</button>
        </div>
      </div>
      <Legend items={[
        { swatch: "blue", text: "vm-app → vm-db (subnet A)" },
        { swatch: "violet", text: "vm-db → vm-app (subnet B)" },
        { swatch: "sig", text: "Firewall appliance (stateful)" },
        { swatch: "warn", text: "Dropped: out of state" },
      ]} />
      <p className="caption">
        A stateful firewall has to see both directions of a conversation. Each subnet's route table decides only its own outgoing direction, so forcing traffic through an appliance takes a route on both sides. Miss one and the handshake breaks halfway, which is a classic "it connects, then hangs" symptom.
      </p>
    </div>
  );
}
