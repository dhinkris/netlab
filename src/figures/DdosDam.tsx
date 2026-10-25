import { useMemo, useRef, useState } from "react";
import {
  alongPath, blob, box, boundsOf, camera, dotsItem, faceText, halo, line3, pathOf, prism, proj, rrect, smoothPath, sortItems,
  type Fam, type Item, type LineItem, type Solid, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { follow, useInView, useLoop, useReducedMotion, useTour } from "../iso/live";

const C = camera(26, 36);
const GZ = 6, WZ = 3.4;
const DAM_X = 122;
const MAIN: V3[] = smoothPath([[236, 44, WZ], [180, 40, WZ], [DAM_X, 42, WZ], [70, 44, WZ], [40, 42, WZ]], 3);
const DIVERT: V3[] = smoothPath([[DAM_X - 2, 50, WZ], [104, 70, WZ], [86, 88, WZ], [66, 96, WZ]], 3);
const BEFORE = MAIN.filter((p) => p[0] >= DAM_X);
const AFTER = MAIN.filter((p) => p[0] <= DAM_X);

function flat(pts: V3[], fam: Fam, key: number, edge = false): Solid {
  const d = pathOf(pts.map((p) => proj(C, p)), true);
  return { kind: "solid", faces: [{ d, fill: `var(--${fam}-t)` }], creases: "", outline: edge ? d : "", layer: 0, key };
}
function band(path: V3[], w: number, z: number): V3[] {
  const L = path.length;
  const off = (s: number) => path.map((p, i) => {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(L - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / n) * s, p[1] + (dx / n) * s, z] as V3;
  });
  return [...off(w), ...off(-w).reverse()];
}

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-14, -6, 262, 118, 8);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, GZ - 1, "sand", { key: -100, bevel: 1 }));
  it.push(prism(C, rrect(-13, -5, 260, 116, 7.5), GZ - 1, 1, "moss", { key: -99 }));
  // river, spillway channel and scrubbing basin, cut into the grass
  it.push(flat(band(MAIN, 11, GZ + 0.02), "sea", -98));
  it.push(flat(band(DIVERT, 7, GZ + 0.03), "sea", -97.9));
  it.push(flat(blob(58, 98, 22, 9, 1.3, 0.08).pts.map(([x, y]): V3 => [x, y, GZ + 0.04]), "sea", -97.8, true));
  it.push(faceText(C, "SCRUBBING BASIN", [58, 108, GZ], "top", 2.4, "teal", { key: -97.7, weight: 700 }));
  // mountains on the right: the internet
  for (const [x, y, r, s] of [[226, 12, 16, 1], [244, 30, 12, 2], [222, 74, 14, 3], [242, 86, 11, 4]] as const) {
    for (let l = 0; l < 3; l++) it.push(prism(C, blob(x, y, r * (1 - l * 0.28), r * 0.8 * (1 - l * 0.28), s + l, 0.12), GZ + l * 4, 4, l === 2 ? "hi" : "sand", { key: -80 + x * 0.001 + y * 0.0001 + l * 0.00001 }));
  }
  it.push(faceText(C, "INTERNET", [232, 58, GZ], "top", 3, "sig", { key: -79, weight: 700 }));
  // the town: the web app
  const houses = [[2, 14, 12, 10, 9], [18, 10, 10, 12, 12], [4, 62, 14, 10, 8], [20, 66, 10, 10, 11], [-6, 32, 10, 8, 7]];
  houses.forEach(([x, y, w, d, h], k) => {
    it.push(box(C, x, y, GZ, w, d, h, "hi", { key: -60 + (x + y) * 0.001, bevel: 0.3 }));
    it.push(box(C, x - 0.5, y - 0.5, GZ + h, w + 1, d + 1, 1.2, k % 2 ? "warn" : "sand", { key: -59.9 + (x + y) * 0.001 }));
  });
  it.push(box(C, 6, 28, GZ, 24, 22, 16, "blue", { key: -50, bevel: 0.5 }));
  it.push(faceText(C, "WEB APP", [18, 50, GZ + 9], "+y", 3, "ink", { key: -49.9, weight: 700 }));
  // dam: wall with buttresses, a crest walkway
  it.push(box(C, DAM_X - 4, 24, GZ - 2.6, 8, 38, 16, "hi", { key: 0, bevel: 0.4 }));
  for (const y of [26, 38, 50, 58]) it.push(box(C, DAM_X - 8, y, GZ - 2.6, 4, 3, 10, "mid", { key: 0.1 + y * 0.001, shift: [3, 0] }));
  it.push(box(C, DAM_X - 5, 23, GZ + 13.4, 10, 40, 1.4, "sand", { key: 0.2 }));
  it.push(faceText(C, "AZURE DDOS PROTECTION", [DAM_X - 3.5, 43, GZ + 14.8], "top", 1.9, "ink", { key: 0.3, weight: 700 }));
  return sortItems(it);
}

const N_BASE = 26, N_ATTACK = 90;

export function DdosDam() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [attack, setAttack] = useState(false);
  const [prot, setProt] = useState(true);
  const S = useRef({ t: 0, surge: 0, flood: 0, gate: 0, tour: 0 });
  const [, setTick] = useState(0);

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);

  const poke = useTour(() => {
    const seq: [boolean, boolean][] = [[true, false], [false, false], [true, true], [false, true]];
    const [a, p] = seq[++S.current.tour % seq.length];
    setAttack(a); setProt(p);
  }, inView && !reduced, 6, 6);

  useLoop((_t, dt) => {
    const s = S.current;
    s.t += reduced ? 0 : dt;
    s.surge = follow(s.surge, attack ? 1 : 0, dt, 0.6);
    // protection notices the surge above the learned baseline and opens the spillway
    s.gate = follow(s.gate, prot && s.surge > 0.25 ? 1 : 0, dt, 0.35);
    const reaching = s.surge * (1 - s.gate);
    s.flood = follow(s.flood, reaching > 0.3 ? 1 : 0, dt, 1.2);
    setTick((k) => (k + 1) % 1e6);
  }, inView);

  const s = S.current;
  const dyn: Item[] = [];
  // legitimate traffic: steady, always reaches the town
  const legit: V3[] = [];
  for (let i = 0; i < N_BASE; i++) legit.push(alongPath(MAIN, ((s.t * 0.12 + i / N_BASE) % 1)));
  dyn.push({ ...dotsItem(C, legit.map(([x, y]) => [x, y + Math.sin(x * 0.3) * 4, WZ + 3] as V3), 1.1, "lit", 0), key: 10 });
  // attack traffic: many more particles, faster; split at the dam once mitigation is on
  const nA = Math.round(N_ATTACK * s.surge);
  const before: V3[] = [], after: V3[] = [], diverted: V3[] = [];
  for (let i = 0; i < nA; i++) {
    const u = (s.t * 0.3 + i / N_ATTACK) % 1;
    const jitter = ((i * 37) % 15) - 7; // scattered across the channel, not a neat line
    if (u < 0.5) { const p = alongPath(BEFORE, u * 2); before.push([p[0], p[1] + jitter, WZ + 3]); }
    else if ((i % 100) / 100 < s.gate) { const p = alongPath(DIVERT, (u - 0.5) * 2); diverted.push([p[0], p[1] + jitter * 0.5, WZ + 3]); }
    else { const p = alongPath(AFTER, (u - 0.5) * 2); after.push([p[0], p[1] + jitter, WZ + 3]); }
  }
  dyn.push({ ...dotsItem(C, [...before, ...after], 1.1, "warn", 0), key: 11 });
  dyn.push({ ...dotsItem(C, diverted, 1.1, "warn", 0), key: 11.5 });
  // spillway gate: rises as protection opens it
  dyn.push(box(C, DAM_X - 3, 46, GZ - 2.6 + s.gate * 12, 6, 8, 12, "teal", { key: 1, bevel: 0.3 }));
  // sensor lamp on the crest
  dyn.push(box(C, DAM_X - 2, 26, GZ + 14.8, 4, 4, 2, prot ? (s.surge > 0.25 ? "warn" : "ok") : "mid", { key: 2, bevel: 0.3 }));
  // flood water rising around the town when the attack gets through
  if (s.flood > 0.02) {
    const lvl = GZ + s.flood * 5;
    dyn.push({ ...flatBlob(lvl), key: 3 });
  }
  // the traffic meter: a column beside the river with the learned baseline marked
  const meter = 6 + s.surge * 34 * (1 - s.gate * 0.85);
  dyn.push(box(C, 150, 2, GZ, 6, 6, 42, "lo", { key: 4 }));
  dyn.push(box(C, 150.5, 7.6, GZ + 0.5, 5, 0.6, meter, s.surge > 0.25 && !(prot && s.gate > 0.5) ? "warn" : "ok", { key: 5 }));
  dyn.push({ kind: "line", d: line3(C, [[149, 8.2, GZ + 8], [157, 8.2, GZ + 8]]), tone: "sig", w: 0.8, layer: 0, key: 6 } as LineItem);
  dyn.push(faceText(C, "traffic to app", [153, 8.4, GZ + 44], "+y", 1.8, "mid", { key: 7, weight: 700 }));
  dyn.push(faceText(C, "baseline", [158, 8.4, GZ + 8], "+y", 1.6, "sig", { anchor: "start", key: 7 }));

  let say: React.ReactNode;
  if (!attack && s.surge < 0.1) say = <><b>Normal traffic</b> · the protection service learns this level as the baseline</>;
  else if (prot && s.gate > 0.5) say = <><b className="c-teal">Mitigating</b> · attack traffic diverted to scrubbing · real users still get through</>;
  else if (!prot && s.flood > 0.5) say = <><b className="c-rose">App overwhelmed</b> · the flood fills links and servers, so real users time out too</>;
  else say = <><b>Traffic surge</b> · far above the learned baseline</>;

  const onKey = (e: React.KeyboardEvent) => {
    poke();
    if (e.key === "a") setAttack((v) => !v);
    if (e.key === "p") setProt((v) => !v);
  };

  return (
    <div>
      <Card
        n={21}
        title="Flood dam"
        hint="a attack on/off · p protection on/off"
        readout={say}
        viewBox={vb}
        label="A river carries traffic from the internet's mountains to the web app's town. During an attack many more particles flood down; without protection the town floods. With DDoS protection the dam spots the surge above the learned baseline and opens a spillway gate that diverts attack traffic to a scrubbing basin, while normal traffic continues."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={dyn} />
      </Card>
      <div className="controls">
        <button className="pill-btn" onClick={() => { poke(); setAttack((v) => !v); }} style={{ borderColor: attack ? "var(--warn)" : undefined }}>
          Attack: {attack ? "ON" : "OFF"}
        </button>
        <button className="pill-btn" onClick={() => { poke(); setProt((v) => !v); }} style={{ borderColor: prot ? "var(--ok)" : undefined }}>
          DDoS Protection: {prot ? "ON" : "OFF"}
        </button>
      </div>
      <Legend items={[
        { swatch: "lit", text: "Legitimate traffic" },
        { swatch: "warn", text: "Attack traffic" },
        { swatch: "teal", text: "Spillway to scrubbing" },
        { swatch: "sig", text: "Learned baseline" },
      ]} />
      <p className="caption">
        A volumetric attack doesn't need a vulnerability: it just sends more than the target can absorb. Mitigation works upstream, at the edge of Microsoft's network, separating attack packets from real ones before they reach your public IP.
      </p>
    </div>
  );
}

function flatBlob(z: number): Solid {
  const pts = blob(16, 40, 34, 34, 2.2, 0.1).pts.map(([x, y]): V3 => [x, y, z]);
  const d = pathOf(pts.map((p) => proj(C, p)), true);
  return { kind: "solid", faces: [{ d, fill: "color-mix(in srgb, var(--sea-l) 70%, transparent)" }], creases: "", outline: "", layer: 0, key: 3 };
}
