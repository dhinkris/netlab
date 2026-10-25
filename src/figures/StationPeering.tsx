import { useMemo, useRef, useState } from "react";
import {
  alongPath, box, boundsOf, camera, cyl, dotsItem, ease, faceText, halo, lerp, line3, prism, rrect, sortItems, tube,
  type Fam, type Item, type LineItem, type Seg, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useReducedMotion, useTour } from "../iso/live";
import { splitSay, useScript } from "../iso/script";

const C = camera(28, 30);
const PZ = 3; // plinth top
const HZ = 26; // habitat ring height (tube height)
type St = { id: string; name: string; cidr: string; x: number; y: number; fam: Fam };
const ST: St[] = [
  { id: "A", name: "vnet-a", cidr: "10.1.0.0/16", x: 30, y: 74, fam: "blue" },
  { id: "B", name: "vnet-b", cidr: "10.2.0.0/16", x: 112, y: 30, fam: "violet" },
  { id: "C", name: "vnet-c", cidr: "10.3.0.0/16", x: 194, y: 74, fam: "teal" },
  { id: "D", name: "vnet-d", cidr: "10.1.0.0/16", x: 112, y: 112, fam: "rose" },
];
const at = (id: string) => ST.find((s) => s.id === id)!;
/** Docking tube between two stations, ring edge to ring edge. */
function tubePath(a: St, b: St, upTo = 1): V3[] {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const p0: V3 = [a.x + ux * 14, a.y + uy * 14, HZ + 1], p1: V3 = [b.x - ux * 14, b.y - uy * 14, HZ + 1];
  return [p0, [lerp(p0[0], p1[0], upTo), lerp(p0[1], p1[1], upTo), HZ + 1]];
}

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-14, -6, 252, 142, 8);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, PZ, "sea", { key: -100, bevel: 1 }));
  // stars printed on the display base
  const stars: V3[] = [];
  for (let i = 0; i < 110; i++) stars.push([-10 + ((i * 67) % 244), -2 + ((i * 41) % 134), PZ]);
  it.push({ ...dotsItem(C, stars, 0.35, "hi", 0), key: -99 });
  it.push(faceText(C, "VNET PEERING · display models", [-8, 132, PZ], "top", 2.6, "hi", { anchor: "start", key: -98, weight: 700 }));
  ST.forEach((s) => {
    const k = (s.x + s.y) * 0.01;
    // stand
    it.push(box(C, s.x - 11, s.y - 6, PZ, 22, 12, 5, "mid", { key: k, bevel: 0.4 }));
    it.push(faceText(C, s.name, [s.x, s.y + 6, PZ + 3.4], "+y", 2.2, "hi", { key: k + 0.0002, weight: 700 }));
    it.push(faceText(C, s.cidr, [s.x, s.y + 6, PZ + 1.2], "+y", 1.8, s.id === "D" ? "warn" : "hi", { key: k + 0.0002, weight: 700 }));
    it.push(box(C, s.x - 1, s.y - 1, PZ + 5, 2, 2, HZ - 13, "hi", { key: k + 0.0003 }));
    // station: core, habitat ring, dome, solar wings, antenna
    it.push(cyl(C, s.x, s.y, HZ - 8, 8, 8, "hi", { key: k + 0.0004, n: 26 }));
    it.push(cyl(C, s.x, s.y, HZ, 13, 2.4, s.fam, { key: k + 0.0005, n: 34, bevel: 0.4 }));
    it.push(cyl(C, s.x, s.y, HZ + 2.4, 7, 4, "hi", { key: k + 0.0006, n: 26 }));
    it.push(cyl(C, s.x, s.y, HZ + 6.4, 4, 2, s.fam, { key: k + 0.0007, n: 20 }));
    for (const dir of [-1, 1]) {
      const x0 = dir < 0 ? s.x - 30 : s.x + 14;
      it.push(box(C, x0, s.y - 5, HZ + 9, 16, 10, 0.5, "lo", { key: k + 0.0008, bevel: 0.1 }));
      let grid = "";
      for (let gx = x0 + 4; gx < x0 + 16; gx += 4) grid += line3(C, [[gx, s.y - 5, HZ + 9.5], [gx, s.y + 5, HZ + 9.5]]);
      grid += line3(C, [[x0, s.y, HZ + 9.5], [x0 + 16, s.y, HZ + 9.5]]);
      it.push({ kind: "line", d: grid, tone: "sea", w: 0.4, layer: 0, key: k + 0.0009 } as LineItem);
      it.push(box(C, dir < 0 ? s.x - 14 : s.x + 7, s.y - 0.5, HZ + 9, 7, 1, 0.6, "mid", { key: k + 0.00085 }));
    }
    it.push(box(C, s.x - 0.4, s.y - 0.4, HZ + 8.4, 0.8, 0.8, 7, "mid", { key: k + 0.001 }));
  });
  return sortItems(it);
}

// ---------- script ----------

type Pod = { path: V3[]; u: number; fam: Fam };
type Fr = { pod: Pod | null; links: { a: string; b: string; upTo: number; bad?: boolean }[]; say: string };
type Scene = "AB" | "BC" | "AC" | "peerAC" | "peerAD";

function script(sc: Scene, acPeered: boolean): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  const base = [{ a: "A", b: "B", upTo: 1 }, { a: "B", b: "C", upTo: 1 }, ...(acPeered ? [{ a: "A", b: "C", upTo: 1 }] : [])];
  const F = (p: Partial<Fr>): Fr => ({ pod: null, links: base, say: "", ...p });
  const fly = (a: string, b: string, fam: Fam, say: string, links = base, d = 1.6) => segs.push({ d, f: (u) => F({ pod: { path: tubePath(at(a), at(b)), u: ease(u), fam }, links, say }) });
  if (sc === "AB") { fly("A", "B", "blue", "vnet-a → vnet-b · peered directly: private, over Microsoft's backbone"); segs.push({ d: 1.2, f: () => F({ say: "Delivered · peered VNets talk as if they were one network" }) }); }
  else if (sc === "BC") { fly("B", "C", "violet", "vnet-b → vnet-c · peered directly"); segs.push({ d: 1.2, f: () => F({ say: "Delivered" }) }); }
  else if (sc === "AC" && acPeered) { fly("A", "C", "blue", "vnet-a → vnet-c · now there's a direct peering", base, 2.2); segs.push({ d: 1.2, f: () => F({ say: "Delivered over the direct A–C peering" }) }); }
  else if (sc === "AC") {
    fly("A", "B", "blue", "vnet-a → vnet-c? · the only tube leads to vnet-b");
    segs.push({ d: 1.6, f: () => F({ pod: { path: tubePath(at("A"), at("B")), u: 1, fam: "warn" }, say: "Stuck at vnet-b · peering is NOT transitive: B won't forward A's traffic to C" }) });
    segs.push({ d: 1.0, f: (u) => F({ pod: { path: tubePath(at("A"), at("B")), u: 1 - ease(u), fam: "warn" }, say: "Fix: peer A ↔ C directly, or route through a hub firewall (next lesson)" }) });
  } else if (sc === "peerAC") {
    segs.push({ d: 1.6, f: (u) => F({ links: [...base.filter((l) => !(l.a === "A" && l.b === "C")), { a: "A", b: "C", upTo: ease(u) }], say: "Building a peering A ↔ C · each side creates its half of the link" }) });
    segs.push({ d: 1.2, f: () => F({ links: [...base.filter((l) => !(l.a === "A" && l.b === "C")), { a: "A", b: "C", upTo: 1 }], say: "Connected · status Connected on both sides" }) });
  } else {
    segs.push({ d: 1.4, f: (u) => F({ links: [...base, { a: "A", b: "D", upTo: ease(u) * 0.45 }], say: "Trying to peer vnet-a ↔ vnet-d" }) });
    segs.push({ d: 1.8, f: () => F({ links: [...base, { a: "A", b: "D", upTo: 0.45, bad: true }], say: "Refused · both use 10.1.0.0/16 · overlapping address spaces can't be peered" }) });
    segs.push({ d: 0.8, f: (u) => F({ links: [...base, { a: "A", b: "D", upTo: 0.45 * (1 - u), bad: true }], say: "Refused · re-address one VNet first" }) });
  }
  return segs;
}

function liveItems(fr: Fr): Item[] {
  const it: Item[] = [];
  fr.links.forEach((l, k) => {
    if (l.upTo < 0.01) return;
    const p = tubePath(at(l.a), at(l.b), l.upTo);
    it.push(...tube(C, p, l.bad ? "warn" : "mid", k * 0.1, 4.4));
    // docking collars at each ring
    if (l.upTo > 0.98) for (const q of [p[0], p[1]]) it.push(cyl(C, q[0], q[1], HZ - 0.8, 3, 3.6, "mid", { key: k * 0.1 + 0.05, n: 14 }));
    if (l.bad) {
      const m = p[1];
      it.push({ kind: "line", d: line3(C, [[m[0] - 3, m[1] - 3, HZ + 6], [m[0] + 3, m[1] + 3, HZ + 6]]) + line3(C, [[m[0] - 3, m[1] + 3, HZ + 6], [m[0] + 3, m[1] - 3, HZ + 6]]), tone: "warn", w: 1.4, layer: 0, key: 5 } as LineItem);
    }
  });
  if (fr.pod) {
    const [x, y] = alongPath(fr.pod.path, fr.pod.u);
    it.push(cyl(C, x, y, HZ - 0.2, 2.6, 3, fr.pod.fam, { key: 9, n: 16, bevel: 0.3 }));
  }
  return it;
}

export function StationPeering() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [scene, setScene] = useState<Scene>("AC");
  const [acPeered, setAcPeered] = useState(false);
  const [run, setRun] = useState(0);
  const tour = useRef(0);

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const segs = useMemo(() => script(scene, acPeered && scene !== "peerAC"), [scene, acPeered]);
  const fr = useScript(segs, run, inView, reduced, { pod: null, links: [], say: "" } as Fr);

  const go = (s: Scene) => { if (s === "peerAC") setAcPeered(true); setScene(s); setRun((r) => r + 1); };
  const poke = useTour(() => {
    const seq: Scene[] = ["AB", "AC", "peerAD", "peerAC", "AC"];
    const s = seq[++tour.current % seq.length];
    if (s === "AB" && tour.current % 5 === 0) setAcPeered(false);
    go(s);
  }, inView && !reduced, 5.5, 6);

  const dyn = useMemo(() => sortItems(liveItems(fr)), [fr]);
  const { head, rest } = splitSay(fr.say);
  return (
    <div>
      <Card
        n={23}
        title="Docking stations"
        hint="send a pod · build or refuse a peering"
        readout={<><b>{head}</b>{rest.map((s, i) => <span key={i}> · {s}</span>)}</>}
        viewBox={vb}
        label="Model space stations on display stands, one per VNet, joined by docking tubes that stand for peerings. Pods travel A to B and B to C, but a pod from A to C stops at B because peering is not transitive. Building a direct A–C tube fixes it; a tube to vnet-d is refused because its address space overlaps vnet-a's."
        onKeyDown={() => poke()}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={dyn} />
      </Card>
      <div className="controls">
        <div className="seg">
          <button className={scene === "AB" ? "on" : ""} onClick={() => { poke(); go("AB"); }}>A → B</button>
          <button className={scene === "BC" ? "on" : ""} onClick={() => { poke(); go("BC"); }}>B → C</button>
          <button className={scene === "AC" ? "on" : ""} onClick={() => { poke(); go("AC"); }}>A → C</button>
        </div>
        <button className="pill-btn" onClick={() => { poke(); if (acPeered) { setAcPeered(false); go("AC"); } else go("peerAC"); }}>{acPeered ? "Remove A ↔ C peering" : "Peer A ↔ C"}</button>
        <button className="pill-btn" onClick={() => { poke(); go("peerAD"); }}>Peer A ↔ D (overlap)</button>
      </div>
      <Legend items={[
        ...ST.map((s) => ({ swatch: s.fam as string, text: `${s.name} ${s.cidr}` })),
        { swatch: "hi", text: "Peering (docking tube)" },
      ]} />
      <p className="caption">
        Each tube is a peering: private traffic between two VNets over Microsoft's backbone, with no gateway in the path. Tubes only connect the two stations they join; there is no "through traffic" across a station.
      </p>
    </div>
  );
}
