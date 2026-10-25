import { useMemo, useRef, useState } from "react";
import {
  blob, box, boundsOf, camera, cyl, ease, faceText, frameAt, halo, lerp, line3, prism, rrect, sortItems, totalOf,
  type Fam, type Item, type LineItem, type Seg, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { DEFAULT_TTL, DEST, HOPS, SOURCE } from "../models/hops";

const C = camera(14, 44);
const BASE = 4;
const TERRACE = 3.2;
// six hills: source, four routers, destination
const HILLS = [
  { x: 0, y: 46, r: 22, levels: 2, seed: 1 },
  { x: 44, y: 14, r: 20, levels: 3, seed: 2.3 },
  { x: 88, y: 50, r: 22, levels: 4, seed: 3.1 },
  { x: 132, y: 16, r: 21, levels: 3, seed: 4.7 },
  { x: 176, y: 52, r: 22, levels: 4, seed: 5.2 },
  { x: 220, y: 20, r: 22, levels: 2, seed: 6.4 },
];
const hillTop = (i: number) => BASE + HILLS[i].levels * TERRACE;
const TOWER_H = 16;
const beacon = (i: number): V3 => [HILLS[i].x, HILLS[i].y, hillTop(i) + (i === 0 || i === 5 ? 10 : TOWER_H + 3)];

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-34, -16, 290, 100, 8);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, BASE, "sand", { key: -100, bevel: 1 }));
  // a river winding across the model
  let river = "";
  const rv: V3[] = [];
  for (let x = -30; x <= 250; x += 4) rv.push([x, 34 + 9 * Math.sin(x / 26), BASE + 0.05]);
  river = line3(C, rv);
  it.push({ kind: "line", d: river, tone: "sea", w: 3.2, layer: 0, key: -99 } as LineItem);
  it.push({ kind: "line", d: river, tone: "blue", w: 0.6, layer: 0, key: -98.9 } as LineItem);
  // terraced hills, back to front
  HILLS.forEach((h, i) => {
    for (let l = 0; l < h.levels; l++) {
      const k = 1 - l / (h.levels + 0.6);
      const fam: Fam = l === h.levels - 1 || l % 2 === 0 ? "moss" : "sand";
      it.push(prism(C, blob(h.x, h.y, h.r * k, h.r * k * 0.82, h.seed + l, 0.12), BASE + l * TERRACE, TERRACE, fam, { key: -90 + i * 0.01 + l * 0.001 + (h.x + h.y) * 0.0001 }));
    }
  });
  // source shack and destination building
  const [sx, sy] = [HILLS[0].x, HILLS[0].y];
  it.push(box(C, sx - 6, sy - 5, hillTop(0), 12, 10, 8, "hi", { key: 0, bevel: 0.4 }));
  it.push(box(C, sx - 7, sy - 6, hillTop(0) + 8, 14, 12, 1.4, "rose", { key: 0.1, bevel: 0.3 }));
  it.push(faceText(C, SOURCE.name.toUpperCase(), [sx, sy + 5, hillTop(0) + 4.5], "+y", 2, "ink", { key: 0.2, weight: 700 }));
  const [dx, dy] = [HILLS[5].x, HILLS[5].y];
  it.push(box(C, dx - 7, dy - 6, hillTop(5), 14, 12, 10, "hi", { key: 5, bevel: 0.4 }));
  it.push(box(C, dx - 8, dy - 7, hillTop(5) + 10, 16, 14, 1.4, "teal", { key: 5.1, bevel: 0.3 }));
  it.push(faceText(C, "SERVER", [dx, dy + 6, hillTop(5) + 6], "+y", 2.2, "ink", { key: 5.2, weight: 700 }));
  it.push(faceText(C, DEST.ip, [dx, dy + 6, hillTop(5) + 3], "+y", 1.8, "ink", { key: 5.2 }));
  // router beacon towers with sign plates
  HOPS.forEach((h, k) => {
    const i = k + 1;
    const [x, y] = [HILLS[i].x, HILLS[i].y];
    const z = hillTop(i);
    it.push(cyl(C, x, y, z, 3.6, 1.2, "mid", { key: i, n: 20 }));
    it.push(box(C, x - 1, y - 1, z + 1.2, 2, 2, TOWER_H, "hi", { key: i + 0.1, shift: [0, 0] }));
    it.push(box(C, x - 2.4, y - 2.4, z + 1.2 + TOWER_H - 1, 4.8, 4.8, 1, "mid", { key: i + 0.2 }));
    it.push(box(C, x + 3, y + 3, z + 1.2, 14, 0.8, 6.5, "sig", { key: i + 0.3, bevel: 0.2 }));
    it.push(faceText(C, `R${k + 1}`, [x + 10, y + 3.8, z + 5.6], "+y", 2.1, "ink", { key: i + 0.4, weight: 700 }));
    it.push(faceText(C, h.ip, [x + 10, y + 3.8, z + 2.9], "+y", 1.6, "ink", { key: i + 0.4 }));
  });
  return sortItems(it);
}

// ---------- script ----------

type Orb = { at: V3; ttl: number; fam: Fam; alpha: number };
type Fr = { orb: Orb | null; icmp: V3 | null; flash: number; flashFam: Fam; rows: number; say: string };
type Mode = "ping" | "ttl3" | "trace";

const arc = (a: V3, b: V3, u: number, lift: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u) + Math.sin(Math.PI * u) * lift];

function script(mode: Mode): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  let rows = 0;
  const F = (p: Partial<Fr>): Fr => ({ orb: null, icmp: null, flash: -1, flashFam: "warn", rows, say: "", ...p });
  const probe = (ttl0: number, label: string) => {
    let ttl = ttl0;
    for (let i = 0; i < 5; i++) {
      const a = beacon(i), b = beacon(i + 1);
      const t = ttl;
      const r = rows;
      segs.push({ d: 0.75, f: (u) => F({ orb: { at: arc(a, b, ease(u), 10), ttl: t, fam: "rose", alpha: 1 }, rows: r, say: `${label} · hop ${i + 1} · TTL ${t}` }) });
      if (i === 4) {
        segs.push({ d: 0.6, f: () => F({ orb: { at: b, ttl: t, fam: "teal", alpha: 1 }, flash: 5, flashFam: "ok", rows: r, say: `Reached ${DEST.ip} with TTL ${t} left` }) });
        if (mode === "trace") {
          segs.push({ d: 1.1, f: (u) => F({ icmp: arc(b, beacon(0), ease(u), 26), flash: 5, flashFam: "ok", rows: r, say: `Reply from ${DEST.ip} · destination reached, trace complete` }) });
          rows++;
        }
        return;
      }
      ttl -= 1; // the router at hill i+1 decrements before forwarding
      if (ttl === 0) {
        const tt = ttl;
        segs.push({ d: 0.5, f: () => F({ orb: { at: b, ttl: tt, fam: "warn", alpha: 1 }, flash: i + 1, rows: r, say: `R${i + 1} decrements TTL to 0 · packet discarded` }) });
        segs.push({ d: 0.5, f: (u) => F({ orb: { at: [b[0], b[1], b[2] - u * 10], ttl: 0, fam: "warn", alpha: 1 - u }, flash: i + 1, rows: r, say: `R${i + 1} decrements TTL to 0 · packet discarded` }) });
        segs.push({ d: 1.1, f: (u) => F({ icmp: arc(b, beacon(0), ease(u), 26), flash: i + 1, rows: r, say: `ICMP Time Exceeded from ${HOPS[i].ip} back to the sender` }) });
        rows++;
        return;
      }
    }
  };
  if (mode === "ping") probe(DEFAULT_TTL, `Packet sent with TTL ${DEFAULT_TTL}`);
  else if (mode === "ttl3") probe(3, "Packet sent with TTL 3");
  else for (let t = 1; t <= 5; t++) probe(t, `Probe ${t} · TTL ${t}`);
  const r = rows;
  segs.push({ d: 1.6, f: () => F({ rows: r, say: mode === "trace" ? "traceroute: each router revealed itself by killing a probe" : mode === "ttl3" ? "TTL 3 ran out at the third router" : `Arrived after 5 hops with TTL ${DEFAULT_TTL - 4}` }) });
  return segs;
}

function orbItems(o: Orb | null): Item[] {
  if (!o) return [];
  const [x, y, z] = o.at;
  return [
    cyl(C, x, y, z - 1, 3.4, 2, o.fam, { key: 0, bevel: 0.3, n: 24 }),
    faceText(C, String(o.ttl), [x, y, z + 1], "top", 2.6, "ink", { key: 1, weight: 700 }),
  ];
}

function beaconItems(flash: number, fam: Fam): Item[] {
  const it: Item[] = [];
  HOPS.forEach((_, k) => {
    const i = k + 1;
    const [x, y, z] = beacon(i);
    it.push(cyl(C, x, y, z - 2.2, 2.2, 3, flash === i ? fam : "sig", { key: i, n: 18, bevel: 0.3 }));
    it.push(cyl(C, x, y, z + 0.8, 2.8, 0.8, "mid", { key: i + 0.1, n: 18 }));
  });
  return it;
}

export function BeaconHills() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [mode, setMode] = useState<Mode>("trace");
  const [run, setRun] = useState(0);
  const [fr, setFr] = useState<Fr>({ orb: null, icmp: null, flash: -1, flashFam: "warn", rows: 0, say: "" });
  const live = useRef({ t: 0, run: -1, done: false, tour: 0 });

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 10); return `${b.x} ${b.y - 18} ${b.w} ${b.h + 18}`; }, [stat]);
  const segs = useMemo(() => script(mode), [mode, run]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (m: Mode) => { setMode(m); setRun((r) => r + 1); };
  const poke = useTour(() => { const seq: Mode[] = ["ping", "ttl3", "trace"]; go(seq[live.current.tour++ % 3]); }, inView && !reduced, totalOf(segs) + 1.5, 6);

  useLoop((_t, dt) => {
    const L = live.current;
    if (L.run !== run) { L.run = run; L.t = 0; L.done = false; }
    if (L.done) return;
    const T = totalOf(segs);
    L.t = reduced ? T : Math.min(T, L.t + dt);
    setFr(frameAt(segs, L.t).fr);
    if (L.t >= T) L.done = true;
  }, inView);

  const dyn = useMemo(() => {
    const icmp: Item[] = fr.icmp ? [box(C, fr.icmp[0] - 1.8, fr.icmp[1] - 1.8, fr.icmp[2] - 1.8, 3.6, 3.6, 3.6, "warn", { key: 0, bevel: 0.3 })] : [];
    return { beacons: beaconItems(fr.flash, fr.flashFam), orb: orbItems(fr.orb), icmp };
  }, [fr]);

  const rows = mode === "trace" ? [...HOPS, DEST].slice(0, fr.rows) : mode === "ttl3" ? HOPS.slice(2, 2 + fr.rows) : [];
  const onKey = (e: React.KeyboardEvent) => {
    poke();
    if (e.key === "1") go("ping");
    if (e.key === "2") go("ttl3");
    if (e.key === "3") go("trace");
  };

  return (
    <div>
      <Card
        n={11}
        title="Beacon hills"
        hint="1 normal packet · 2 TTL 3 · 3 traceroute"
        readout={<>{fr.say.split(" · ").map((s, i) => (i === 0 ? <b key={i}>{s}</b> : <span key={i}> · {s}</span>))}</>}
        viewBox={vb}
        label="A terraced contour model with six hills. A packet disc showing its TTL flies from the laptop hill over four router beacon towers to a server. Each router lowers the TTL by one; when it reaches zero the tower flashes, the packet falls, and an ICMP Time Exceeded message flies back. Traceroute sends probes with TTL 1, 2, 3 and so on."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={dyn.beacons} />
        <g opacity={fr.orb?.alpha ?? 1}><Items items={dyn.orb} /></g>
        <Items items={dyn.icmp} />
      </Card>
      <div className="controls">
        <div className="seg">
          <button className={mode === "ping" ? "on" : ""} onClick={() => { poke(); go("ping"); }}>Normal packet (TTL {DEFAULT_TTL})</button>
          <button className={mode === "ttl3" ? "on" : ""} onClick={() => { poke(); go("ttl3"); }}>TTL 3</button>
          <button className={mode === "trace" ? "on" : ""} onClick={() => { poke(); go("trace"); }}>traceroute</button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="mono" style={{ fontSize: 13 }}>
          <thead><tr><th>Hop</th><th>Address</th><th>Name</th><th>RTT</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} style={{ color: "var(--dim)" }}>{mode === "ping" ? "a normal packet produces no replies from routers along the way" : "waiting for replies…"}</td></tr>}
            {rows.map((h, k) => (
              <tr key={h.ip}>
                <td>{mode === "ttl3" ? 3 : k + 1}</td><td className={h === DEST ? "c-teal" : "c-amber"}>{h.ip}</td><td>{h.name}</td><td>{h.rtt.toFixed(1)} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Legend items={[
        { swatch: "rose", text: "Packet (number = TTL left)" },
        { swatch: "sig", text: "Router beacon" },
        { swatch: "warn", text: "TTL hit 0 · ICMP Time Exceeded" },
        { swatch: "teal", text: "Destination reached" },
      ]} />
      <p className="caption">
        Every router subtracts 1 from the TTL before forwarding. A packet that reaches 0 is discarded, and the router that discarded it sends back an ICMP Time Exceeded with its own address. traceroute uses exactly that: probe 1 dies at the first router, probe 2 at the second, and so on, until a probe reaches the destination.
      </p>
    </div>
  );
}
