import { useMemo, useRef, useState } from "react";
import {
  alongPath, blob, box, boundsOf, camera, dotsItem, ease, faceText, halo, line3, planeMatrix, prism, rotRect,
  rrect, sortItems, type Fam, type Item, type LineItem, type TextItem, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { ASES, LINKS, linkKey, ORIGIN, PREFIX, propagate, VIEWER, type Boat } from "../models/bgp";

const C = camera(6, 56);
const SEA = 3;
const ISL = [
  { x: 0, y: 58, r: 20, seed: 1.2 },
  { x: 66, y: 4, r: 19, seed: 2.6 },
  { x: 70, y: 106, r: 19, seed: 3.9 },
  { x: 136, y: 56, r: 20, seed: 5.1 },
  { x: 208, y: 40, r: 22, seed: 0.4 },
];
const AS_FAM: Fam[] = ["rose", "blue", "violet", "teal", "sig"];
const AS_CLS = ["rose", "blue", "violet", "teal", "amber"];
const ROUND_S = 2.1;

/** Lane between two islands: from beach to beach, sitting on the water. */
function lane(a: number, b: number): V3[] {
  const A = ISL[a], B = ISL[b];
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L;
  return [[A.x + ux * (A.r + 2), A.y + uy * (A.r + 2), SEA + 0.1], [B.x - ux * (B.r + 2), B.y - uy * (B.r + 2), SEA + 0.1]];
}

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-30, -24, 268, 156, 10);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, SEA, "sea", { key: -100, bevel: 1.2 }));
  // waves
  let waves = "";
  for (let i = 0; i < 120; i++) {
    const x = -24 + ((i * 61) % 256), y = -18 + ((i * 43) % 144);
    if (ISL.some((s) => Math.hypot(s.x - x, s.y - y) < s.r + 5)) continue;
    waves += line3(C, [[x - 2.4, y, SEA], [x - 0.8, y - 0.8, SEA], [x + 0.8, y, SEA], [x + 2.4, y - 0.8, SEA]]);
  }
  it.push({ kind: "line", d: waves, tone: "blue", w: 0.45, layer: 0, key: -99 } as LineItem);
  // islands: beach, grass, hill, harbour house, flag
  ISL.forEach((s, i) => {
    const k = -80 + (s.x + s.y) * 0.001;
    it.push(prism(C, blob(s.x, s.y, s.r, s.r * 0.86, s.seed, 0.14), SEA, 2, "sand", { key: k }));
    it.push(prism(C, blob(s.x - 1, s.y - 1, s.r * 0.76, s.r * 0.64, s.seed + 1, 0.14), SEA + 2, 1.4, "moss", { key: k + 0.0001 }));
    it.push(prism(C, blob(s.x - 6, s.y - 5, s.r * 0.32, s.r * 0.28, s.seed + 2, 0.1), SEA + 3.4, 2, "moss", { key: k + 0.0002 }));
    it.push(box(C, s.x + 2, s.y - 7, SEA + 3.4, 9, 7, 6, "hi", { key: k + 0.0003, bevel: 0.3 }));
    it.push(box(C, s.x + 1.5, s.y - 7.5, SEA + 9.4, 10, 8, 1.2, AS_FAM[i], { key: k + 0.0004, bevel: 0.2 }));
    it.push(box(C, s.x - 10, s.y + 2, SEA + 3.4, 1, 1, 13, "hi", { key: k + 0.0005 }));
    it.push(box(C, s.x - 9, s.y + 2.1, SEA + 11.6, 13, 0.6, 4.6, AS_FAM[i], { key: k + 0.0006 }));
    it.push(faceText(C, `AS${ASES[i].asn}`, [s.x - 2.5, s.y + 2.7, SEA + 13.9], "+y", 2.2, "ink", { key: k + 0.0007, weight: 700 }));
    const sub = i === ORIGIN ? PREFIX : ASES[i].role.toUpperCase();
    it.push(faceText(C, sub, [s.x, s.y + s.r * 0.86 - 1.4, SEA + 2], "top", 2.2, "ink", { key: k + 0.0008, weight: 700 }));
  });
  return sortItems(it);
}

function laneItems(cut: Set<string>, chosen: Set<string>): Item[] {
  const it: Item[] = [];
  LINKS.forEach(([a, b]) => {
    const p = lane(a, b);
    const key = linkKey(a, b);
    if (cut.has(key)) {
      it.push({ kind: "line", d: line3(C, p), tone: "warn", w: 0.6, layer: 0, key: 0, dash: "1.5 2" } as LineItem);
      const m: V3 = [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2, SEA];
      it.push({ kind: "line", d: line3(C, [[m[0] - 3, m[1] - 3, SEA + 0.2], [m[0] + 3, m[1] + 3, SEA + 0.2]]) + line3(C, [[m[0] - 3, m[1] + 3, SEA + 0.2], [m[0] + 3, m[1] - 3, SEA + 0.2]]), tone: "warn", w: 1.2, layer: 0, key: 0.1 } as LineItem);
      return;
    }
    const pts: V3[] = [];
    const L = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]);
    for (let d = 0; d <= L; d += 4) pts.push(alongPath(p, d / L));
    it.push({ ...dotsItem(C, pts, chosen.has(key) ? 0.9 : 0.6, chosen.has(key) ? "rose" : "sand", 0), key: 0.2 });
  });
  return it;
}

function boatItems(b: Boat, u: number): Item[] {
  const p = lane(b.from, b.to);
  const at = alongPath(p, ease(u));
  const a = Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]);
  const ca = Math.cos(a), sa = Math.sin(a);
  const it: Item[] = [];
  it.push(prism(C, rotRect(at[0], at[1], 13, 5.6, a), SEA, 2, "hi", { key: 0, bevel: 0.3 }));
  it.push(prism(C, rotRect(at[0] - ca * 2.5, at[1] - sa * 2.5, 4.6, 3.6, a), SEA + 2, 2, "mid", { key: 0.1 }));
  it.push(box(C, at[0] + ca * 2 - 0.5, at[1] + sa * 2 - 0.5, SEA + 2, 1, 1, 4 + b.path.length * 3, "hi", { key: 0.2 }));
  // AS-path flags on the mast, nearest AS on top
  b.path.forEach((asIdx, k) => {
    const z = SEA + 4 + (b.path.length - 1 - k) * 3;
    it.push(box(C, at[0] + ca * 2 + 0.5, at[1] + sa * 2 - 0.3, z, 7, 0.6, 2.6, AS_FAM[asIdx], { key: 0.3 + k * 0.01 }));
  });
  const t: TextItem = {
    kind: "text", text: b.path.map((i) => ASES[i].asn).join(" "), size: 2, tone: "lit", anchor: "middle", weight: 700, mono: true, layer: 0, key: 0.5,
    // keep the text upright whichever way the boat sails
    matrix: ca >= 0
      ? planeMatrix(C, [at[0] - sa * 5.6, at[1] + ca * 5.6, SEA + 0.2], [ca, sa, 0], [-sa, ca, 0])
      : planeMatrix(C, [at[0] - sa * 5.6, at[1] + ca * 5.6, SEA + 0.2], [-ca, -sa, 0], [sa, -ca, 0]),
  };
  it.push(t);
  return sortItems(it);
}

export function Archipelago() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [cut, setCut] = useState<Set<string>>(new Set());
  const [run, setRun] = useState(0);
  const [clock, setClock] = useState(0);
  const live = useRef({ t: 0, run: -1, done: false, tour: 0 });

  const sim = useMemo(() => propagate(cut), [cut]);
  const total = sim.rounds.length * ROUND_S + 0.6;
  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);

  const toggle = (k: string) => { setCut((c) => { const n = new Set(c); if (n.has(k)) n.delete(k); else n.add(k); return n; }); setRun((r) => r + 1); };
  const TOUR = [linkKey(4, 1), linkKey(3, 1), ""];
  const poke = useTour(() => {
    const k = TOUR[live.current.tour++ % TOUR.length];
    if (k) toggle(k); else { setCut(new Set()); setRun((r) => r + 1); }
  }, inView && !reduced, total + 2.5, 6);

  useLoop((_t, dt) => {
    const L = live.current;
    if (L.run !== run) { L.run = run; L.t = 0; L.done = false; }
    if (L.done) return;
    L.t = reduced ? total : Math.min(total, L.t + dt);
    setClock(L.t);
    if (L.t >= total) L.done = true;
  }, inView);

  // what each AS has learned by now
  const roundNow = Math.floor(clock / ROUND_S);
  const u = (clock % ROUND_S) / (ROUND_S * 0.8);
  const learned: (number[] | null)[] = ASES.map((_, i) => (i === ORIGIN ? [] : null));
  sim.rounds.slice(0, Math.min(roundNow, sim.rounds.length)).forEach((boats) => boats.forEach((b) => { if (b.accepted) learned[b.to] = b.path; }));
  const done = clock >= total - 0.01;
  const viewerPath = learned[VIEWER];
  const chosen = new Set<string>();
  if (viewerPath) { let prev = VIEWER; for (const hop of viewerPath) { chosen.add(linkKey(prev, hop)); prev = hop; } }

  const dyn = useMemo(() => {
    const boats: Item[] = [];
    const cur = sim.rounds[roundNow];
    if (cur && u <= 1) cur.forEach((b) => boats.push(...boatItems(b, Math.min(1, u))));
    // best-path plates on each beach
    const plates: Item[] = [];
    ASES.forEach((_, i) => {
      if (i === ORIGIN) return;
      const s = ISL[i];
      const p = learned[i];
      // the island's chosen path, painted on the water beside its beach
      plates.push(faceText(C, p ? `best: ${p.map((k) => ASES[k].asn).join(" ")}` : "no route yet", [s.x - s.r, s.y + s.r + 5, SEA], "top", 2.4, p ? AS_FAM[i] : "mid", { anchor: "start", key: 0, weight: 700 }));
    });
    return { lanes: laneItems(cut, done ? chosen : new Set()), boats, plates };
  }, [clock, cut, sim]); // eslint-disable-line react-hooks/exhaustive-deps

  const cur = sim.rounds[roundNow];
  let say: React.ReactNode;
  if (!done && cur) {
    const rej = cur.filter((b) => !b.accepted).length;
    say = <><b>Round {roundNow + 1}</b> · {cur.length} announcement{cur.length > 1 ? "s" : ""} at sea{rej ? ` · ${rej} will be ignored (longer or looping path)` : ""}</>;
  } else if (viewerPath) {
    say = <><b className="c-rose">AS{ASES[VIEWER].asn} reaches {PREFIX}</b> · via AS path {viewerPath.map((k) => ASES[k].asn).join(" ")} ({viewerPath.length} hop{viewerPath.length > 1 ? "s" : ""})</>;
  } else say = <><b className="c-rose">No route</b> · every path to {PREFIX} is cut</>;

  const onKey = (e: React.KeyboardEvent) => {
    poke();
    const k = Number(e.key);
    if (k >= 1 && k <= LINKS.length) toggle(linkKey(...LINKS[k - 1]));
    if (e.key === "0") { setCut(new Set()); setRun((r) => r + 1); }
  };

  return (
    <div>
      <Card
        n={12}
        title="Archipelago"
        hint="1–6 cut / restore a link · 0 restore all"
        readout={say}
        viewBox={vb}
        label="Five island autonomous systems on a sea, joined by ferry lanes. The origin island announces a prefix; boats carry the announcement outward with a flag added for each AS it passes. Each island keeps the shortest AS path it hears. Cutting lanes forces the network to settle on a longer path."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={dyn.lanes} />
        <Items items={dyn.plates} />
        <Items items={dyn.boats} />
      </Card>
      <div className="controls">
        {LINKS.map(([a, b], i) => {
          const k = linkKey(a, b);
          return (
            <button key={k} className="pill-btn" onClick={() => { poke(); toggle(k); }} style={{ textDecoration: cut.has(k) ? "line-through" : undefined, opacity: cut.has(k) ? 0.6 : 1 }}>
              {i + 1} <span className={`c-${AS_CLS[a]}`}>{ASES[a].asn}</span>–<span className={`c-${AS_CLS[b]}`}>{ASES[b].asn}</span>
            </button>
          );
        })}
        <button className="pill-btn" onClick={() => { poke(); setCut(new Set()); setRun((r) => r + 1); }}>Restore all</button>
      </div>
      <Legend items={[
        { swatch: "sig", text: `Origin AS64510 announces ${PREFIX}` },
        { swatch: "rose", text: "AS64500 (you) · lit lanes = chosen path" },
        { swatch: "sand", text: "Peering lane" },
        { swatch: "warn", text: "Cut link" },
      ]} />
      <p className="caption">
        Each boat's flags are the AS path: every AS adds its own number before passing the route on. An island ignores a route that is longer than the one it has, or that already contains its own number (that's how BGP avoids loops). Real BGP also weighs local preference and policy before path length; here every AS simply prefers the shortest path.
      </p>
    </div>
  );
}
