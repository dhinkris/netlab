import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, cyl, dotsItem, faceText, halo, labelPlate, lineItem, prism, rrect, screws,
  sortItems, ticksX, type Fam, type Item, type V2,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { PORTS } from "../models/ports";

const C = camera(28, 30);
const Z0 = 7;
const PITCH = 27, BAY_W = 18, BX0 = 9;
const CH = { x0: 0, x1: BX0 * 2 + 5 * PITCH + BAY_W, y1: 22, h: 38 };
const bayX = (i: number) => BX0 + i * PITCH; // left edge of bay
const bayC = (i: number) => bayX(i) + BAY_W / 2;
const HOME = -26;
const TRACK_Y = 44.5;
const FLOOR = Z0 + 8; // bay floor
const CLIENT_PORT = 51514;
const protoFam = (proto: string): Fam => (proto === "UDP" ? "violet" : "blue");
/** Each message keeps one colour: SYN amber, SYN-ACK teal, ACK green, data rose, reset red. */
const MSG: Record<string, Fam> = { SYN: "sig", "SYN-ACK": "teal", ACK: "ok", DATA: "rose", RST: "warn" };

/** Which ports have a service listening. RDP is closed, as it should be on an internet-facing host. */
const LISTENING: Record<number, boolean> = { 22: true, 53: true, 80: true, 123: true, 443: true, 3389: false };

function staticItems(): Item[] {
  const it: Item[] = [];
  const bx = -46, by = -10, bw = CH.x1 + 58, bd = 70;
  it.push(halo(C, rrect(bx, by, bw, bd, 5), 5));
  for (const [fx, fy] of [[bx + 7, by + 7], [bx + bw - 7, by + 7], [bx + 7, by + bd - 7], [bx + bw - 7, by + bd - 7]]) {
    it.push(cyl(C, fx, fy, 0, 3.5, 3, "lo", { key: -60 }));
  }
  it.push(box(C, bx, by, 3, bw, bd, Z0 - 3, "lo", { key: -50, r: 5, bevel: 1.2 }));
  it.push(screws(C, bx, by, bw, bd, Z0, 4));
  it.push(...ticksX(C, bx + 10, bx + bw - 10, by + bd - 6, Z0, 4, 3, 5));
  it.push(lineItem(C, [[bx + 10, by + bd - 2.8, Z0], [bx + bw - 10, by + bd - 2.8, Z0]], "lo", 0.4));
  it.push(...labelPlate(C, CH.x1 - 30, by + bd - 17, Z0, 28, 7));

  // track: two rails with sleepers, from the client dock to the last bay
  const tx0 = HOME - 10, tx1 = CH.x1 - 4;
  for (let x = tx0 + 2; x < tx1; x += 6) it.push(box(C, x, TRACK_Y - 5.5, Z0, 2, 11, 0.6, "mid", { key: 0 }));
  for (const y of [TRACK_Y - 4, TRACK_Y + 3]) it.push(box(C, tx0, y, Z0 + 0.6, tx1 - tx0, 1.2, 1.2, "hi", { key: 1 }));
  it.push(box(C, tx1, TRACK_Y - 5, Z0, 2.5, 10, 3, "mid", { key: 2, bevel: 0.4 })); // end stop

  // client dock
  it.push(box(C, HOME - 18, TRACK_Y - 10, Z0, 12, 20, 6, "mid", { key: 3, bevel: 0.6 }));
  it.push(screws(C, HOME - 18, TRACK_Y - 10, 12, 20, Z0 + 6, 1.8));
  it.push(faceText(C, "CLIENT", [HOME - 12, TRACK_Y - 3, Z0 + 6], "top", 2.2, "mid", { key: 3.1, weight: 600 }));
  it.push(faceText(C, `:${CLIENT_PORT}`, [HOME - 12, TRACK_Y + 2, Z0 + 6], "top", 2.1, "sig", { key: 3.1 }));

  // server chassis
  it.push(box(C, CH.x0 - 2, -2, Z0, CH.x1 + 4, CH.y1 + 4, 2, "mid", { key: 10, r: 1, bevel: 0.6 }));
  it.push(box(C, CH.x0, 0, Z0 + 2, CH.x1, CH.y1, CH.h, "lo", { key: 11 }));
  it.push(box(C, CH.x0 - 1, -1, Z0 + 2 + CH.h, CH.x1 + 2, CH.y1 + 2, 1.8, "mid", { key: 12, r: 0.8, bevel: 0.6 }));
  it.push(screws(C, CH.x0 - 1, -1, CH.x1 + 2, CH.y1 + 2, Z0 + 3.8 + CH.h, 2.4));
  // vent slots on the lid
  let vents = "";
  for (let x = 14; x < CH.x1 - 14; x += 4) {
    vents += lineItem(C, [[x, 5, Z0 + 3.8 + CH.h], [x, CH.y1 - 5, Z0 + 3.8 + CH.h]], "faint", 0.6).d;
  }
  it.push({ kind: "line", d: vents, tone: "faint", w: 0.9, layer: 0, key: 12.1 });
  // rack handles on the front face
  for (const x of [CH.x0 + 1.5, CH.x1 - 4.5]) {
    it.push(box(C, x, CH.y1, Z0 + 10, 3, 2.4, 22, "hi", { key: 13, bevel: 0.4 }));
  }
  // bays
  PORTS.forEach((p, i) => {
    const x = bayX(i);
    it.push(box(C, x - 1, CH.y1, Z0 + 6.5, BAY_W + 2, 0.6, 21, protoFam(p.proto), { key: 14 + i * 0.01 }));
    it.push(box(C, x, CH.y1 + 0.6, FLOOR - 1, BAY_W, 0.3, 19, "lo", { key: 14.1 + i * 0.01 }));
    it.push(faceText(C, p.name, [bayC(i), CH.y1, Z0 + 31.5], "+y", 3.1, "hi", { key: 14.2, weight: 700 }));
    it.push(faceText(C, `${p.port}/${p.proto === "UDP" ? "udp" : "tcp"}`, [bayC(i), CH.y1, Z0 + 4.9], "+y", 2.6, protoFam(p.proto), { key: 14.2 }));
    // hinge pins
    it.push(dotsItem(C, [[x + 0.3, CH.y1 + 1, FLOOR + 1.5], [x + 0.3, CH.y1 + 1, FLOOR + 15]], 0.45, "mid", 0));
    (it[it.length - 1] as { key: number }).key = 14.3;
  });
  return sortItems(it);
}

// ---------- the script ----------

type Tok = { label: string; fam: Fam; x: number; y: number; z: number; a: number };
type Frame = { cart: number; toks: Tok[]; door: number; flash: number; established: boolean };
type Seg = { d: number; f: (u: number) => Frame };

const ease = (u: number) => u * u * (3 - 2 * u);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const MOVE = 1.15, IN = 0.55, HOLD = 0.35;

function script(i: number): { segs: Seg[]; summary: string } {
  const p = PORTS[i];
  const bx = bayC(i);
  const open = LISTENING[p.port];
  const udp = p.proto === "UDP";
  const onCart = (label: string, fam: Fam, x: number, k = 0): Tok => ({ label, fam, x, y: TRACK_Y, z: Z0 + 4.4 + k * 4.2, a: 1 });
  const toward = (t: Tok, u: number, stopAtDoor: boolean): Tok => ({
    ...t,
    y: lerp(TRACK_Y, stopAtDoor ? CH.y1 + 7 : CH.y1 - 2, u),
    z: lerp(t.z, FLOOR + (t.z - Z0 - 4.4), u),
    a: stopAtDoor ? 1 : u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1,
  });
  const fromBay = (t: Tok, u: number): Tok => ({ ...t, y: lerp(CH.y1 + 4, TRACK_Y, u), z: lerp(FLOOR, Z0 + 4.4, u), a: Math.min(1, u * 3) });
  const F = (cart: number, toks: Tok[], door = 0, flash = 0, established = false): Frame => ({ cart, toks, door, flash, established });
  const segs: Seg[] = [];
  const out = (toks: (x: number) => Tok[]) => segs.push({ d: MOVE, f: (u) => { const x = lerp(HOME, bx, ease(u)); return F(x, toks(x)); } });
  const back = (tok: Tok, door: number) => segs.push({ d: MOVE, f: (u) => { const x = lerp(bx, HOME, ease(u)); return F(x, [{ ...tok, x }], door * (1 - u)); } });
  const hold = (fr: Frame, d = HOLD) => segs.push({ d, f: () => fr });

  hold(F(HOME, []), 0.4);
  if (udp) {
    out((x) => [onCart("DATA", MSG["DATA"], x)]);
    segs.push({ d: IN, f: (u) => F(bx, [toward(onCart("DATA", MSG["DATA"], bx), ease(u), false)], ease(Math.min(1, u * 1.6)) * 70) });
    hold(F(bx, [], 70, 0, true), 1.2);
    segs.push({ d: 0.6, f: (u) => { const x = lerp(bx, HOME, ease(u)); return F(x, [], 70 * (1 - u), 0, true); } });
    return { segs, summary: `${p.port}/udp ${p.name} · no handshake · data on the first packet` };
  }
  out((x) => [onCart("SYN", MSG["SYN"], x)]);
  if (!open) {
    segs.push({ d: IN, f: (u) => F(bx, [toward(onCart("SYN", MSG["SYN"], bx), ease(u), true)]) });
    hold(F(bx, [{ ...toward(onCart("RST", MSG["RST"], bx), 1, true) }], 0, 1), 0.6);
    segs.push({ d: IN, f: (u) => F(bx, [{ ...toward(onCart("RST", MSG["RST"], bx), 1 - ease(u), true) }], 0, 1 - u) });
    back(onCart("RST", MSG["RST"], bx), 0);
    hold(F(HOME, [onCart("RST", MSG["RST"], HOME)]), 0.8);
    return { segs, summary: `${p.port}/tcp ${p.name} · nothing listening · SYN answered with RST` };
  }
  segs.push({ d: IN, f: (u) => F(bx, [toward(onCart("SYN", MSG["SYN"], bx), ease(u), false)], ease(Math.min(1, u * 1.6)) * 35) });
  segs.push({ d: IN, f: (u) => F(bx, [fromBay(onCart("SYN-ACK", MSG["SYN-ACK"], bx), ease(u))], 35) });
  back(onCart("SYN-ACK", MSG["SYN-ACK"], bx), 35);
  hold(F(HOME, [onCart("SYN-ACK", MSG["SYN-ACK"], HOME)]), 0.25);
  out((x) => [onCart("ACK", MSG["ACK"], x, 0), onCart("DATA", MSG["DATA"], x, 1)]);
  segs.push({ d: IN + 0.2, f: (u) => F(bx, [toward(onCart("ACK", MSG["ACK"], bx, 0), ease(u), false), toward(onCart("DATA", MSG["DATA"], bx, 1), ease(u), false)], ease(Math.min(1, u * 1.6)) * 70) });
  hold(F(bx, [], 70, 0, true), 1.2);
  segs.push({ d: 0.6, f: (u) => { const x = lerp(bx, HOME, ease(u)); return F(x, [], 70 * (1 - u), 0, true); } });
  return { segs, summary: `${p.port}/tcp ${p.name} · SYN → SYN-ACK → ACK · one round trip before data` };
}

function frameAt(segs: Seg[], t: number): { fr: Frame; step: number } {
  let acc = 0;
  for (let k = 0; k < segs.length; k++) {
    if (t <= acc + segs[k].d) return { fr: segs[k].f(Math.max(0, (t - acc) / segs[k].d)), step: k };
    acc += segs[k].d;
  }
  const last = segs[segs.length - 1];
  return { fr: last.f(1), step: segs.length - 1 };
}
const total = (segs: Seg[]) => segs.reduce((s, x) => s + x.d, 0);

// ---------- live parts ----------

function cartItems(x: number): Item[] {
  const it: Item[] = [];
  it.push(box(C, x - 6, TRACK_Y - 5, Z0 + 1.8, 12, 10, 2.6, "hi", { key: 0, bevel: 0.5, r: 0.6 }));
  for (const [dx, dy] of [[-4, -4], [4, -4], [-4, 3.6], [4, 3.6]]) {
    it.push(cyl(C, x + dx, TRACK_Y + dy, Z0 + 1.8, 1.4, 0.01, "lo", { key: -1 }));
  }
  it.push(dotsItem(C, [[x - 5, TRACK_Y + 4, Z0 + 4.4], [x + 5, TRACK_Y + 4, Z0 + 4.4]], 0.4, "mid", 0));
  return sortItems(it);
}

function tokenItems(toks: Tok[]): Item[] {
  return toks.flatMap((t, k) => [
    { ...box(C, t.x - 4.5, t.y - 3.5, t.z, 9, 7, 4, t.fam, { key: k * 2, bevel: 0.4 }) },
    faceText(C, t.label, [t.x, t.y, t.z + 4], "top", t.label.length > 4 ? 1.7 : 2.2, "ink", { key: k * 2 + 1, weight: 700 }),
  ]);
}

function doorItems(i: number, deg: number, listening: boolean, flash: number, established: boolean): Item[] {
  const x = bayX(i) + 0.3, y = CH.y1 + 0.8;
  const a = (deg * Math.PI) / 180, w = BAY_W - 0.6, t = 0.9;
  const ux = Math.cos(a), uy = Math.sin(a);
  const plan: V2[] = [[x, y], [x + w * ux, y + w * uy], [x + w * ux - t * uy, y + w * uy + t * ux], [x - t * uy, y + t * ux]];
  const it: Item[] = [];
  it.push(prism(C, { pts: plan, sharp: [true, true, true, true] }, FLOOR, 17, "hi", { key: 1 }));
  // a pull knob near the free edge
  const kx = x + (w - 2) * ux + t * -uy, ky = y + (w - 2) * uy + t * ux;
  it.push(cyl(C, kx - uy * 0.6, ky + ux * 0.6, FLOOR + 8, 0.8, 1.6, "mid", { key: 2, n: 12 }));
  // status lamp above the bay
  const fam: Fam = flash > 0.05 ? "warn" : established ? "teal" : listening ? "ok" : "lo";
  it.push(box(C, bayX(i) + BAY_W - 3.5, CH.y1 + 0.6, Z0 + 28.3, 3, 1.2, 2, fam, { key: 0, bevel: 0.2 }));
  return it;
}

export function PortBays() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [sel, setSel] = useState(4); // 443
  const [run, setRun] = useState(0); // bump to replay
  const [fr, setFr] = useState<{ fr: Frame; step: number }>({ fr: { cart: HOME, toks: [], door: 0, flash: 0, established: false }, step: 0 });
  const live = useRef({ t: 0, sel: 4, run: 0, tour: 4 });

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const sc = useMemo(() => script(sel), [sel]);

  const choose = (i: number) => { live.current.t = 0; setSel(i); setRun((r) => r + 1); };
  const poke = useTour(() => { live.current.tour = (live.current.tour + 1) % PORTS.length; choose(live.current.tour); }, inView && !reduced, total(sc.segs) + 1.2, 6);

  useLoop((_t, dt) => {
    const L = live.current;
    if (L.sel !== sel || L.run !== run) { L.sel = sel; L.run = run; L.t = 0; }
    const T = total(sc.segs);
    const nt = reduced ? T : Math.min(T, L.t + dt);
    if (nt === L.t && L.t > 0) return;
    L.t = nt;
    setFr(frameAt(sc.segs, L.t));
  }, inView);

  const f = fr.fr;
  const dyn = useMemo(() => {
    const doors: Item[] = [];
    PORTS.forEach((p, i) => doors.push(...doorItems(i, i === sel ? f.door : 0, LISTENING[p.port], i === sel ? f.flash : 0, i === sel && f.established)));
    return { doors, cart: cartItems(f.cart), toks: f.toks.map((t) => ({ a: t.a, items: tokenItems([t]) })) };
  }, [f, sel]);

  const onKey = (e: React.KeyboardEvent) => {
    poke();
    if (e.key === "ArrowRight") { choose((sel + 1) % PORTS.length); e.preventDefault(); }
    if (e.key === "ArrowLeft") { choose((sel + PORTS.length - 1) % PORTS.length); e.preventDefault(); }
    if (e.key === " " || e.key === "Enter") { choose(sel); e.preventDefault(); }
  };

  const p = PORTS[sel];
  return (
    <div>
      <Card
        n={4}
        title="Port bays"
        hint="click a bay · ← → choose · space replay"
        readout={<><b className={p.proto === "UDP" ? "c-violet" : "c-blue"}>{p.port}/{p.proto === "UDP" ? "udp" : "tcp"}</b> {sc.summary.split(" · ").slice(1).join(" · ")}</>}
        viewBox={vb}
        label="A server with six numbered port bays. A cart carries tokens from the client's ephemeral port along a track. TCP sends SYN, receives SYN-ACK, then sends ACK with data; UDP sends data straight away; the closed RDP port answers with RST."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={dyn.doors} />
        <Items items={dyn.cart} />
        {dyn.toks.map((t, k) => <g key={k} opacity={t.a}><Items items={t.items} /></g>)}
        {PORTS.map((_, i) => (
          <path key={i} className="iso-hit" d={box(C, bayX(i) - 2, CH.y1 - 2, Z0, BAY_W + 4, 6, 34, "lo").outline}
            onClick={() => { poke(); choose(i); }}>
            <title>{PORTS[i].port} {PORTS[i].name}</title>
          </path>
        ))}
      </Card>
      <div className="controls">
        <div className="seg">
          {PORTS.map((q, i) => (
            <button key={q.port} className={sel === i ? "on" : ""} onClick={() => { poke(); choose(i); }}>
              {q.port} {q.name}
            </button>
          ))}
        </div>
        <button className="pill-btn" onClick={() => { poke(); choose(sel); }}>↻ Replay</button>
      </div>
      <Legend items={[
        { swatch: "blue", text: "TCP port" },
        { swatch: "violet", text: "UDP port" },
        { swatch: "sig", text: "SYN" },
        { swatch: "teal", text: "SYN-ACK / connection established" },
        { swatch: "ok", text: "ACK · lamp: service listening" },
        { swatch: "rose", text: "Application data" },
        { swatch: "warn", text: "RST: nothing listening" },
      ]} />
      <p className="caption">
        The client's side of every connection uses a random ephemeral port (here {CLIENT_PORT}); the server's side is the well-known port. TCP spends one round trip on the handshake before data can flow; UDP just sends. RDP's bay is closed on purpose: exposing 3389 to the internet is a classic way machines get compromised.
      </p>
    </div>
  );
}
