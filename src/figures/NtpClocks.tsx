import { useMemo, useRef, useState } from "react";
import {
  alongPath, bench, box, boundsOf, camera, cyl, faceText, knurl, labelPlate, line3, screws, sortItems, tube,
  type Fam, type Item, type LineItem, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { follow, useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { exchange, fmtClock, solve, type Stamps } from "../models/ntp";

const C = camera(28, 32);
const Z0 = 7;
const SLOW = 40; // the exchange plays 40× slower than real time
const PROC = 2; // server processing time, ms
const BOX = { w: 46, d: 28, h: 15 };
const SX = 0, CX = 156; // server and client x
const DIAL_R = 10.5;
const top = Z0 + BOX.h;
const dialAt = (x0: number): V3 => [x0 + 16, 14, top + 1.2];
const ROUTE: V3[] = [[SX + 23, BOX.d + 1, Z0 + 1.2], [SX + 23, 44, Z0 + 1.2], [CX + 23, 44, Z0 + 1.2], [CX + 23, BOX.d + 1, Z0 + 1.2]];

function staticItems(): Item[] {
  const it: Item[] = [];
  it.push(...bench(C, -16, -12, 236, 90, Z0));
  it.push(...labelPlate(C, 92, 2, Z0, 26, 7).map((x) => ({ ...x, key: -47 })));
  it.push(...tube(C, ROUTE, "mid", -30, 3));
  // two clock cases
  for (const [x0, fam, title, sub] of [[SX, "violet", "SERVER", "STRATUM 1"], [CX, "rose", "CLIENT", "STRATUM 2"]] as const) {
    it.push(box(C, x0, 0, Z0, BOX.w, BOX.d, BOX.h, "mid", { key: x0, r: 1.2, bevel: 0.7 }));
    it.push(screws(C, x0, 0, BOX.w, BOX.d, top, 2));
    const [dx, dy] = dialAt(x0);
    it.push(cyl(C, dx, dy, top, DIAL_R + 1.4, 1.2, "hi", { key: x0 + 0.1, n: 44 }));
    it.push({ ...knurl(C, dx, dy, top, DIAL_R + 1.4, 1.2, 50), key: x0 + 0.11 });
    it.push(cyl(C, dx, dy, top + 0.6, DIAL_R, 0.6, fam, { key: x0 + 0.12, n: 44 }));
    let minor = "", major = "";
    for (let k = 0; k < 50; k++) {
      const a = -Math.PI / 2 + (k / 50) * Math.PI * 2, big = k % 5 === 0;
      const s = line3(C, [[dx + DIAL_R * (big ? 0.72 : 0.84) * Math.cos(a), dy + DIAL_R * (big ? 0.72 : 0.84) * Math.sin(a), top + 1.2], [dx + DIAL_R * 0.94 * Math.cos(a), dy + DIAL_R * 0.94 * Math.sin(a), top + 1.2]]);
      if (big) major += s; else minor += s;
    }
    it.push({ kind: "line", d: minor, tone: "ink", w: 0.25, layer: 0, key: x0 + 0.13 } as LineItem);
    it.push({ kind: "line", d: major, tone: "ink", w: 0.5, layer: 0, key: x0 + 0.13 } as LineItem);
    for (const [ms, label] of [[0, "0"], [250, "250"], [500, "500"], [750, "750"]] as const) {
      const a = -Math.PI / 2 + (ms / 1000) * Math.PI * 2;
      it.push(faceText(C, label, [dx + DIAL_R * 0.5 * Math.cos(a), dy + DIAL_R * 0.5 * Math.sin(a), top + 1.2], "top", 1.7, "ink", { key: x0 + 0.14, weight: 700 }));
    }
    // plate with name, stratum and port on the top-right
    it.push(box(C, x0 + 31, 3, top, 12, 22, 0.4, fam, { key: x0 + 0.2, r: 0.5 }));
    it.push(faceText(C, title, [x0 + 33, 7, top + 0.4], "top", 2, "ink", { anchor: "start", key: x0 + 0.21, weight: 700 }));
    it.push(faceText(C, sub, [x0 + 33, 11, top + 0.4], "top", 1.5, "ink", { anchor: "start", key: x0 + 0.21 }));
    it.push(faceText(C, "UDP 123", [x0 + 33, 15, top + 0.4], "top", 1.5, "ink", { anchor: "start", key: x0 + 0.21 }));
    // digital window on the front
    it.push(box(C, x0 + 6, BOX.d, Z0 + 4, BOX.w - 12, 0.5, 7, "lo", { key: x0 + 0.3 }));
  }
  // GPS mast behind the server: stratum 0
  it.push(box(C, SX + 40, -9, Z0, 6, 6, 2, "mid", { key: -20, bevel: 0.4 }));
  it.push(box(C, SX + 42, -7, Z0 + 2, 2, 2, 34, "hi", { key: -19.9 }));
  it.push(cyl(C, SX + 43, -6, Z0 + 36, 4.4, 1.4, "sig", { key: -19.8, bevel: 0.4 }));
  it.push(cyl(C, SX + 43, -6, Z0 + 37.4, 1, 2, "hi", { key: -19.7 }));
  // sign plate clamped to the mast
  it.push(box(C, SX + 44, -6.6, Z0 + 26, 18, 0.8, 6, "sig", { key: -19.6, bevel: 0.2 }));
  it.push(faceText(C, "GPS", [SX + 53, -5.8, Z0 + 30.3], "+y", 2.2, "ink", { key: -19.55, weight: 700 }));
  it.push(faceText(C, "STRATUM 0", [SX + 53, -5.8, Z0 + 27.6], "+y", 1.7, "ink", { key: -19.55, weight: 600 }));
  it.push({ kind: "line", d: line3(C, [[SX + 43, -6, Z0 + 2], [SX + 43, -1, Z0 + 1], [SX + 40, 0, Z0 + 4]]), tone: "sig", w: 0.8, layer: 0, key: -19.5 } as LineItem);
  // timestamp rail along the front
  it.push(box(C, 24, 56, Z0, 156, 8, 6, "mid", { key: 30, bevel: 0.5 }));
  return sortItems(it);
}

type Phase = "idle" | "out" | "server" | "back" | "slew";
type Sim = {
  now: number; // true time, ms since 12:00:00
  theta: number; // how far the client clock is ahead, ms
  shownTheta: number;
  phase: Phase;
  send: number;
  dOut: number;
  dBack: number;
  stamps: Stamps | null;
  result: { offset: number; delay: number } | null;
  target: number;
};

export function NtpClocks() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [skew, setSkew] = useState(850);
  const [dOut, setDOut] = useState(40);
  const [dBack, setDBack] = useState(40);
  const S = useRef<Sim>({ now: 0, theta: 850, shownTheta: 850, phase: "idle", send: 0, dOut: 40, dBack: 40, stamps: null, result: null, target: 850 });
  const [, setTick] = useState(0);
  const sim = S.current;

  const sync = () => {
    if (sim.phase !== "idle") return;
    sim.phase = "out";
    sim.send = sim.now;
    sim.dOut = dOut;
    sim.dBack = dBack;
    sim.stamps = exchange(sim.send, sim.theta, dOut, dBack, PROC);
    sim.result = null;
  };
  const setClockError = (v: number) => { setSkew(v); if (sim.phase === "idle") { sim.theta = v; sim.shownTheta = v; sim.stamps = null; sim.result = null; } };

  const poke = useTour(() => {
    if (sim.phase !== "idle") return;
    if (Math.abs(sim.theta) < 60) setClockError([850, -620, 430, -900][Math.floor(Math.random() * 4)]);
    else sync();
  }, inView && !reduced, 5, 6);

  useLoop((_t, dt) => {
    sim.now += (dt * 1000) / (reduced ? 1 : SLOW);
    const e = sim.now - sim.send;
    if (sim.phase === "out" && e >= sim.dOut) sim.phase = "server";
    if (sim.phase === "server" && e >= sim.dOut + PROC) sim.phase = "back";
    if (sim.phase === "back" && e >= sim.dOut + PROC + sim.dBack) {
      sim.result = solve(sim.stamps!);
      sim.target = sim.theta + sim.result.offset;
      sim.phase = "slew";
    }
    if (sim.phase === "slew") {
      sim.shownTheta = follow(sim.shownTheta, sim.target, dt, reduced ? 0.001 : 0.35);
      if (Math.abs(sim.shownTheta - sim.target) < 0.5) { sim.shownTheta = sim.target; sim.theta = sim.target; sim.phase = "idle"; setSkew(Math.round(sim.target)); }
    } else if (sim.phase === "idle") sim.shownTheta = sim.theta;
    setTick((k) => (k + 1) % 1e6);
  }, inView);

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);

  // ---- live parts ----
  const live: Item[] = [];
  const serverTime = sim.now;
  const clientTime = sim.now + sim.shownTheta;
  for (const [x0, t, fam] of [[SX, serverTime, "violet"], [CX, clientTime, "rose"]] as [number, number, Fam][]) {
    const [dx, dy] = dialAt(x0);
    const a = -Math.PI / 2 + ((((t % 1000) + 1000) % 1000) / 1000) * Math.PI * 2;
    live.push({ kind: "line", d: line3(C, [[dx - 1.8 * Math.cos(a), dy - 1.8 * Math.sin(a), top + 1.5], [dx + DIAL_R * 0.86 * Math.cos(a), dy + DIAL_R * 0.86 * Math.sin(a), top + 1.5]]), tone: "ink", w: 0.8, layer: 0, key: 0 } as LineItem);
    live.push(cyl(C, dx, dy, top + 1.2, 1, 0.6, "lit", { key: 1, n: 12 }));
    live.push(faceText(C, fmtClock(t), [x0 + BOX.w / 2, BOX.d + 0.5, Z0 + 7.5], "+y", 3.2, fam, { key: 2, weight: 700 }));
  }
  const e = sim.now - sim.send;
  const pulse = (u: number, fam: Fam, back: boolean) => {
    const p = alongPath(back ? [...ROUTE].reverse() : ROUTE, u);
    live.push(box(C, p[0] - 2.4, p[1] - 2.4, Z0 + 2.6, 4.8, 4.8, 3, fam, { key: 3, bevel: 0.3 }));
  };
  // the client asks, so the request runs client → server and the reply comes back
  if (sim.phase === "out") pulse(e / sim.dOut, "blue", true);
  if (sim.phase === "back") pulse((e - sim.dOut - PROC) / sim.dBack, "teal", false);
  // timestamp tickets on the front rail
  const st = sim.stamps;
  const reached = {
    t1: !!st,
    t2: !!st && (sim.phase !== "out"),
    t3: !!st && (sim.phase === "back" || sim.phase === "slew" || (sim.phase === "idle" && !!sim.result)),
    t4: !!st && (sim.phase === "slew" || (sim.phase === "idle" && !!sim.result)),
  };
  (["t1", "t2", "t3", "t4"] as const).forEach((k, i) => {
    const x = 30 + i * 38;
    const fam: Fam = k === "t1" || k === "t4" ? "rose" : "violet";
    live.push(box(C, x, 55, Z0 + 6, 34, 9, 0.6, reached[k] ? fam : "lo", { key: 10 + i, r: 0.5 }));
    live.push(faceText(C, `${k} ${reached[k] && st ? fmtClock(st[k]).slice(3) : "—"}`, [x + 17, 64, Z0 + 3], "+y", 2.4, reached[k] ? fam : "mid", { key: 10.5 + i, weight: 700 }));
  });

  const r = sim.result;
  const residual = sim.phase === "idle" && r ? sim.theta : null;
  let say: React.ReactNode;
  if (sim.phase === "out") say = <><b className="c-blue">Request</b> · client stamps t1 on its own clock · {sim.dOut} ms on the wire</>;
  else if (sim.phase === "server") say = <><b className="c-violet">Server</b> · stamps t2 on arrival, t3 on reply</>;
  else if (sim.phase === "back") say = <><b className="c-teal">Reply</b> · {sim.dBack} ms back · client stamps t4</>;
  else if (sim.phase === "slew" && r) say = <><b>offset {r.offset.toFixed(0)} ms</b> · delay {r.delay.toFixed(0)} ms · client corrects its clock</>;
  else if (r && residual !== null) say = <><b>Synced</b> · remaining error {residual.toFixed(0)} ms{Math.abs(residual) > 0.5 ? " = (out − back) / 2, from the asymmetric path" : ""}</>;
  else say = <><b>Client clock is {sim.theta > 0 ? `${sim.theta.toFixed(0)} ms fast` : sim.theta < 0 ? `${(-sim.theta).toFixed(0)} ms slow` : "exact"}</b> · press Sync</>;

  const onKey = (ev: React.KeyboardEvent) => {
    poke();
    if (ev.key === " " || ev.key === "Enter") { sync(); ev.preventDefault(); }
    if (ev.key === "ArrowRight") { setClockError(Math.min(1000, skew + 50)); ev.preventDefault(); }
    if (ev.key === "ArrowLeft") { setClockError(Math.max(-1000, skew - 50)); ev.preventDefault(); }
  };

  return (
    <div>
      <Card
        n={9}
        title="Two clocks"
        hint={`space sync · ← → clock error · ${SLOW}× slow motion`}
        readout={say}
        viewBox={vb}
        label="A stratum-1 server clock fed by a GPS mast and a stratum-2 client clock are joined by a cable. The client sends a request stamped t1; the server stamps t2 and t3; the client stamps t4 on the reply, computes its offset and delay, and turns its hand to match. Dials show milliseconds."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={sortItems(live)} />
      </Card>
      <div className="controls">
        <button className="pill-btn" onClick={() => { poke(); sync(); }} disabled={sim.phase !== "idle"}>⟳ Sync now</button>
        <label className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
          client error <input type="range" min={-1000} max={1000} step={10} value={skew} onChange={(ev) => { poke(); setClockError(+ev.target.value); }} /> {skew} ms
        </label>
        <label className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
          out <input type="range" min={5} max={150} value={dOut} onChange={(ev) => { poke(); setDOut(+ev.target.value); }} /> {dOut} ms
        </label>
        <label className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
          back <input type="range" min={5} max={150} value={dBack} onChange={(ev) => { poke(); setDBack(+ev.target.value); }} /> {dBack} ms
        </label>
      </div>
      {st && (
        <p className="mono" style={{ fontSize: 13, margin: "10px 2px 0", overflowWrap: "anywhere", color: "var(--muted)" }}>
          offset = ((<span className="c-violet">t2</span> − <span className="c-rose">t1</span>) + (<span className="c-violet">t3</span> − <span className="c-rose">t4</span>)) / 2
          {r && <> = <span style={{ color: "var(--text)" }}>{r.offset.toFixed(1)} ms</span></>}
          {"   "}delay = (<span className="c-rose">t4</span> − <span className="c-rose">t1</span>) − (<span className="c-violet">t3</span> − <span className="c-violet">t2</span>)
          {r && <> = <span style={{ color: "var(--text)" }}>{r.delay.toFixed(1)} ms</span></>}
        </p>
      )}
      <Legend items={[
        { swatch: "violet", text: "Server clock (stratum 1) · t2, t3" },
        { swatch: "rose", text: "Client clock (stratum 2) · t1, t4" },
        { swatch: "sig", text: "GPS reference (stratum 0)" },
        { swatch: "blue", text: "Request" },
        { swatch: "teal", text: "Reply" },
      ]} />
      <p className="caption">
        Each dial makes one turn per second, so the gap between the two hands is the client's error. NTP never needs to know the one-way delays: it assumes the path is symmetric, and any asymmetry shows up as half its difference in the result. Set <b>out</b> and <b>back</b> unequal and sync to see it.
      </p>
    </div>
  );
}
