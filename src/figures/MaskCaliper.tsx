import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, cyl, depthOf, dotsItem, faceText, halo, knurl, labelPlate, line3, lineItem, proj, rrect,
  screws, sortItems, ticksX, type Item, type LineItem, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { follow, useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { fmt, subnet } from "../models/cidr";
import type { Octets } from "../models/ip";

const C = camera(14, 40);

const P = 6; // one bit
const B0 = 4; // x of bit 0
const Z0 = 7; // bench top
const L = B0 + 32 * P + 6; // beam end
const BEAM = { y0: 10, y1: 19, z0: Z0 + 2.5, z1: Z0 + 5.5 };
const MIN = 8, MAX = 30;

const gapX = (n: number) => B0 + n * P - 1; // centre of the gap after bit n-1
const DIAL = { dx: -11, y: 14.5, r: 9.6 };

function benchItems(): Item[] {
  const it: Item[] = [];
  const bx = -18, by = -6, bw = L + 30, bd = 48;
  it.push(halo(C, rrect(bx, by, bw, bd, 5), 5));
  for (const [fx, fy] of [[bx + 7, by + 7], [bx + bw - 7, by + 7], [bx + 7, by + bd - 7], [bx + bw - 7, by + bd - 7]]) {
    it.push(cyl(C, fx, fy, 0, 3.5, 3, "lo", { key: -60 }));
  }
  it.push(box(C, bx, by, 3, bw, bd, Z0 - 3, "lo", { key: -50, r: 5, bevel: 1.2 }));
  it.push(screws(C, bx, by, bw, bd, Z0, 4));
  it.push(...ticksX(C, bx + 10, bx + bw - 10, by + bd - 7, Z0, 4, 3, 5));
  it.push(lineItem(C, [[bx + 10, by + bd - 3.5, Z0], [bx + bw - 10, by + bd - 3.5, Z0]], "lo", 0.4));
  it.push(...labelPlate(C, L - 24, 33, Z0, 22, 6));
  // beam supports (V-blocks) at both ends, outside the slider's travel
  for (const x of [-12, L - 7]) {
    it.push(box(C, x, BEAM.y0 - 2, Z0, 7, BEAM.y1 - BEAM.y0 + 4, BEAM.z0 - Z0, "mid", { key: -10, bevel: 0.5 }));
    it.push(dotsItem(C, [[x + 1.4, BEAM.y1 + 1.2, BEAM.z0], [x + 5.6, BEAM.y1 + 1.2, BEAM.z0]], 0.35, "mid", 0, true));
  }
  // bit bed
  it.push(box(C, B0 - 3, 22, Z0, 32 * P + 4, 8, 1, "mid", { key: -5, r: 0.8 }));
  it.push(lineItem(C, [[B0 - 1.5, 29, Z0 + 1], [B0 + 32 * P - 0.5, 29, Z0 + 1]], "faint", 0.35, 0, -4.9));
  // octet separators engraved on the bit bed
  for (const k of [8, 16, 24]) {
    it.push(lineItem(C, [[gapX(k), 22.6, Z0 + 1], [gapX(k), 29.4, Z0 + 1]], "mid", 0.5, 0, -4.8));
  }
  // fixed jaw, bolted to the left end of the beam
  it.push(box(C, -10, BEAM.y0 - 1, BEAM.z0, 9, BEAM.y1 - BEAM.y0 + 2, 4.2, "hi", { key: 1, bevel: 0.5 }));
  it.push(box(C, -2.6, BEAM.y1 + 1, BEAM.z0 - 0.4, 1.6, 17, 3.6, "blue", { key: 2, bevel: 0.3 }));
  it.push(dotsItem(C, [[-8, BEAM.y0 + 1.5, BEAM.z0 + 4.2], [-3, BEAM.y0 + 1.5, BEAM.z0 + 4.2], [-8, BEAM.y1 - 0.5, BEAM.z0 + 4.2], [-3, BEAM.y1 - 0.5, BEAM.z0 + 4.2]], 0.45, "mid", 0, true));
  return sortItems(it).map((i) => ({ ...i, layer: 0 }));
}

/** Beam segment from x0 to x1 with its ticks and labels. */
function beamPiece(x0: number, x1: number, key: number, endCap: boolean): Item[] {
  if (x1 - x0 < 0.2) return [];
  const it: Item[] = [];
  it.push(box(C, x0, BEAM.y0, BEAM.z0, x1 - x0, BEAM.y1 - BEAM.y0, BEAM.z1 - BEAM.z0, "mid", { key, layer: 1 }));
  let minor = "", major = "";
  for (let k = 0; k <= 32; k++) {
    const x = gapX(k);
    if (x < x0 + 0.3 || x > x1 - 0.3) continue;
    const big = k % 8 === 0;
    const s = line3(C, [[x, BEAM.y1, BEAM.z1], [x, BEAM.y1 - (big ? 4.5 : 2.4), BEAM.z1]]);
    if (big) major += s; else minor += s;
  }
  it.push({ kind: "line", d: minor, tone: "lo", w: 0.4, layer: 1, key: key + 0.1 } as LineItem);
  it.push({ kind: "line", d: major, tone: "hi", w: 0.55, layer: 1, key: key + 0.1 } as LineItem);
  for (const k of [0, 8, 16, 24, 32]) {
    const x = gapX(k);
    if (x < x0 + 3 || x > x1 - 3) continue;
    it.push(faceText(C, `/${k}`, [x, BEAM.y0 + 2.6, BEAM.z1], "top", 3.4, "hi", { layer: 1, key: key + 0.2, weight: 600 }));
  }
  if (endCap) it.push(box(C, x1, BEAM.y0 - 0.5, BEAM.z0 - 0.5, 1.4, BEAM.y1 - BEAM.y0 + 1, BEAM.z1 - BEAM.z0 + 1, "hi", { key: key + 0.3, layer: 1 }));
  return it;
}

function sliderItems(jx: number, h: number): Item[] {
  const it: Item[] = [];
  const sx0 = jx - 22, sx1 = jx + 1.6;
  const top = BEAM.z1 + 1.2;
  // body wraps the beam
  it.push(box(C, sx0, BEAM.y0 - 3, BEAM.z0 - 0.6, sx1 - sx0, BEAM.y1 - BEAM.y0 + 5, top - BEAM.z0 + 0.6, "hi", { key: 0, layer: 2, bevel: 0.6, r: 0.4 }));
  it.push(lineItem(C, [[sx0 + 1, BEAM.y1 + 2, top - 1.6], [sx1 - 1, BEAM.y1 + 2, top - 1.6]], "lo", 0.35, 2, 0.05));
  // moving jaw reaching across the bit bed
  it.push(box(C, jx, BEAM.y1 + 2, BEAM.z0 - 0.4, 1.6, 17, 3.6, "sig", { key: 0.2, layer: 2, bevel: 0.3 }));
  // thumb wheel on the front
  it.push(cyl(C, jx - 4.5, BEAM.y1 + 3.6, BEAM.z0 - 0.4, 1.8, 3.2, "mid", { key: 0.3, layer: 2 }));
  it.push({ ...knurl(C, jx - 4.5, BEAM.y1 + 3.6, BEAM.z0 - 0.4, 1.8, 3.2, 16), layer: 2, key: 0.31 });
  // lock screw at the back
  it.push(cyl(C, jx - 19, BEAM.y0 - 1.3, top, 1.3, 1.6, "mid", { key: 0.35, layer: 2 }));
  // dial gauge: bezel, face, ticks, needle, hub
  const dx = jx + DIAL.dx, dy = DIAL.y, r = DIAL.r;
  it.push(cyl(C, dx, dy, top, r + 1, 2.2, "mid", { key: 0.4, layer: 2, n: 40 }));
  it.push({ ...knurl(C, dx, dy, top, r + 1, 2.2, 44), layer: 2, key: 0.41 });
  const fz = top + 2.2;
  it.push(cyl(C, dx, dy, fz - 0.6, r, 0.6, "hi", { key: 0.42, layer: 2, n: 40 }));
  const ang = (k: number) => ((-225 + (k / 32) * 270) * Math.PI) / 180;
  let minor = "", major = "";
  for (let k = 0; k <= 32; k++) {
    const a = ang(k), big = k % 8 === 0;
    const r0 = r * (big ? 0.68 : 0.8), r1 = r * 0.93;
    const s = line3(C, [[dx + r0 * Math.cos(a), dy + r0 * Math.sin(a), fz], [dx + r1 * Math.cos(a), dy + r1 * Math.sin(a), fz]]);
    if (big) major += s; else minor += s;
  }
  it.push({ kind: "line", d: minor, tone: "lo", w: 0.3, layer: 2, key: 0.43 } as LineItem);
  for (const k of [0, 8, 16, 24, 32]) {
    const a = ang(k);
    it.push(faceText(C, String(k), [dx + r * 0.52 * Math.cos(a), dy + r * 0.52 * Math.sin(a), fz], "top", 1.7, "lit", { layer: 2, key: 0.435, weight: 600 }));
  }
  it.push({ kind: "line", d: major, tone: "lit", w: 0.45, layer: 2, key: 0.43 } as LineItem);
  // red-zone arc where no hosts fit (/31, /32)
  const arc: V3[] = [];
  for (let k = 0; k <= 10; k++) { const a = ang(1 * (k / 10)); arc.push([dx + r * 0.86 * Math.cos(a), dy + r * 0.86 * Math.sin(a), fz]); }
  it.push({ kind: "line", d: line3(C, arc), tone: "warn", w: 0.7, layer: 2, key: 0.44 } as LineItem);
  const a = ang(h);
  it.push({ kind: "line", d: line3(C, [[dx - 1.6 * Math.cos(a), dy - 1.6 * Math.sin(a), fz + 0.3], [dx + r * 0.84 * Math.cos(a), dy + r * 0.84 * Math.sin(a), fz + 0.3]]), tone: "rose", w: 0.7, layer: 2, key: 0.45 } as LineItem);
  it.push(cyl(C, dx, dy, fz, 0.9, 0.6, "lit", { key: 0.46, layer: 2, n: 16 }));
  it.push(faceText(C, "HOST BITS", [dx, dy + r * 0.3, fz], "top", 1.5, "mid", { layer: 2, key: 0.47 }));
  return it;
}

function bitItems(hs: number[], net: boolean[]): Item[] {
  return hs.map((h, k) =>
    box(C, B0 + k * P, 23.5, Z0 + 1, P - 2, 5, h, net[k] ? "blue" : "teal", { key: depthOf(C, [B0 + k * P, 26, Z0]), layer: 3, bevel: 0.3 }),
  );
}

export function MaskCaliper({ ip, onPrefix }: { ip: Octets; onPrefix?: (n: number) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [prefix, setPrefixRaw] = useState(24);
  const setPrefix = (n: number) => { const v = Math.max(MIN, Math.min(MAX, n)); setPrefixRaw(v); onPrefix?.(v); };
  const live = useRef({ jx: gapX(24), hs: Array.from({ length: 32 }, (_, k): number => (k < 24 ? 2.4 : 0.9)), tour: 0 });
  const [frame, setFrame] = useState({ jx: gapX(24), hs: live.current.hs });

  const bench = useMemo(() => benchItems(), []);
  const vb = useMemo(() => {
    const all = [...bench, ...sliderItems(gapX(MAX), 0), ...sliderItems(gapX(MIN), 0)];
    const b = boundsOf(all, 8);
    return `${b.x} ${b.y} ${b.w} ${b.h}`;
  }, [bench]);

  const TOUR = [24, 16, 20, 26, 28, 30, 8, 22];
  const poke = useTour(() => {
    live.current.tour = (live.current.tour + 1) % TOUR.length;
    setPrefix(TOUR[live.current.tour]);
  }, inView && !reduced, 3, 8);

  useLoop((_t, dt) => {
    const Lv = live.current;
    const tau = reduced ? 0.001 : 0.2;
    const tj = gapX(prefix);
    const jx = follow(Lv.jx, tj, dt, tau);
    let moving = Math.abs(jx - tj) > 0.02;
    const hs = Lv.hs.map((h, k) => {
      // a bit rises once the jaw has passed it
      const tgt = gapX(k + 1) <= jx + 0.5 ? 2.4 : 0.9;
      const v = follow(h, tgt, dt, 0.1);
      if (Math.abs(v - tgt) > 0.01) { moving = true; return v; }
      return tgt;
    });
    if (moving || jx !== Lv.jx) {
      Lv.jx = Math.abs(jx - tj) > 0.02 ? jx : tj;
      Lv.hs = hs;
      setFrame({ jx: Lv.jx, hs });
    }
  }, inView);

  const dynamic = useMemo(() => {
    const jx = frame.jx;
    const n = (jx + 1 - B0) / P;
    const sx0 = jx - 22, sx1 = jx + 1.6;
    const net = frame.hs.map((_, k) => gapX(k + 1) <= jx + 0.5);
    const bits = bitItems(frame.hs, net);
    const left = bits.filter((_, k) => B0 + k * P < jx);
    const right = bits.filter((_, k) => B0 + k * P >= jx);
    return [
      ...sortItems([...beamPiece(-12, sx0, 0, false)]),
      ...sortItems(left),
      ...sliderItems(jx, 32 - n),
      ...sortItems([...beamPiece(sx1, L, 0, true)]),
      ...sortItems(right),
    ];
  }, [frame]);

  // drag along the beam
  const dragging = useRef(false);
  const pick = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const m = svg.getScreenCTM();
    if (!m) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    let best = prefix, bd = Infinity;
    for (let n = MIN; n <= MAX; n++) {
      const [sx, sy] = proj(C, [gapX(n), BEAM.y1 + 8, BEAM.z0]);
      const d = Math.hypot(sx - pt.x, (sy - pt.y) * 0.25);
      if (d < bd) { bd = d; best = n; }
    }
    setPrefix(best);
  };

  const s = subnet(ip, prefix);
  const onKey = (e: React.KeyboardEvent) => {
    poke();
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { setPrefix(prefix + 1); e.preventDefault(); }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { setPrefix(prefix - 1); e.preventDefault(); }
  };

  return (
    <div>
      <Card
        n={3}
        title="Prefix caliper"
        hint="drag the jaw · ← → change prefix"
        readout={<><b>/{prefix}</b> · {s.mask} · <span className="c-teal">{fmt(s.total)} addresses · {fmt(s.usable)} hosts</span></>}
        viewBox={vb}
        label="A dial caliper whose beam is graduated in 32 bits. The sliding jaw sets the prefix length; bits between the jaws are network bits, bits beyond are host bits, and the dial reads the number of host bits."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <g
          onPointerDown={(e) => { dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); poke(); pick(e); }}
          onPointerMove={(e) => { if (dragging.current) { poke(); pick(e); } }}
          onPointerUp={() => { dragging.current = false; }}
          style={{ cursor: "ew-resize" }}
        >
          <Items items={bench} />
          <Items items={dynamic} />
        </g>
      </Card>
      <div className="controls">
        <input type="range" min={MIN} max={MAX} value={prefix} aria-label="Prefix length"
          onChange={(e) => { poke(); setPrefix(+e.target.value); }} style={{ flex: 1, minWidth: 160 }} />
        <div className="seg">
          {[8, 16, 24, 26, 28].map((n) => (
            <button key={n} className={prefix === n ? "on" : ""} onClick={() => { poke(); setPrefix(n); }}>/{n}</button>
          ))}
        </div>
      </div>
      <p className="mono" style={{ fontSize: 13, margin: "10px 2px 0", overflowWrap: "anywhere" }}>
        {ip.flatMap((o) => o.toString(2).padStart(8, "0").split("")).map((b, k) => (
          <span key={k} className={k < prefix ? "c-blue" : "c-teal"}>{b}{k % 8 === 7 && k < 31 ? "." : ""}</span>
        ))}
        <span style={{ color: "var(--muted)" }}>  ← {ip.join(".")}: </span>
        <span className="c-blue">network</span><span style={{ color: "var(--muted)" }}> | </span><span className="c-teal">host</span>
      </p>
      <Legend items={[
        { swatch: "blue", text: "Network bits (fixed for the whole subnet)" },
        { swatch: "teal", text: "Host bits (free to vary per device)" },
        { swatch: "sig", text: "Sliding jaw sets the prefix" },
        { swatch: "rose", text: "Dial needle: host bits = 32 − prefix" },
      ]} />
      <p className="caption">
        Addresses = 2<sup>host bits</sup>. A /{prefix} leaves {32 - prefix} host bits, so 2<sup>{32 - prefix}</sup> = {fmt(s.total)} addresses. Two are reserved for the network and broadcast addresses ({fmt(s.usable)} usable), and Azure reserves five per subnet ({fmt(s.azureUsable)} usable). The red arc on the dial marks 0–1 host bits (/31, /32), where there is no room for ordinary hosts.
      </p>
    </div>
  );
}

