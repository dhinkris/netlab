import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, cyl, dotsItem, faceText, halo, knurl, labelPlate, lineItem, proj, rrect, screws,
  sortItems, type Item, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { follow, useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { bitsOf, classify, fromInt, ipStr, parseIp, SAMPLES, toInt, legacyClass, type Octets } from "../models/ip";

const C = camera(32, 32);
/** Each octet keeps its own colour on the pins, its window and the binary line. */
const OCT: ("blue" | "teal" | "violet" | "rose")[] = ["blue", "teal", "violet", "rose"];

const PITCH = 5.2;
const BANK_W = 8 * PITCH + 3; // 44.6
const GAP = 7;
const Z0 = 7; // base top
const PZ = Z0 + 4; // bank plate top
const PIN_Y = 16, PIN_D = 3.6, PIN_W = 3.2;
const DOWN = 1.0, UP = 5.2; // pin height above the plate

const bankX = (b: number) => b * (BANK_W + GAP);
const pinX = (i: number) => bankX(Math.floor(i / 8)) + 1.5 + (i % 8) * PITCH + (PITCH - PIN_W) / 2;
const TOTAL_W = 4 * BANK_W + 3 * GAP;
const LX = TOTAL_W + 12; // lamp post x

function staticItems(): Item[] {
  const it: Item[] = [];
  const bx = -10, by = -10, bw = TOTAL_W + 40, bd = 58;
  it.push(halo(C, rrect(bx, by, bw, bd, 5), 5));
  for (const [fx, fy] of [[bx + 7, by + 7], [bx + bw - 7, by + 7], [bx + 7, by + bd - 7], [bx + bw - 7, by + bd - 7]]) {
    it.push(cyl(C, fx, fy, 0, 3.5, 3, "lo", { key: -60 }));
  }
  it.push(box(C, bx, by, 3, bw, bd, Z0 - 3, "lo", { key: -50, r: 5, bevel: 1.2 }));
  it.push(screws(C, bx, by, bw, bd, Z0, 4));
  // front ruler with one tick per bit
  it.push(lineItem(C, [[-2, 40.5, Z0], [TOTAL_W + 2, 40.5, Z0]], "lo", 0.4));
  let minor = "", major = "";
  for (let i = 0; i < 32; i++) {
    const x = pinX(i) + PIN_W / 2;
    const seg = proj3([[x, 40.5, Z0], [x, i % 8 === 0 ? 43.5 : 42.3, Z0]]);
    if (i % 8 === 0) major += seg; else minor += seg;
  }
  it.push({ kind: "line", d: minor, tone: "lo", w: 0.35, layer: 0, key: -1 });
  it.push({ kind: "line", d: major, tone: "mid", w: 0.45, layer: 0, key: -1 });
  // cursor rail
  it.push(box(C, -4, 33, Z0, TOTAL_W + 8, 3, 1.4, "mid", { key: 0, r: 0.6 }));
  it.push(dotsItem(C, [[-2.5, 34.5, Z0 + 1.4], [TOTAL_W + 2.5, 34.5, Z0 + 1.4]], 0.45, "mid", 0, true));
  // back display panel
  const PH = 24;
  it.push(box(C, -6, -4, Z0, TOTAL_W + 12, 9, PH, "mid", { key: 1, bevel: 0.8 }));
  it.push(box(C, -7, -5, Z0 + PH, TOTAL_W + 14, 11, 1.6, "hi", { key: 2, r: 0.8 }));
  it.push(screws(C, -7, -5, TOTAL_W + 14, 11, Z0 + PH + 1.6, 2.4));
  for (let b = 0; b < 4; b++) {
    const x = bankX(b) + 7;
    // recessed odometer window on the panel face
    it.push(box(C, x, 5, Z0 + 7, BANK_W - 14, 0.6, 12, "lo", { key: 3 + b * 0.01 }));
    it.push(lineItem(C, [[x, 5.6, Z0 + 13], [x + BANK_W - 14, 5.6, Z0 + 13]], "faint", 0.3, 0, 3.5));
    // bank index engraved under the window
    it.push(faceText(C, `OCTET ${b + 1}`, [bankX(b) + BANK_W / 2, 5, Z0 + 3.6], "+y", 2.2, OCT[b], { key: 3.6, weight: 600 }));
    if (b < 3) it.push(dotsItem(C, [[bankX(b) + BANK_W + GAP / 2, 5, Z0 + 8.5]], 1.2, "hi", 0));
  }
  // bank plates with sockets and engraved place values
  const PV = [128, 64, 32, 16, 8, 4, 2, 1];
  for (let b = 0; b < 4; b++) {
    const x = bankX(b);
    it.push(box(C, x, 10, Z0, BANK_W, 20, PZ - Z0, "hi", { key: 10 + b, r: 1, bevel: 0.7 }));
    it.push(box(C, x + 3, 11.2, PZ, BANK_W - 6, 1.6, 0.3, OCT[b], { key: 10.55 + b }));
    it.push(screws(C, x, 10, BANK_W, 20, PZ, 1.8));
    it.push(lineItem(C, [[x + 1.2, 24, PZ], [x + BANK_W - 1.2, 24, PZ]], "faint", 0.35, 0, 10.5 + b));
    for (let k = 0; k < 8; k++) {
      const px = pinX(b * 8 + k);
      it.push(box(C, px - 0.5, PIN_Y - 0.5, PZ, PIN_W + 1, PIN_D + 1, 0.25, "lo", { key: 10.6 + b }));
      it.push(faceText(C, String(PV[k]), [px + PIN_W / 2, 26.6, PZ], "top", PV[k] > 99 ? 1.7 : 2, "mid", { key: 10.7 + b }));
    }
  }
  // lamp post: private / public / special
  it.push(box(C, LX - 4, 8, Z0, 22, 26, 3, "mid", { key: 20, r: 1.2, bevel: 0.7 }));
  it.push(screws(C, LX - 4, 8, 22, 26, Z0 + 3, 2));
  ["PRIVATE", "PUBLIC", "SPECIAL"].forEach((t, i) => {
    const y = 13 + i * 8;
    it.push(cyl(C, LX + 1, y, Z0 + 3, 3, 1.2, "lo", { key: 21 + i * 0.1 }));
    it.push(faceText(C, t, [LX + 5.5, y, Z0 + 3], "top", 2, "mid", { anchor: "start", key: 21.05 + i * 0.1 }));
  });
  it.push(...labelPlate(C, LX - 2, 36, Z0, 18, 6));
  return sortItems(it);
}

function proj3(pts: V3[]) {
  return pts.map((p, i) => { const q = proj(C, p); return `${i ? "L" : "M"}${q[0].toFixed(2)} ${q[1].toFixed(2)}`; }).join("");
}

function pinItems(hs: number[], bits: number[]): Item[] {
  const it: Item[] = [];
  for (let i = 0; i < 32; i++) {
    const x = pinX(i);
    it.push(box(C, x, PIN_Y, PZ, PIN_W, PIN_D, hs[i], bits[i] ? OCT[Math.floor(i / 8)] : "mid", { key: x, bevel: 0.35 }));
  }
  return sortItems(it);
}

function lampItems(scope: "private" | "public" | "special"): Item[] {
  const idx = scope === "private" ? 0 : scope === "public" ? 1 : 2;
  const fam = (["ok", "sig", "warn"] as const)[idx];
  return [0, 1, 2].map((i) => {
    const y = 13 + i * 8;
    const on = i === idx;
    return cyl(C, LX + 1, y, Z0 + 4.2, 2.1, on ? 2.6 : 0.8, on ? fam : "mid", { key: 22 + i, bevel: on ? 0.4 : 0 });
  });
}

function carriage(): Item[] {
  // origin at the pin's x centre, on the rail
  const it: Item[] = [];
  it.push(box(C, -3.4, 32.2, Z0 + 1.4, 6.8, 4.6, 2.2, "hi", { key: 0, bevel: 0.4, r: 0.5 }));
  it.push(box(C, -0.6, 30.4, Z0 + 3.6, 1.2, 3.2, 0.8, "sig", { key: 1 }));
  it.push(knurl(C, 0, 34.5, Z0 + 1.4, 3.3, 2.2, 14));
  return sortItems(it);
}

export function AddressRegister() {
  const svgRef = useRef<SVGSVGElement>(null);
  const carRef = useRef<SVGGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [ip, setIp] = useState<Octets>([192, 168, 1, 10]);
  const [draft, setDraft] = useState("192.168.1.10");
  const [cursor, setCursor] = useState(0);
  const bits = useMemo(() => bitsOf(ip), [ip]);
  const [hs, setHs] = useState<number[]>(() => bitsOf([192, 168, 1, 10]).map((b) => (b ? UP : DOWN)));
  const [shown, setShown] = useState<number[]>([192, 168, 1, 10]);
  const live = useRef({ hs, shown: [...shown] as number[], car: pinX(0) + PIN_W / 2, sample: 0 });

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 8); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const kind = classify(ip);

  const setAll = (o: Octets) => { setIp(o); setDraft(ipStr(o)); };
  const flip = (i: number) => {
    const n = (toInt(ip) ^ (1 << (31 - i))) >>> 0;
    setAll(fromInt(n));
    setCursor(i);
  };

  const poke = useTour(() => {
    live.current.sample = (live.current.sample + 1) % SAMPLES.length;
    setAll(parseIp(SAMPLES[live.current.sample].ip)!);
  }, inView && !reduced, 3.4, 8);

  useLoop((_t, dt) => {
    const L = live.current;
    const tau = reduced ? 0.001 : 0.12;
    let moving = false;
    const nh = L.hs.map((h, i) => {
      const tgt = bits[i] ? UP : DOWN;
      const v = follow(h, tgt, dt, tau);
      if (Math.abs(v - tgt) > 0.01) moving = true;
      return Math.abs(v - tgt) > 0.01 ? v : tgt;
    });
    const ns = L.shown.map((s, b) => {
      const v = follow(s, ip[b], dt, reduced ? 0.001 : 0.25);
      if (Math.abs(v - ip[b]) > 0.4) { moving = true; return v; }
      return ip[b];
    });
    if (moving || nh.some((h, i) => h !== L.hs[i]) || ns.some((s, i) => s !== L.shown[i])) {
      L.hs = nh; L.shown = ns;
      setHs(nh);
      setShown(ns.map((s) => Math.round(s)));
    }
    L.car = follow(L.car, pinX(cursor) + PIN_W / 2, dt, reduced ? 0.001 : 0.1);
    const [dx, dy] = proj(C, [L.car, 0, 0]);
    carRef.current?.setAttribute("transform", `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
  }, inView);

  const pins = useMemo(() => pinItems(hs, bits), [hs, bits]);
  const lamps = useMemo(() => lampItems(kind.scope), [kind.scope]);
  const car = useMemo(() => carriage(), []);
  const digits = useMemo(
    () => shown.map((v, b) => faceText(C, String(v), [bankX(b) + BANK_W / 2, 5.7, Z0 + 13], "+y", 8.5, OCT[b], { weight: 600 })),
    [shown],
  );

  // hit targets over each pin
  const hits = useMemo(() => {
    const out: { i: number; d: string }[] = [];
    for (let i = 0; i < 32; i++) {
      const x = pinX(i) - 0.9, y0 = PIN_Y - 1.5, w = PIN_W + 1.8, d = PIN_D + 3;
      const d0 = box(C, x, y0, PZ, w, d, UP + 1, "lo").outline;
      out.push({ i, d: d0 });
    }
    return out;
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    poke();
    if (e.key === "ArrowRight") { setCursor((c) => Math.min(31, c + 1)); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { setCursor((c) => Math.max(0, c - 1)); e.preventDefault(); }
    else if (e.key === " " || e.key === "Enter") { flip(cursor); e.preventDefault(); }
  };

  const bin = bits.join("").match(/.{8}/g)!;

  return (
    <div>
      <Card
        n={2}
        title="Address register"
        hint="click a pin · ← → move · space flips"
        readout={<>{ip.map((o, i) => <span key={i}><span className={`c-${OCT[i]}`}>{o}</span>{i < 3 ? "." : ""}</span>)} · <b>{kind.label}</b>{kind.rfc ? ` · ${kind.rfc}` : ""}</>}
        viewBox={vb}
        label="A register of 32 bit-pins in four banks of eight. Raised pins are ones. Each bank's decimal value shows in a window behind it; a lamp shows whether the address is private, public or special."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={digits} />
        <Items items={lamps} />
        <g ref={carRef}><Items items={car} /></g>
        <Items items={pins} />
        {hits.map((h) => (
          <path key={h.i} d={h.d} className="iso-hit" onClick={() => { poke(); flip(h.i); }}>
            <title>Bit {h.i + 1}: value {2 ** (7 - (h.i % 8))} in octet {Math.floor(h.i / 8) + 1}</title>
          </path>
        ))}
      </Card>
      <div className="controls">
        <input
          className="ctl-input" value={draft} aria-label="IPv4 address"
          onChange={(e) => { poke(); setDraft(e.target.value); const p = parseIp(e.target.value); if (p) setIp(p); }}
          style={{ borderColor: parseIp(draft) ? undefined : "var(--warn)" }}
        />
        <div className="seg">
          {SAMPLES.map((s, i) => (
            <button key={s.ip} className={ipStr(ip) === s.ip ? "on" : ""} title={s.why}
              onClick={() => { poke(); live.current.sample = i; setAll(parseIp(s.ip)!); }}>
              {s.ip}
            </button>
          ))}
        </div>
      </div>
      <p className="mono" style={{ fontSize: 13, margin: "10px 2px 0", color: "var(--muted)", overflowWrap: "anywhere" }}>
        binary {bin.map((o, i) => <span key={i}><span className={`c-${OCT[i]}`}>{o}</span>{i < 3 ? "." : ""}</span>)}
        {"  "}· legacy class {legacyClass(ip)} · {kind.note}
      </p>
      <Legend items={[
        { swatch: "blue", text: "Octet 1" },
        { swatch: "teal", text: "Octet 2" },
        { swatch: "violet", text: "Octet 3" },
        { swatch: "rose", text: "Octet 4 (raised pin = 1)" },
        { swatch: "mid", text: "Lowered pin = 0" },
        { swatch: "ok", text: "Lamp: private" },
        { swatch: "sig", text: "Lamp: public" },
        { swatch: "warn", text: "Lamp: special-use" },
      ]} />
      <p className="caption">
        Each octet is the sum of the place values of its raised pins: 192 = 128 + 64. The register holds exactly 32 bits, so IPv4 has 2<sup>32</sup> = 4,294,967,296 possible addresses.
      </p>
    </div>
  );
}
