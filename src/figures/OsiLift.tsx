import { useMemo, useRef, useState } from "react";
import {
  along, box, camera, line3, cyl, dotsItem, faceText, halo, knurl, labelPlate, lineItem, rrect, screws,
  sortItems, ticksX, boundsOf, type Fam, type Item, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { follow, useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { LAYERS, PAYLOAD, sizeAt } from "../models/encap";
import { fmt } from "../models/cidr";

const C = camera(38, 30);

// world plan
const FH = 13; // one floor
const Z0 = 9; // bench top
const TW = 50, TD = 40; // tower footprint
const SX = 0, RX = 140; // sender / receiver tower x
const LY0 = 42, LY1 = 62; // lift shaft depth (in front of the tower)
const CY = 52; // cable / parcel centre line
const BITS = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1]; // last preamble byte + SFD

/** One colour per layer: application group violet, transport blue, network teal, data link amber, physical rose. */
const LAYER_FAM: Fam[] = ["violet", "violet", "violet", "blue", "teal", "sig", "rose"];

const floorZ = (k: number) => Z0 + (6 - k) * FH; // floor k: 0 = L7 (top) … 6 = L1 (bottom)
const platZ = (k: number) => floorZ(k) + 0.4;

/** stage 0..6 sender L7→L1, 7 on the wire, 8..14 receiver L1→L7 */
const STAGES = 15;
function where(s: number): { side: "S" | "W" | "R"; k: number } {
  if (s <= 6) return { side: "S", k: s };
  if (s === 7) return { side: "W", k: 6 };
  return { side: "R", k: 14 - s };
}

function parcelTarget(s: number): V3 {
  const w = where(s);
  if (w.side === "W") return [(SX + TW + RX) / 2, CY, Z0 + 2.8];
  const x = (w.side === "S" ? SX : RX) + TW / 2;
  return [x, CY, platZ(w.k) + 1.4];
}

function tower(x0: number, keyBase: number): Item[] {
  const it: Item[] = [];
  const L = 1;
  // plinth under the tower
  it.push(box(C, x0 - 2, -2, Z0, TW + 4, TD + 4, 1.6, "mid", { layer: L, key: keyBase, r: 1, bevel: 0.8 }));
  for (let b = 0; b < 7; b++) {
    const k = 6 - b; // b = 0 is the bottom floor (L1)
    const z = Z0 + 1.6 + b * FH;
    const kb = keyBase + 10 + b * 10;
    it.push(box(C, x0, 0, z, TW, TD, FH - 1.6, "lo", { layer: L, key: kb }));
    // seam on +x face: a recessed panel line around the label field
    it.push(lineItem(C, [[x0 + TW, 1.5, z + 1.5], [x0 + TW, TD - 1.5, z + 1.5], [x0 + TW, TD - 1.5, z + FH - 3.1], [x0 + TW, 1.5, z + FH - 3.1]], "faint", 0.4, L, kb + 1, true));
    // engraved floor label on the side facing the viewer
    const ly = LAYERS[k];
    // colour tab at the start of the label field
    it.push(box(C, x0 + TW, TD - 4.2, z + 1.8, 0.4, 2.6, FH - 5.2, LAYER_FAM[k], { layer: L, key: kb + 1.5 }));
    it.push(faceText(C, `L${ly.n}`, [x0 + TW, TD - 9.5, z + (FH - 1.6) / 2], "+x", 3.6, LAYER_FAM[k], { anchor: "start", layer: L, key: kb + 2, weight: 700 }));
    it.push(faceText(C, ly.name.toUpperCase(), [x0 + TW, TD - 16.5, z + (FH - 1.6) / 2], "+x", 2.5, "mid", { anchor: "start", layer: L, key: kb + 2 }));
    // lamp socket ring (the lamp itself is live)
    it.push(box(C, x0 + TW, TD - 7.6, z + 2.6, 0.5, 5, 5.4, "mid", { layer: L, key: kb + 3 }));
    // shelf lip; thicker and lighter where TCP/IP model groups meet
    const groupEdge = b === 1 || b === 2 || b === 3; // L2|L3, L3|L4, L4|L5 boundaries
    const lipH = 1.6;
    it.push(box(C, x0 - 1, -1, z + FH - 1.6, TW + 2, TD + 2, lipH, groupEdge ? "hi" : "mid", { layer: L, key: kb + 5, r: 0.6 }));
    // small screws on the lip front corners
    it.push(dotsItem(C, [[x0 + TW + 0.6, TD - 0.5, z + FH - 0.8], [x0 + TW + 0.6, 0.5, z + FH - 0.8]], 0.35, "mid", L));
    (it[it.length - 1] as { key: number }).key = kb + 6;
  }
  const top = Z0 + 1.6 + 7 * FH;
  // recessed door panel on the shaft wall of every floor, with a call plate
  for (let b = 0; b < 7; b++) {
    const z = Z0 + 1.6 + b * FH;
    const kb = keyBase + 10 + b * 10;
    it.push(lineItem(C, [[x0 + 12, TD, z + 1.4], [x0 + TW - 12, TD, z + 1.4], [x0 + TW - 12, TD, z + FH - 3.2], [x0 + 12, TD, z + FH - 3.2]], "faint", 0.45, L, kb + 1, true));
    it.push(lineItem(C, [[x0 + TW / 2, TD, z + 1.4], [x0 + TW / 2, TD, z + FH - 3.2]], "faint", 0.35, L, kb + 1));
  }
  // rails on the shaft side
  for (const rx of [6, TW - 9]) {
    it.push(box(C, x0 + rx, TD + 1, Z0 + 1.6, 3, 2, top - Z0 - 1.6, "mid", { layer: L, key: keyBase + 80 }));
    // rail ticks every floor
    for (let b = 0; b <= 7; b++) {
      const z = Z0 + 1.6 + b * FH;
      it.push(lineItem(C, [[x0 + rx, TD + 3, z], [x0 + rx + 3, TD + 3, z]], "lo", 0.35, L, keyBase + 81));
    }
  }
  // top cap with bevel, a winch drum and its knurled knob
  it.push(box(C, x0 - 2, -2, top, TW + 4, TD + 6, 3, "mid", { layer: L, key: keyBase + 90, r: 1.2, bevel: 1 }));
  it.push(screws(C, x0 - 2, -2, TW + 4, TD + 6, top + 3, 2.6, L));
  (it[it.length - 1] as { key: number }).key = keyBase + 91;
  it.push(box(C, x0 + 8, TD - 6, top + 3, TW - 16, 7, 1.2, "lo", { layer: L, key: keyBase + 92, r: 0.6 }));
  it.push(cyl(C, x0 + TW / 2, 12, top + 3, 7, 5, "hi", { layer: L, key: keyBase + 93, bevel: 0.8 }));
  it.push(knurl(C, x0 + TW / 2, 12, top + 3, 7, 5, 30, L));
  (it[it.length - 1] as { key: number }).key = keyBase + 94;
  it.push(cyl(C, x0 + TW / 2, 12, top + 8, 2.2, 1.6, "mid", { layer: L, key: keyBase + 95 }));
  // hoist rope runs from the drum, over a sheave block on the front edge
  it.push({ ...lineItem(C, [[x0 + TW / 2, 12, top + 5.5], [x0 + TW / 2, TD + 2, top + 5.5]], "lo", 1.6, L), key: keyBase + 96 });
  it.push({ ...lineItem(C, [[x0 + TW / 2, 12, top + 5.5], [x0 + TW / 2, TD + 2, top + 5.5]], "hi", 0.5, L), key: keyBase + 96.5 });
  it.push(box(C, x0 + TW / 2 - 3, TD, top + 3, 6, 4, 4, "hi", { layer: L, key: keyBase + 97, bevel: 0.5 }));
  it.push(dotsItem(C, [[x0 + TW / 2 - 3, TD + 2, top + 5]], 0.6, "lo", L, true));
  (it[it.length - 1] as { key: number }).key = keyBase + 98;
  return it;
}

function bench(): Item[] {
  const it: Item[] = [];
  const bx = -14, by = -14, bw = RX + TW + 28, bd = LY1 + 26;
  const plan = rrect(bx, by, bw, bd, 5);
  it.push(halo(C, plan, 5));
  for (const [fx, fy] of [[bx + 8, by + 8], [bx + bw - 8, by + 8], [bx + 8, by + bd - 8], [bx + bw - 8, by + bd - 8]]) {
    it.push(cyl(C, fx, fy, 0, 4, 3.2, "lo", { layer: 0, key: -50 }));
  }
  it.push({ ...box(C, bx, by, 3.2, bw, bd, Z0 - 3.2, "lo", { layer: 0, key: -40, r: 5, bevel: 1.2 }) });
  it.push(screws(C, bx, by, bw, bd, Z0, 4, 0));
  // front ruler
  it.push(...ticksX(C, bx + 12, bx + bw - 12, by + bd - 6, Z0, 4, 3, 5, 0));
  it.push(lineItem(C, [[bx + 12, by + bd - 3, Z0], [bx + bw - 12, by + bd - 3, Z0]], "lo", 0.4, 0));
  // label plate
  it.push(...labelPlate(C, bx + bw / 2 - 16, by + bd - 15, Z0, 32, 7, 0));
  // cable groove + cable between the two lifts
  const x0 = SX + TW + 2, x1 = RX - 2;
  it.push(lineItem(C, [[x0, CY - 2.2, Z0], [x1, CY - 2.2, Z0]], "faint", 0.5, 0));
  it.push(lineItem(C, [[x0, CY + 2.2, Z0], [x1, CY + 2.2, Z0]], "mid", 0.5, 0));
  const cab: V3[] = [[x0, CY, Z0 + 1], [x1, CY, Z0 + 1]];
  it.push({ ...lineItem(C, cab, "lo", 3.2, 0), key: 5 });
  it.push({ ...lineItem(C, cab, "rose", 2.1, 0), key: 6 });
  it.push({ ...lineItem(C, [[x0, CY - 0.5, Z0 + 1.8], [x1, CY - 0.5, Z0 + 1.8]], "hi", 0.4, 0), key: 7 });
  // RJ45 jacks where the cable meets each lift
  it.push(box(C, x0 - 3, CY - 3, Z0, 4, 6, 3.6, "mid", { layer: 0, key: 8, bevel: 0.5 }));
  it.push(box(C, x1 - 1, CY - 3, Z0, 4, 6, 3.6, "mid", { layer: 0, key: 8, bevel: 0.5 }));
  // shaft floor pads
  for (const x of [SX, RX]) {
    it.push(box(C, x + 3, LY0 + 1, Z0, TW - 6, LY1 - LY0 - 2, 0.4, "lo", { layer: 0, key: 4, r: 1 }));
    it.push(screws(C, x + 3, LY0 + 1, TW - 6, LY1 - LY0 - 2, Z0 + 0.4, 2, 0));
  }
  return it;
}

function platform(): Item[] {
  // built at origin = lift centre at floor level; translated live
  const it: Item[] = [];
  it.push(box(C, -TW / 2 + 4, -9, 0, TW - 8, 18, 1.4, "mid", { layer: 0, key: 0, r: 1, bevel: 0.6 }));
  it.push(screws(C, -TW / 2 + 4, -9, TW - 8, 18, 1.4, 2, 0));
  for (const rx of [6, TW - 9]) {
    it.push(box(C, -TW / 2 + rx - 1, -CY + TD + 3, 0, 5, 2, 5, "hi", { layer: 0, key: -1, bevel: 0.4 }));
    it.push(box(C, -TW / 2 + rx - 1, -CY + TD + 5, 0, 5, 3.5, 1.4, "mid", { layer: 0, key: -0.5 }));
  }
  return sortItems(it);
}

type Piece = { name: string; w: number; fam: Fam; k: number };

function parcelPieces(k: number): { left: Piece[]; right: Piece[] } {
  // headers stack outward from the data in wire order: PRE ETH IP TCP [DATA] FCS
  const left: Piece[] = [];
  if (k >= 3) left.push({ name: "TCP", w: 5.5, fam: LAYER_FAM[3], k: 3 });
  if (k >= 4) left.push({ name: "IP", w: 5.5, fam: LAYER_FAM[4], k: 4 });
  if (k >= 5) left.push({ name: "ETH", w: 5.5, fam: LAYER_FAM[5], k: 5 });
  if (k >= 6) left.push({ name: "PRE", w: 3.5, fam: LAYER_FAM[6], k: 6 });
  const right: Piece[] = k >= 5 ? [{ name: "FCS", w: 3.5, fam: LAYER_FAM[5], k: 5 }] : [];
  return { left, right };
}

function parcel(s: number): Item[] {
  const w = where(s);
  const it: Item[] = [];
  if (w.side === "W") {
    // bits on the wire: raised lit cubes are 1s
    const n = BITS.length, cw = 2.4;
    for (let i = 0; i < n; i++) {
      const x = -(n * cw) / 2 + i * cw;
      const one = BITS[i] === 1;
      it.push(box(C, x + 0.2, -3, 0, cw - 0.4, 6, one ? 4.6 : 0.9, one ? "rose" : "mid", { layer: 0, key: i, bevel: one ? 0.3 : 0 }));
    }
    return it;
  }
  const { left, right } = parcelPieces(w.k);
  const D = 14, H = 9;
  const dataW = 16;
  let x = -dataW / 2 + 4;
  it.push(box(C, x, -D / 2, 0, dataW, D, H, LAYER_FAM[0], { layer: 0, key: 50, bevel: 0.7 }));
  it.push(faceText(C, "HTTP", [x + dataW / 2, 0, H], "top", 3, "ink", { layer: 0, key: 50.5, weight: 700 }));
  let xl = x;
  left.forEach((p, i) => {
    xl -= p.w;
    it.push(box(C, xl, -D / 2, 0, p.w - 0.3, D, H - (i === 3 ? 2 : 0), p.fam, { layer: 0, key: 40 - i, bevel: 0.5 }));
    it.push(faceText(C, p.name, [xl + p.w / 2, 0, H - (i === 3 ? 2 : 0)], "top", p.w < 4 ? 1.6 : 2.2, "ink", { layer: 0, key: 40.5 - i, weight: 700 }));
  });
  let xr = x + dataW;
  right.forEach((p) => {
    it.push(box(C, xr + 0.3, -D / 2, 0, p.w - 0.3, D, H, p.fam, { layer: 0, key: 60, bevel: 0.5 }));
    it.push(faceText(C, p.name, [xr + p.w / 2 + 0.15, 0, H], "top", 1.6, "ink", { layer: 0, key: 60.5, weight: 700 }));
    xr += p.w;
  });
  return sortItems(it);
}

function lamps(s: number): Item[] {
  const w = where(s);
  const it: Item[] = [];
  for (const [x0, side] of [[SX, "S"], [RX, "R"]] as const) {
    for (let b = 0; b < 7; b++) {
      const k = 6 - b;
      const on = w.side === side && w.k === k;
      const z = Z0 + 1.6 + b * FH;
      it.push(box(C, x0 + TW + 0.5, TD - 7, z + 3.2, 0.9, 3.8, 4.2, on ? LAYER_FAM[k] : "lo", { layer: 0, key: z, bevel: 0.3 }));
    }
  }
  return it;
}

function readoutOf(s: number) {
  const w = where(s);
  if (w.side === "W") {
    const bytes = sizeAt(6);
    return <>On the wire · <b>{fmt(bytes)} B</b> = {fmt(bytes * 8)} bits</>;
  }
  const L = LAYERS[w.k];
  const verb = w.side === "S" ? (L.header + L.trailer ? `adds ${L.header + L.trailer} B` : "passes data") : (L.header + L.trailer ? `strips ${L.header + L.trailer} B` : "hands data up");
  return (
    <>
      {w.side === "S" ? "Sender" : "Receiver"} · L{L.n} {L.name} · <b>{L.pdu}</b> {fmt(sizeAt(w.k))} B · {verb}
    </>
  );
}

export function OsiLift() {
  const svgRef = useRef<SVGSVGElement>(null);
  const parcelRef = useRef<SVGGElement>(null);
  const platS = useRef<SVGGElement>(null);
  const platR = useRef<SVGGElement>(null);
  const ropes = useRef<(SVGPathElement | null)[]>([]);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);

  const stat = useMemo(() => sortItems([...bench(), ...tower(SX, 0), ...tower(RX, 0)]), []);
  const plat = useMemo(() => platform(), []);
  const vb = useMemo(() => {
    const b = boundsOf(stat, 10);
    return `${b.x} ${b.y} ${b.w} ${b.h}`;
  }, [stat]);

  const pos = useRef<{ p: V3; ps: number; pr: number; stage: number }>({ p: parcelTarget(0), ps: platZ(0), pr: platZ(6), stage: 0 });

  const go = (n: number) => {
    const next = ((n % STAGES) + STAGES) % STAGES;
    if (Math.abs(next - pos.current.stage) > 1) {
      pos.current.p = parcelTarget(next);
      const w = where(next);
      pos.current.ps = w.side === "S" ? platZ(w.k) : platZ(6);
      pos.current.pr = w.side === "R" ? platZ(w.k) : platZ(6);
    }
    pos.current.stage = next;
    setStage(next);
  };

  const poke = useTour(() => go(pos.current.stage + 1), playing && inView && !reduced, 1.7, 0);

  const apply = () => {
    const P = pos.current;
    const [px, py] = along(C, P.p);
    parcelRef.current?.setAttribute("transform", `translate(${px.toFixed(2)} ${py.toFixed(2)})`);
    const s = along(C, [SX + TW / 2, CY, P.ps]);
    platS.current?.setAttribute("transform", `translate(${s[0].toFixed(2)} ${s[1].toFixed(2)})`);
    const r = along(C, [RX + TW / 2, CY, P.pr]);
    platR.current?.setAttribute("transform", `translate(${r[0].toFixed(2)} ${r[1].toFixed(2)})`);
    const TOP = Z0 + 1.6 + 7 * FH + 4;
    [[SX, P.ps], [RX, P.pr]].forEach(([x0, z], i) => {
      const d = line3(C, [[x0 + TW / 2, TD + 3.5, TOP], [x0 + TW / 2, TD + 3.5, z + 1.4]]);
      ropes.current[i * 2]?.setAttribute("d", d);
      ropes.current[i * 2 + 1]?.setAttribute("d", d);
    });
  };

  useLoop((_t, dt) => {
    const P = pos.current;
    const tgt = parcelTarget(P.stage);
    const w = where(P.stage);
    const tau = reduced ? 0.001 : 0.22;
    P.p = [follow(P.p[0], tgt[0], dt, tau), follow(P.p[1], tgt[1], dt, tau), follow(P.p[2], tgt[2], dt, tau)];
    P.ps = follow(P.ps, w.side === "S" ? platZ(w.k) : platZ(6), dt, tau);
    P.pr = follow(P.pr, w.side === "R" ? platZ(w.k) : platZ(6), dt, tau);
    apply();
  }, inView);

  const parcelItems = useMemo(() => parcel(stage), [stage]);
  const lampItems = useMemo(() => lamps(stage), [stage]);
  const w = where(stage);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { poke(); setPlaying(false); go(pos.current.stage + 1); e.preventDefault(); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { poke(); setPlaying(false); go(pos.current.stage - 1); e.preventDefault(); }
    if (e.key === " ") { setPlaying((p) => !p); e.preventDefault(); }
  };

  return (
    <div>
      <Card
        n={1}
        title="Encapsulation lift"
        hint="← → step · space play/pause"
        readout={readoutOf(stage)}
        viewBox={vb}
        label="Two seven-floor lift towers joined by a cable. A parcel of data descends the sender, gaining a header at each layer, crosses the cable as bits, and rises through the receiver as headers are removed."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat.filter((i) => i.layer <= 0)} />
        <Items items={stat.filter((i) => i.layer === 1)} />
        <Items items={lampItems} />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} ref={(el) => { ropes.current[i] = el; }} className={`iso-ln ${i % 2 ? "t-hi" : "t-lo"}`} strokeWidth={i % 2 ? 0.45 : 1.5} />
        ))}
        <g ref={platS}><Items items={plat} /></g>
        <g ref={platR}><Items items={plat} /></g>
        <g ref={parcelRef}>
          <g key={stage} className="pop-in"><Items items={parcelItems} /></g>
        </g>
      </Card>
      <div className="controls">
        <div className="seg">
          <button onClick={() => { poke(); setPlaying(false); go(pos.current.stage - 1); }} aria-label="Previous step">◀</button>
          <button onClick={() => setPlaying((p) => !p)} className={playing ? "on" : ""}>{playing ? "Pause" : "Play"}</button>
          <button onClick={() => { poke(); setPlaying(false); go(pos.current.stage + 1); }} aria-label="Next step">▶</button>
        </div>
        <input
          type="range" min={0} max={STAGES - 1} value={stage}
          onChange={(e) => { poke(); setPlaying(false); go(+e.target.value); }}
          aria-label="Stage" style={{ flex: 1, minWidth: 140 }}
        />
        <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
          TCP/IP: <span className={`c-${{ violet: "violet", blue: "blue", teal: "teal", sig: "amber", rose: "rose" }[LAYER_FAM[w.k] as string]}`}>{w.side === "W" ? "Link (physical)" : LAYERS[w.k].tcpip}</span>
        </span>
      </div>
      <Legend items={[
        { swatch: "violet", text: `L7–L5 application data (${fmt(PAYLOAD)} B HTTP)` },
        { swatch: "blue", text: "L4 TCP header" },
        { swatch: "teal", text: "L3 IP header" },
        { swatch: "sig", text: "L2 Ethernet header + FCS" },
        { swatch: "rose", text: "L1 preamble and bits (raised = 1)" },
      ]} />
      <p className="caption">
        Real sizes: TCP 20 B, IPv4 20 B, Ethernet 14 B + 4 B FCS, preamble+SFD 8 B (blocks not to byte scale). The bits shown on the wire are the last preamble byte <code>10101010</code> and the start-frame delimiter <code>10101011</code>. Lighter shelf lips mark where the 4-layer TCP/IP model groups the 7 OSI layers.
      </p>
    </div>
  );
}
