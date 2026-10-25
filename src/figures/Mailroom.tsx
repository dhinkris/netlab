import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, cyl, faceText, halo, lerp, line3, prism, rrect, sortItems,
  type Fam, type Item, type LineItem, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";

const C = camera(18, 42);
const FZ = 2, DESK_Z = FZ + 9;
const MACH: V3 = [100, 46, FZ];
const CHUTE: V3 = [160, 46, DESK_Z + 6];
type Mode = "default" | "pip" | "lb" | "natgw";
const VMS = [
  { name: "vm-1", ip: "10.0.1.4", y: 18, pip: "203.0.113.11", lbPorts: [1024, 2047] },
  { name: "vm-2", ip: "10.0.1.5", y: 46, pip: "203.0.113.12", lbPorts: [2048, 3071] },
  { name: "vm-3", ip: "10.0.1.6", y: 74, pip: "203.0.113.13", lbPorts: [3072, 4095] },
];
const DEFAULT_IPS = ["20.62.18.41", "52.168.7.230", "40.79.12.9"]; // examples: Azure-owned, not yours to choose

export const MODES: { id: Mode; label: string; fam: Fam }[] = [
  { id: "default", label: "Default outbound", fam: "mid" },
  { id: "pip", label: "Public IP per VM", fam: "blue" },
  { id: "lb", label: "LB outbound rules", fam: "violet" },
  { id: "natgw", label: "NAT Gateway", fam: "teal" },
];

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-6, -6, 186, 100, 3);
  it.push(halo(C, plan, 5));
  it.push(prism(C, plan, 0, FZ, "mid", { key: -100, bevel: 0.5 }));
  let carpet = "";
  for (let x = 4; x < 180; x += 10) carpet += line3(C, [[x, -6, FZ], [x, 94, FZ]]);
  for (let y = 4; y < 94; y += 10) carpet += line3(C, [[-6, y, FZ], [180, y, FZ]]);
  it.push({ kind: "line", d: carpet, tone: "faint", w: 0.35, layer: 0, key: -99 } as LineItem);
  it.push(box(C, -6, -6, FZ, 186, 4, 34, "hi", { key: -90 }));
  it.push(faceText(C, "VNET 10.0.1.0/24 · private subnet", [4, -2, FZ + 27], "+y", 3.4, "ink", { anchor: "start", key: -89, weight: 700 }));
  // the outgoing mail chute, a standing cabinet with a slot facing the room
  it.push(box(C, CHUTE[0], CHUTE[1] - 12, FZ, 14, 24, 30, "sig", { key: 50, bevel: 0.5 }));
  it.push(faceText(C, "MAIL OUT", [CHUTE[0] + 7, CHUTE[1] + 12, FZ + 24], "+y", 2.6, "ink", { key: 50.2, weight: 700 }));
  it.push(faceText(C, "→ INTERNET", [CHUTE[0] + 7, CHUTE[1] + 12, FZ + 20], "+y", 2.2, "ink", { key: 50.2, weight: 700 }));
  // desks
  VMS.forEach((v, i) => {
    const k = i * 0.1;
    for (const [dx, dy] of [[0, 0], [30, 0], [0, 16], [30, 16]]) it.push(box(C, 16 + dx, v.y - 8 + dy, FZ, 1.4, 1.4, DESK_Z - FZ, "lo", { key: k }));
    it.push(box(C, 15, v.y - 9, DESK_Z, 34, 19, 1.4, "sand", { key: k + 0.01, bevel: 0.3 }));
    it.push(box(C, 18, v.y - 7, DESK_Z + 1.4, 12, 2, 8, "lo", { key: k + 0.02, bevel: 0.3 }));
    it.push(box(C, 19, v.y - 5, DESK_Z + 3, 10, 0.3, 5, "sea", { key: k + 0.03 }));
    it.push(faceText(C, `${v.name} ${v.ip}`, [32, v.y + 10, DESK_Z + 0.7], "+y", 2, "ink", { key: k + 0.04, weight: 700 }));
  });
  return sortItems(it);
}

function machineItems(mode: Mode, used: number[]): Item[] {
  const it: Item[] = [];
  const [x, y] = MACH;
  if (mode === "default") {
    it.push(box(C, x - 6, y - 6, FZ, 12, 12, 10, "mid", { key: 0, bevel: 0.4 }));
    it.push(faceText(C, "?", [x, y + 6, FZ + 5], "+y", 6, "warn", { key: 0.1, weight: 700 }));
    it.push(faceText(C, "Azure picks an IP", [x, y + 6, FZ + 1.5], "+y", 1.6, "ink", { key: 0.1 }));
  } else if (mode === "lb") {
    it.push(box(C, x - 10, y - 9, FZ, 20, 18, 14, "violet", { key: 0, bevel: 0.5 }));
    it.push(faceText(C, "LOAD BALANCER", [x, y + 9, FZ + 10], "+y", 1.8, "ink", { key: 0.1, weight: 700 }));
    it.push(faceText(C, "203.0.113.40", [x, y + 9, FZ + 7], "+y", 1.8, "ink", { key: 0.1 }));
    it.push(faceText(C, "1,024 ports / VM", [x, y + 9, FZ + 4], "+y", 1.6, "ink", { key: 0.1 }));
    // each desk's pre-cut sheet of stamps, shrinking as it's used
    VMS.forEach((v, i) => {
      const left = Math.max(0.15, 1 - used[i] / 14);
      it.push(box(C, 36, v.y - 4, DESK_Z + 1.4, 9, 7, 3 * left, "violet", { key: 1 + i * 0.1 }));
    });
  } else if (mode === "natgw") {
    it.push(box(C, x - 14, y - 12, FZ, 28, 24, 16, "teal", { key: 0, bevel: 0.6 }));
    for (const dy of [-6, 0, 6]) it.push(cyl(C, x + 14.5, y + dy, FZ + 8, 2.2, 0.01, "hi", { key: 0.05 }));
    it.push(box(C, x - 10, y + 12, FZ + 5, 20, 0.4, 8, "lo", { key: 0.1 }));
    it.push(faceText(C, "NAT GATEWAY", [x, y + 12.4, FZ + 11], "+y", 2, "teal", { key: 0.2, weight: 700 }));
    it.push(faceText(C, "203.0.113.50", [x, y + 12.4, FZ + 8.2], "+y", 1.9, "hi", { key: 0.2, weight: 700 }));
    it.push(faceText(C, "64,512 ports, on demand", [x, y + 12.4, FZ + 6], "+y", 1.4, "hi", { key: 0.2 }));
  } else {
    // a personal stamp on every desk
    VMS.forEach((v, i) => {
      it.push(cyl(C, 42, v.y, DESK_Z + 1.4, 2.4, 3, "blue", { key: 1 + i * 0.1, n: 14 }));
      it.push(cyl(C, 42, v.y, DESK_Z + 4.4, 1.2, 3, "hi", { key: 1.01 + i * 0.1, n: 10 }));
      it.push(faceText(C, v.pip, [42, v.y + 4, DESK_Z + 1.5], "top", 1.6, "blue", { key: 1.02 + i * 0.1, weight: 700 }));
    });
  }
  return it;
}

type Letter = { at: V3; stamp: string; fam: Fam };

function letterAt(mode: Mode, i: number, n: number, u: number): Letter {
  const v = VMS[i];
  const desk: V3 = [44, v.y, DESK_Z + 1.6];
  const viaMachine = mode !== "pip";
  const port = mode === "natgw" ? 1024 + n : mode === "lb" ? v.lbPorts[0] + (n % 1024) : 40000 + ((n * 7919) % 20000);
  const stamp = mode === "default" ? `${DEFAULT_IPS[(n + i) % 3]}:${port}` : mode === "pip" ? `${v.pip}:${50000 + n}` : mode === "lb" ? `203.0.113.40:${port}` : `203.0.113.50:${port}`;
  let at: V3;
  const mid: V3 = [MACH[0], MACH[1], FZ + (mode === "natgw" ? 17 : 15)];
  if (viaMachine) {
    if (u < 0.5) { const t = u / 0.5; at = [lerp(desk[0], mid[0], t), lerp(desk[1], mid[1], t), lerp(desk[2], mid[2], t) + Math.sin(Math.PI * t) * 10]; }
    else { const t = (u - 0.5) / 0.5; at = [lerp(mid[0], CHUTE[0], t), lerp(mid[1], CHUTE[1], t), lerp(mid[2], CHUTE[2], t) + Math.sin(Math.PI * t) * 8]; }
  } else at = [lerp(desk[0], CHUTE[0], u), lerp(desk[1], CHUTE[1], u), lerp(desk[2], CHUTE[2], u) + Math.sin(Math.PI * u) * 14];
  const stamped = !viaMachine || u >= 0.5;
  return { at, stamp: stamped ? stamp : `${v.ip}:${49152 + n}`, fam: stamped ? (MODES.find((m) => m.id === mode)!.fam === "mid" ? "warn" : MODES.find((m) => m.id === mode)!.fam) : "hi" };
}

export function Mailroom() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [mode, setMode] = useState<Mode>("natgw");
  const S = useRef({ t: 0, tour: 0 });
  const [, setTick] = useState(0);

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y - 10} ${b.w} ${b.h + 10}`; }, [stat]);
  const poke = useTour(() => { const order: Mode[] = ["default", "pip", "lb", "natgw"]; setMode(order[++S.current.tour % 4]); S.current.t = 0; }, inView && !reduced, 6, 6);
  useLoop((_t, dt) => { S.current.t += reduced ? 0 : dt; setTick((k) => (k + 1) % 1e6); }, inView);

  const t = S.current.t;
  const PERIOD = 2.4, FLY = 2.0;
  const letters: Letter[] = [];
  const used = [0, 0, 0];
  let latest: Letter | null = null, latestVm = 0;
  VMS.forEach((_, i) => {
    const t0 = t - i * 0.8;
    if (t0 < 0) return;
    const n = Math.floor(t0 / PERIOD);
    used[i] = n + 1;
    const u = (t0 - n * PERIOD) / FLY;
    if (u <= 1) { const l = letterAt(mode, i, n * 3 + i, u); letters.push(l); if (u > 0.5) { latest = l; latestVm = i; } }
  });
  const dyn: Item[] = [...machineItems(mode, used)];
  letters.forEach((l, k) => {
    dyn.push(box(C, l.at[0] - 6, l.at[1] - 3.6, l.at[2], 12, 7.2, 1, "hi", { key: 10 + k }));
    dyn.push(box(C, l.at[0] + 2.4, l.at[1] - 3, l.at[2] + 1, 3, 2.6, 0.4, l.fam, { key: 10.1 + k }));
    dyn.push(faceText(C, l.stamp, [l.at[0], l.at[1] + 7.4, l.at[2] + 0.5], "top", 2.2, l.fam === "hi" ? "mid" : l.fam, { key: 10.2 + k, weight: 700 }));
  });

  const L = latest as Letter | null;
  const say = {
    default: <><b>Default outbound</b> · Azure picks an IP you don't own and can't predict{L ? <> · {VMS[latestVm].name} left as {L.stamp.split(":")[0]}</> : null}</>,
    pip: <><b className="c-blue">Public IP per VM</b> · each VM leaves as itself{L ? <> · {VMS[latestVm].name} = {L.stamp.split(":")[0]}</> : null} · and each is reachable from the internet</>,
    lb: <><b className="c-violet">LB outbound rules</b> · one shared IP, but every VM gets a fixed block of ports up front</>,
    natgw: <><b className="c-teal">NAT Gateway</b> · every VM leaves as 203.0.113.50 · ports handed out on demand</>,
  }[mode];

  return (
    <div>
      <Card
        n={26}
        title="Mailroom"
        hint="pick how mail is franked"
        readout={say}
        viewBox={vb}
        label="An office mailroom. Three desks are VMs sending letters to the internet through a chute in the wall. Depending on the outbound option, letters leave stamped with an unpredictable Azure-owned address, each desk's own public IP, a load balancer's shared IP from a pre-cut sheet of ports, or a NAT gateway's single IP with ports allocated on demand."
        onKeyDown={() => poke()}
        svgRef={svgRef}
      >
        <Items items={stat.filter((i) => i.key < 50)} />
        <Items items={sortItems(dyn)} />
        <Items items={stat.filter((i) => i.key >= 50)} />
      </Card>
      <div className="controls">
        <div className="seg">
          {MODES.map((m) => <button key={m.id} className={mode === m.id ? "on" : ""} onClick={() => { poke(); setMode(m.id); S.current.t = 0; }}>{m.label}</button>)}
        </div>
      </div>
      <div className="table-wrap">
        <table style={{ fontSize: 13.5 }}>
          <thead><tr><th>Option</th><th>Source IP</th><th>Predictable?</th><th>SNAT ports</th><th>Inbound exposure</th></tr></thead>
          <tbody>
            <tr style={{ fontWeight: mode === "default" ? 700 : 400 }}><td>Default outbound</td><td>Azure-owned, shared</td><td>No, can change</td><td>Limited, opaque</td><td>None</td></tr>
            <tr style={{ fontWeight: mode === "pip" ? 700 : 400 }}><td className="c-blue">Public IP per VM</td><td>One per VM</td><td>Yes (static)</td><td>All 64k for that VM</td><td><b>Yes</b>, each VM is internet-facing</td></tr>
            <tr style={{ fontWeight: mode === "lb" ? 700 : 400 }}><td className="c-violet">LB outbound rules</td><td>LB frontend IP(s)</td><td>Yes</td><td>Pre-allocated per VM</td><td>Only via LB inbound rules</td></tr>
            <tr style={{ fontWeight: mode === "natgw" ? 700 : 400 }}><td className="c-teal">NAT Gateway</td><td>Gateway IP(s) / prefix</td><td>Yes</td><td>64,512 per IP, on demand</td><td>None (outbound only)</td></tr>
          </tbody>
        </table>
      </div>
      <Legend items={[
        { swatch: "lit", text: "Letter = outbound connection" },
        { swatch: "warn", text: "Unpredictable source IP" },
        { swatch: "teal", text: "Recommended: NAT Gateway" },
      ]} />
      <p className="caption">
        Every letter leaves with a private return address (10.0.1.x) and must be re-stamped with a public one before it can go out. The options differ in whose stamp it is, whether it ever changes, and how many stamps each VM can use at once.
      </p>
    </div>
  );
}
