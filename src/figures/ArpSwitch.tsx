import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, cyl, faceText, halo, labelPlate, line3, lineItem, rrect, screws,
  sortItems, ticksX, type Fam, type Item, type LineItem, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { BROADCAST_MAC, HOSTS, type Host } from "../models/arp";

const C = camera(36, 32);
const Z0 = 7;
const SW = { x0: 44, x1: 108, y0: 4, y1: 26, h: 11 };
const portX = (p: number) => SW.x0 + 9 + (p - 1) * 12; // p = 1..4
const HOST_X = [0, 60, 120];
const HOST = { w: 36, y0: 72, y1: 98, h: 11 };
const hostCx = (i: number) => HOST_X[i] + HOST.w / 2;
const CZ = Z0 + 1.2; // cable centre height
/** Each host keeps one colour on its lid, cable, switch port, MAC-table row and cache card. */
const HF: ("blue" | "violet" | "teal")[] = ["blue", "violet", "teal"];

/** Floor route of each host's cable, from switch port to host jack. */
function route(i: number): V3[] {
  const px = portX(i + 1) + 2.5;
  const ry = [46, 54, 46][i];
  return [[px, SW.y1 + 2, CZ], [px, ry, CZ], [hostCx(i), ry, CZ], [hostCx(i), HOST.y0 - 2, CZ]];
}

function along(pts: V3[], u: number): V3 {
  const seg: number[] = [];
  let L = 0;
  for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(d); L += d; }
  let t = Math.max(0, Math.min(1, u)) * L;
  for (let k = 0; k < seg.length; k++) {
    if (t <= seg[k] || k === seg.length - 1) {
      const f = seg[k] ? Math.min(1, t / seg[k]) : 0;
      const a = pts[k], b = pts[k + 1];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2]];
    }
    t -= seg[k];
  }
  return pts[pts.length - 1];
}

function backItems(): Item[] {
  const it: Item[] = [];
  const bx = -34, by = -8, bw = 196, bd = 118;
  it.push(halo(C, rrect(bx, by, bw, bd, 5), 5));
  for (const [fx, fy] of [[bx + 7, by + 7], [bx + bw - 7, by + 7], [bx + 7, by + bd - 7], [bx + bw - 7, by + bd - 7]]) {
    it.push(cyl(C, fx, fy, 0, 3.5, 3, "lo", { key: -60 }));
  }
  it.push(box(C, bx, by, 3, bw, bd, Z0 - 3, "lo", { key: -50, r: 5, bevel: 1.2 }));
  it.push(screws(C, bx, by, bw, bd, Z0, 4));
  it.push(...ticksX(C, bx + 10, bx + bw - 10, by + bd - 6, Z0, 4, 3, 5).map((l) => ({ ...l, key: -40 })));
  it.push({ ...lineItem(C, [[bx + 10, by + bd - 2.8, Z0], [bx + bw - 10, by + bd - 2.8, Z0]], "lo", 0.4), key: -40 });
  it.push(...labelPlate(C, 128, 8, Z0, 26, 8).map((x) => ({ ...x, key: -30 })));

  // switch
  it.push(box(C, SW.x0, SW.y0, Z0, SW.x1 - SW.x0, SW.y1 - SW.y0, SW.h, "mid", { key: 0, r: 1, bevel: 0.8 }));
  it.push(screws(C, SW.x0, SW.y0, SW.x1 - SW.x0, SW.y1 - SW.y0, Z0 + SW.h, 2.2));
  // MAC table window on the lid
  it.push(box(C, SW.x0 + 6, SW.y0 + 4, Z0 + SW.h, SW.x1 - SW.x0 - 12, 13, 0.4, "lo", { key: 0.1, r: 0.6 }));
  it.push(faceText(C, "MAC TABLE", [SW.x0 + 8, SW.y0 + 6.2, Z0 + SW.h + 0.4], "top", 1.7, "mid", { anchor: "start", key: 0.2, weight: 600 }));
  it.push(lineItem(C, [[SW.x0 + 8, SW.y0 + 7.8, Z0 + SW.h + 0.4], [SW.x1 - 8, SW.y0 + 7.8, Z0 + SW.h + 0.4]], "faint", 0.3, 0, 0.21));
  // vents on the lid's back half
  let vents = "";
  for (let x = SW.x0 + 8; x < SW.x1 - 8; x += 3) vents += line3(C, [[x, SW.y0 + 1.6, Z0 + SW.h], [x, SW.y0 + 3, Z0 + SW.h]]);
  it.push({ kind: "line", d: vents, tone: "faint", w: 0.7, layer: 0, key: 0.25 } as LineItem);
  // ports on the front face
  for (let p = 1; p <= 4; p++) {
    const x = portX(p);
    it.push(box(C, x, SW.y1, Z0 + 2, 5, 0.6, 4.4, "lo", { key: 0.3 }));
    it.push(faceText(C, String(p), [x + 2.5, SW.y1, Z0 + 8.4], "+y", 2.2, p <= 3 ? HF[p - 1] : "mid", { key: 0.31, weight: 700 }));
  }
  // cables (floor tubes) with jacks
  HOSTS.forEach((_, i) => {
    const r = route(i);
    it.push({ kind: "line", d: line3(C, r), tone: "lo", w: 2.8, layer: 0, key: 1 + i * 0.01 } as LineItem);
    it.push({ kind: "line", d: line3(C, r), tone: HF[i], w: 1.8, layer: 0, key: 1.001 + i * 0.01 } as LineItem);
    it.push({ kind: "line", d: line3(C, r.map(([x, y, z]) => [x - 0.3, y - 0.3, z + 0.5] as V3)), tone: "hi", w: 0.35, layer: 0, key: 1.002 + i * 0.01 } as LineItem);
    it.push(box(C, r[0][0] - 2, SW.y1 + 0.4, Z0, 4, 3, 3.4, "hi", { key: 1.1, bevel: 0.3 }));
    // cable clips where each run turns
    for (const k of [1, 2]) it.push(box(C, r[k][0] - 1.6, r[k][1] - 1.6, Z0, 3.2, 3.2, 2.2, "mid", { key: 1.2, bevel: 0.3 }));
  });
  // empty port 4 gets a dust cap
  it.push(box(C, portX(4), SW.y1 + 0.4, Z0 + 2.2, 5, 1, 4, "mid", { key: 1.1 }));
  return sortItems(it);
}

function frontItems(): Item[] {
  const it: Item[] = [];
  HOSTS.forEach((h, i) => {
    const x = HOST_X[i];
    it.push(box(C, x, HOST.y0, Z0, HOST.w, HOST.y1 - HOST.y0, HOST.h, "mid", { key: 10 + i, r: 1.4, bevel: 0.8 }));
    it.push(box(C, hostCx(i) - 2.5, HOST.y0 - 2.6, Z0 + 0.4, 5, 2.8, 3.6, "hi", { key: 9.9 + i, bevel: 0.3 }));
    it.push(box(C, x + 3, HOST.y0 + 3, Z0 + HOST.h, HOST.w - 6, HOST.y1 - HOST.y0 - 6, 0.4, HF[i], { key: 10.1 + i, r: 0.8 }));
    it.push(screws(C, x, HOST.y0, HOST.w, HOST.y1 - HOST.y0, Z0 + HOST.h, 1.6));
    const tz = Z0 + HOST.h + 0.4;
    it.push(faceText(C, `${h.id} · ${h.name}`, [x + 5, HOST.y0 + 7, tz], "top", 2.6, "ink", { anchor: "start", key: 10.2 + i, weight: 700 }));
    it.push(faceText(C, h.ip, [x + 5, HOST.y0 + 12.5, tz], "top", 2.4, "ink", { anchor: "start", key: 10.2 + i, weight: 600 }));
    it.push(faceText(C, h.mac, [x + 5, HOST.y0 + 17.5, tz], "top", 2, "ink", { anchor: "start", key: 10.2 + i }));
    // front grille
    let g = "";
    for (let k = 0; k < 6; k++) g += line3(C, [[x + 4 + k * 2, HOST.y1, Z0 + 3], [x + 4 + k * 2, HOST.y1, Z0 + 8]]);
    it.push({ kind: "line", d: g, tone: "lo", w: 0.6, layer: 0, key: 10.3 + i } as LineItem);
  });
  // ARP card tray next to host A
  const tx = -28, ty = 74;
  it.push(box(C, tx, ty, Z0, 18, 22, 1, "mid", { key: 5, r: 0.6 }));
  it.push(box(C, tx, ty, Z0 + 1, 1, 22, 5, "hi", { key: 5.1 }));
  it.push(box(C, tx, ty, Z0 + 1, 18, 1, 5, "hi", { key: 5.1 }));
  it.push(faceText(C, "ARP CACHE", [tx + 9, ty + 22, Z0 + 0.5], "+y", 1.5, "mid", { key: 7 }));
  return sortItems(it);
}

type Phase = { name: string; d: number; pulses: { route: number; dir: "up" | "down"; fam: Fam }[]; say: string };

function timeline(target: number): Phase[] {
  const T = HOSTS[target];
  const others = [1, 2].filter((i) => i !== target);
  return [
    { name: "idle", d: 0.6, pulses: [], say: `A wants to send to ${T.ip} but only knows its IP` },
    { name: "req-in", d: 1.2, pulses: [{ route: 0, dir: "up", fam: "sig" }], say: `ARP request · who has ${T.ip}? tell 10.0.0.11 · to ${BROADCAST_MAC}` },
    { name: "flood", d: 1.2, pulses: [1, 2].map((i) => ({ route: i, dir: "down" as const, fam: "sig" as Fam })), say: "Broadcast: the switch floods it out every other port, and learns A is on port 1" },
    { name: "check", d: 0.8, pulses: [], say: `${HOSTS[others[0]].id} ignores it · ${T.id} sees its own IP` },
    { name: "rep-in", d: 1.0, pulses: [{ route: target, dir: "up", fam: "ok" }], say: `ARP reply · ${T.ip} is at ${T.mac} · unicast to A` },
    { name: "rep-out", d: 1.0, pulses: [{ route: 0, dir: "down", fam: "ok" }], say: `Switch learns ${T.id} on port ${T.port}, forwards out port 1 only` },
    { name: "cache", d: 0.7, pulses: [], say: `A caches ${T.ip} → ${T.mac}` },
    { name: "data-in", d: 0.9, pulses: [{ route: 0, dir: "up", fam: "rose" }], say: `Data frame · dst MAC ${T.mac}` },
    { name: "data-out", d: 0.9, pulses: [{ route: target, dir: "down", fam: "rose" }], say: `Known MAC → out port ${T.port} only, no flooding` },
    { name: "done", d: 2.0, pulses: [], say: `Delivered · next frames to ${T.id} skip ARP until the cache entry expires` },
  ];
}

function at(ph: Phase[], t: number) {
  let acc = 0;
  for (let k = 0; k < ph.length; k++) {
    if (t < acc + ph[k].d) return { k, u: (t - acc) / ph[k].d };
    acc += ph[k].d;
  }
  return { k: ph.length - 1, u: 1 };
}

export function ArpSwitch() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [target, setTarget] = useState(2);
  const [run, setRun] = useState(0);
  const [clock, setClock] = useState({ k: 0, u: 0 });
  const live = useRef({ t: 0, run: 0, target: 2 });

  const back = useMemo(() => backItems(), []);
  const front = useMemo(() => frontItems(), []);
  const vb = useMemo(() => { const b = boundsOf([...back, ...front], 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [back, front]);
  const ph = useMemo(() => timeline(target), [target]);
  const total = ph.reduce((s, p) => s + p.d, 0);

  const start = (tg: number) => { live.current.t = 0; setTarget(tg); setRun((r) => r + 1); };
  const poke = useTour(() => start(live.current.target === 2 ? 1 : 2), inView && !reduced, total + 0.8, 5);

  useLoop((_t, dt) => {
    const L = live.current;
    if (L.run !== run || L.target !== target) { L.run = run; L.target = target; L.t = 0; }
    const nt = reduced ? total - 0.001 : Math.min(total - 0.001, L.t + dt);
    if (nt === L.t && L.t > 0) return;
    L.t = nt;
    setClock(at(ph, L.t));
  }, inView);

  const phase = ph[clock.k];
  const reached = (name: string) => ph.findIndex((p) => p.name === name) < clock.k || (phase.name === name && clock.u >= 1);
  const past = (name: string) => ph.findIndex((p) => p.name === name) < clock.k;

  const dyn = useMemo(() => {
    const pulses: Item[] = [];
    for (const p of phase.pulses) {
      const r = route(p.route);
      const u = clock.u;
      const pt = along(r, p.dir === "down" ? u : 1 - u);
      pulses.push(box(C, pt[0] - 2, pt[1] - 2, Z0 + 2.3, 4, 4, 2.6, p.fam, { key: 0, bevel: 0.3 }));
    }
    // MAC table rows and lamps
    const top: Item[] = [];
    const tz = Z0 + SW.h + 0.4;
    const rows: { t: string; i: number }[] = [];
    if (past("req-in")) rows.push({ t: `1  ${HOSTS[0].mac}`, i: 0 });
    if (past("rep-in")) rows.push({ t: `${HOSTS[target].port}  ${HOSTS[target].mac}`, i: target });
    rows.forEach((r, k) => top.push(faceText(C, r.t, [SW.x0 + 8, SW.y0 + 10.2 + k * 3.1, tz], "top", 2, HF[r.i], { anchor: "start", key: 1, weight: 600 })));
    // port activity LEDs
    const activePorts = new Set(phase.pulses.map((p) => HOSTS[p.route].port));
    for (let p = 1; p <= 4; p++) {
      const on = activePorts.has(p);
      top.push(box(C, portX(p) + 0.8, SW.y1, Z0 + 6.8, 1.4, 0.8, 1, on ? "ok" : p === 4 ? "lo" : "mid", { key: 2 }));
    }
    // host NIC lamps: who accepts / ignores the broadcast
    HOSTS.forEach((_h: Host, i) => {
      let fam: Fam = "mid";
      if (phase.name === "check") fam = i === target ? "ok" : i === 0 ? "mid" : "warn";
      if ((phase.name === "data-out" && i === target && clock.u > 0.9) || (phase.name === "done" && i === target)) fam = "lit";
      top.push(box(C, HOST_X[i] + HOST.w - 7, HOST.y1, Z0 + 5, 3.5, 0.8, 2, fam, { key: 3, bevel: 0.2 }));
    });
    // ARP cache cards: one old entry for the gateway, one new
    const tx = -28, ty = 74;
    const cards: Item[] = [];
    cards.push(box(C, tx + 3, ty + 4, Z0 + 1, 12, 0.8, 7, "hi", { key: 0 }));
    if (reached("rep-out") || past("rep-out")) {
      const fresh = phase.name === "cache" || phase.name === "rep-out";
      cards.push(box(C, tx + 3, ty + 10, Z0 + 1, 12, 0.8, 9, fresh ? "sig" : HF[target], { key: 1 }));
      cards.push(faceText(C, `.${HOSTS[target].ip.split(".")[3]}`, [tx + 9, ty + 10.8, Z0 + 6], "+y", 2.6, "ink", { key: 1.1, weight: 700 }));
    }
    return { pulses, top: sortItems(top), cards: sortItems(cards) };
  }, [phase, clock, target]); // eslint-disable-line react-hooks/exhaustive-deps

  const T = HOSTS[target];
  const cached = past("rep-out") || reached("rep-out");
  const onKey = (e: React.KeyboardEvent) => {
    poke();
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { start(target === 2 ? 1 : 2); e.preventDefault(); }
    if (e.key === " " || e.key === "Enter") { start(target); e.preventDefault(); }
  };

  return (
    <div>
      <Card
        n={5}
        title="ARP on a switch"
        hint="← → change target · space replay"
        readout={<>{phase.say.split(" · ").map((s, i) => (i === 0 ? <b key={i}>{s}</b> : <span key={i}> · {s}</span>))}</>}
        viewBox={vb}
        label="A switch cabled to three hosts. Host A broadcasts an ARP request; the switch floods it to the other hosts and learns A's port; the target replies by unicast; A stores the answer in its ARP cache; the data frame then goes out a single port."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={back} />
        <Items items={dyn.pulses} />
        <Items items={front} />
        <Items items={dyn.top} />
        <Items items={dyn.cards} />
      </Card>
      <div className="controls">
        <div className="seg">
          {[1, 2].map((i) => (
            <button key={i} className={target === i ? "on" : ""} onClick={() => { poke(); start(i); }}>
              <span className="c-blue">A</span> → <span className={`c-${HF[i]}`}>{HOSTS[i].id}</span> ({HOSTS[i].ip})
            </button>
          ))}
        </div>
        <button className="pill-btn" onClick={() => { poke(); start(target); }}>↻ Replay</button>
      </div>
      <div className="table-wrap">
        <table className="mono" style={{ fontSize: 13 }}>
          <thead><tr><th>A's ARP cache</th><th>MAC</th><th>Type</th></tr></thead>
          <tbody>
            <tr><td>10.0.0.1 (gateway)</td><td>00:1a:2b:3c:4d:01</td><td>dynamic</td></tr>
            {cached && <tr><td>{T.ip}</td><td>{T.mac}</td><td>dynamic (new)</td></tr>}
          </tbody>
        </table>
      </div>
      <Legend items={[
        { swatch: "blue", text: "Host A (asker)" },
        { swatch: "violet", text: "Host B" },
        { swatch: "teal", text: "Host C" },
        { swatch: "sig", text: "ARP request (broadcast)" },
        { swatch: "ok", text: "ARP reply (unicast) · NIC accepts" },
        { swatch: "rose", text: "Data frame" },
        { swatch: "warn", text: "NIC drops a frame not meant for it" },
      ]} />
      <p className="caption">
        The broadcast reaches every host on the segment; only the owner of the IP answers. The switch never reads IPs: it learns which MAC lives behind which port from the source address of every frame, and floods only when it doesn't know (or the destination is broadcast).
      </p>
    </div>
  );
}
