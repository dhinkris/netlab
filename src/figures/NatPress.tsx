import { useMemo, useRef, useState } from "react";
import {
  alongPath, bench, box, boundsOf, camera, cyl, ease, faceText, frameAt, labelPlate, line3, lerp, screws, sortItems,
  totalOf, tube, type Fam, type Item, type LineItem, type Seg, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { FIRST_PORT, IDLE_TIMEOUT_MIN, PUBLIC_IP, SERVER, SNAT_PORTS_PER_IP, STRANGER, VMS, type Mapping } from "../models/nat";
import { fmt } from "../models/cidr";

const C = camera(30, 31);
const Z0 = 7;
const PZ = Z0 + 1.6; // packet floor on the belts
const NAT = { x0: 84, x1: 124, y0: 14, y1: 38 };
const BED_Z = Z0 + 4;
const LANE_Y = 26;
const STAMP_X = (NAT.x0 + NAT.x1) / 2;
const VM_Y = [11, 47];
const SRV_X = 176;
const STR_Y = 62;

const routeOut = (vm: number): V3[] => [[34, VM_Y[vm], PZ], [62, VM_Y[vm], PZ], [62, LANE_Y, PZ], [NAT.x0, LANE_Y, BED_Z]];
const toServer: V3[] = [[NAT.x1, LANE_Y, BED_Z], [SRV_X - 16, LANE_Y, PZ]];
const fromStranger: V3[] = [[SRV_X - 14, STR_Y, PZ], [146, STR_Y, PZ], [146, LANE_Y + 0.01, PZ], [NAT.x1, LANE_Y, BED_Z]];

function staticBack(): Item[] {
  const it: Item[] = [];
  it.push(...bench(C, -16, -14, 230, 98, Z0));
  it.push(...labelPlate(C, 182, 2, Z0, 26, 7).map((x) => ({ ...x, key: -47 })));
  // VNet tray holding the private VMs
  it.push(box(C, -8, -6, Z0, 48, 70, 0.8, "lo", { key: -40, r: 2 }));
  it.push({ kind: "line", d: line3(C, [[-6, -4, Z0 + 0.8], [38, -4, Z0 + 0.8], [38, 62, Z0 + 0.8], [-6, 62, Z0 + 0.8]], true), tone: "teal", w: 0.6, layer: 0, key: -39 } as LineItem);
  it.push(faceText(C, "VNET 10.0.1.0/24 · PRIVATE", [-4, 58.5, Z0 + 0.8], "top", 2.1, "teal", { anchor: "start", key: -39, weight: 700 }));
  // belts (cables drawn as tubes on the floor)
  VMS.forEach((_, i) => it.push(...tube(C, routeOut(i).slice(0, 3).concat([[NAT.x0, LANE_Y, PZ]]), "teal", -30 + i * 0.01, 3.2)));
  it.push(...tube(C, [[NAT.x1, LANE_Y, PZ], [SRV_X - 16, LANE_Y, PZ]], "sig", -30.1, 3.2));
  it.push(...tube(C, fromStranger.slice(0, 3).concat([[NAT.x1 + 0.1, LANE_Y + 0.02, PZ]]), "warn", -30.2, 2.4));
  // VMs
  VMS.forEach((vm, i) => {
    const y0 = VM_Y[i] - 9;
    it.push(box(C, 0, y0, Z0, 32, 18, 12, "mid", { key: -20 + i, r: 1, bevel: 0.6 }));
    it.push(box(C, 2.5, y0 + 2.5, Z0 + 12, 27, 13, 0.4, "teal", { key: -19.9 + i, r: 0.5 }));
    it.push(faceText(C, vm.name, [5, y0 + 6.5, Z0 + 12.4], "top", 2.4, "ink", { anchor: "start", key: -19.8 + i, weight: 700 }));
    it.push(faceText(C, vm.ip, [5, y0 + 10.5, Z0 + 12.4], "top", 2.3, "ink", { anchor: "start", key: -19.8 + i }));
  });
  // NAT gateway: bed, back posts, bridge
  it.push(box(C, NAT.x0, NAT.y0, Z0, NAT.x1 - NAT.x0, NAT.y1 - NAT.y0, 4, "mid", { key: 0, bevel: 0.6 }));
  it.push(box(C, NAT.x0 + 2, LANE_Y - 4.5, BED_Z, NAT.x1 - NAT.x0 - 4, 9, 0.3, "lo", { key: 0.1 }));
  for (const x of [NAT.x0 + 1, NAT.x1 - 5]) it.push(box(C, x, NAT.y0 + 1, BED_Z, 4, 4, 26, "hi", { key: 1, bevel: 0.4 }));
  // translation ledger behind the gateway
  it.push(box(C, NAT.x0 - 8, 0, Z0, NAT.x1 - NAT.x0 + 16, 3, 40, "lo", { key: -10, bevel: 0.5 }));
  it.push(faceText(C, "PRIVATE  ⇄  PUBLIC", [STAMP_X, 3, Z0 + 36.5], "+y", 2.4, "sig", { key: -9.9, weight: 700 }));
  it.push({ kind: "line", d: line3(C, [[NAT.x0 - 6, 3, Z0 + 34.4], [NAT.x1 + 6, 3, Z0 + 34.4]]), tone: "mid", w: 0.4, layer: 0, key: -9.9 } as LineItem);
  // reject bin under the gateway's public side
  it.push(box(C, NAT.x1 + 2, LANE_Y + 6, Z0, 12, 10, 6, "lo", { key: 3, bevel: 0.4, noTop: true }));
  it.push(box(C, NAT.x1 + 3, LANE_Y + 7, Z0 + 0.5, 10, 8, 0.4, "warn", { key: 3.1 }));
  // internet side
  it.push(box(C, SRV_X - 16, 14, Z0, 34, 24, 16, "mid", { key: 4, r: 1, bevel: 0.6 }));
  it.push(box(C, SRV_X - 13.5, 16.5, Z0 + 16, 29, 19, 0.4, "sig", { key: 4.1, r: 0.5 }));
  it.push(faceText(C, "web server", [SRV_X - 10, 21, Z0 + 16.4], "top", 2.4, "ink", { anchor: "start", key: 4.2, weight: 700 }));
  it.push(faceText(C, `${SERVER.ip}:${SERVER.port}`, [SRV_X - 10, 25.5, Z0 + 16.4], "top", 2.1, "ink", { anchor: "start", key: 4.2 }));
  it.push(faceText(C, "INTERNET", [SRV_X - 10, 30, Z0 + 16.4], "top", 1.8, "ink", { anchor: "start", key: 4.2 }));
  it.push(box(C, SRV_X - 14, STR_Y - 7, Z0, 26, 14, 9, "mid", { key: 5, r: 1, bevel: 0.5 }));
  it.push(box(C, SRV_X - 12, STR_Y - 5, Z0 + 9, 22, 10, 0.4, "warn", { key: 5.1, r: 0.5 }));
  it.push(faceText(C, `stranger ${STRANGER}`, [SRV_X - 10.5, STR_Y, Z0 + 9.4], "top", 1.9, "ink", { anchor: "start", key: 5.2, weight: 700 }));
  return sortItems(it);
}

function staticFront(): Item[] {
  // front posts of the press stand in front of the lane
  const it: Item[] = [];
  for (const x of [NAT.x0 + 1, NAT.x1 - 5]) it.push(box(C, x, NAT.y1 - 5, BED_Z, 4, 4, 26, "hi", { key: 0, bevel: 0.4 }));
  // the bridge lid sits above the ram, so it is painted after it
  it.push(box(C, NAT.x0, NAT.y0, BED_Z + 26, NAT.x1 - NAT.x0, NAT.y1 - NAT.y0, 4, "sig", { key: 2, bevel: 0.6 }));
  it.push(screws(C, NAT.x0, NAT.y0, NAT.x1 - NAT.x0, NAT.y1 - NAT.y0, BED_Z + 30, 2));
  it.push(faceText(C, "NAT GATEWAY", [STAMP_X, NAT.y0 + 7, BED_Z + 30], "top", 3, "ink", { key: 2.1, weight: 700 }));
  it.push(faceText(C, PUBLIC_IP, [STAMP_X, NAT.y0 + 12.5, BED_Z + 30], "top", 2.6, "ink", { key: 2.1 }));
  it.push(cyl(C, STAMP_X, LANE_Y, BED_Z + 24.5, 2.2, 1.5, "hi", { key: 1.9 }));
  return sortItems(it);
}

// ---------- script ----------

type Pkt = { at: V3; pub: boolean; label: string; reply: boolean; blocked?: boolean; alpha: number };
type Fr = { pkt: Pkt | null; ram: number; rows: Mapping[]; hot: number; say: string };

const RAM_UP = BED_Z + 20, RAM_DOWN = BED_Z + 4.3;

function script(kind: "vm0" | "vm1" | "stranger", rows: Mapping[]): { segs: Seg<Fr>[]; rowsAfter: Mapping[] } {
  const segs: Seg<Fr>[] = [];
  const F = (p: Partial<Fr>): Fr => ({ pkt: null, ram: RAM_UP, rows, hot: -1, say: "", ...p });
  const travel = (path: V3[], pkt: Omit<Pkt, "at" | "alpha">, say: string, rowsNow: Mapping[], hot = -1) => {
    let L = 0;
    for (let k = 1; k < path.length; k++) L += Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]);
    segs.push({ d: 0.3 + L / 70, f: (u) => F({ pkt: { ...pkt, at: alongPath(path, ease(u)), alpha: 1 }, rows: rowsNow, hot, say }) });
  };
  const stamp = (before: Omit<Pkt, "at" | "alpha">, after: Omit<Pkt, "at" | "alpha">, sayDown: string, rowsBefore: Mapping[], rowsAfter: Mapping[], hot: number) => {
    const at: V3 = [STAMP_X, LANE_Y, BED_Z];
    segs.push({ d: 0.45, f: (u) => F({ pkt: { ...before, at, alpha: 1 }, ram: lerp(RAM_UP, RAM_DOWN, ease(u)), rows: rowsBefore, hot, say: sayDown }) });
    segs.push({ d: 0.35, f: () => F({ pkt: { ...after, at, alpha: 1 }, ram: RAM_DOWN, rows: rowsAfter, hot, say: sayDown }) });
    segs.push({ d: 0.45, f: (u) => F({ pkt: { ...after, at, alpha: 1 }, ram: lerp(RAM_DOWN, RAM_UP, ease(u)), rows: rowsAfter, hot, say: sayDown }) });
  };
  if (kind === "stranger") {
    const p = { pub: true, label: `${STRANGER}`, reply: false };
    travel(fromStranger, p, `Unsolicited inbound · ${STRANGER} → ${PUBLIC_IP}:${FIRST_PORT + 7}`, rows);
    segs.push({ d: 0.5, f: (u) => F({ pkt: { ...p, at: [NAT.x1 - 2, LANE_Y, BED_Z], alpha: 1 }, ram: lerp(RAM_UP, RAM_DOWN + 6, ease(u)), say: "Gateway looks up the translation table · no matching flow" }) });
    segs.push({ d: 0.8, f: (u) => F({ pkt: { ...p, blocked: true, at: [lerp(NAT.x1 - 2, NAT.x1 + 8, ease(u)), lerp(LANE_Y, LANE_Y + 11, ease(u)), lerp(BED_Z, Z0 + 1, ease(u))], alpha: 1 - u * 0.5 }, ram: lerp(RAM_DOWN + 6, RAM_UP, ease(u)), say: "Dropped · a NAT gateway only lets in replies to flows started from inside" }) });
    segs.push({ d: 1.4, f: () => F({ say: "Dropped · a NAT gateway only lets in replies to flows started from inside" }) });
    return { segs, rowsAfter: rows };
  }
  const vm = kind === "vm0" ? 0 : 1;
  const v = VMS[vm];
  let idx = rows.findIndex((r) => r.vm === vm);
  let rowsAfter = rows;
  const port = idx >= 0 ? rows[idx].pub : String(FIRST_PORT + rows.length);
  if (idx < 0) { rowsAfter = [...rows, { vm, priv: `${v.ip}:${v.port}`, pub: port }]; idx = rowsAfter.length - 1; }
  const priv = { pub: false, label: `${v.ip}`, reply: false };
  const pub = { pub: true, label: `${PUBLIC_IP}`, reply: false };
  travel(routeOut(vm), priv, `${v.name} sends · src ${v.ip}:${v.port} → ${SERVER.ip}:${SERVER.port}`, rows);
  travel([[NAT.x0, LANE_Y, BED_Z], [STAMP_X, LANE_Y, BED_Z]], priv, "Into the gateway", rows);
  stamp(priv, pub, `SNAT · src rewritten to ${PUBLIC_IP}:${port} · ${idx === rows.length ? "new" : "existing"} table entry`, rows, rowsAfter, idx);
  travel([[STAMP_X, LANE_Y, BED_Z], ...toServer], pub, `Out to the internet · the server only ever sees ${PUBLIC_IP}:${port}`, rowsAfter, idx);
  segs.push({ d: 0.5, f: () => F({ rows: rowsAfter, hot: idx, say: "Server answers to the address it saw" }) });
  const rpub = { pub: true, label: `${PUBLIC_IP}`, reply: true };
  const rpriv = { pub: false, label: `${v.ip}`, reply: true };
  travel([...toServer].reverse().concat([[STAMP_X, LANE_Y, BED_Z]]), rpub, `Reply · ${SERVER.ip}:${SERVER.port} → ${PUBLIC_IP}:${port}`, rowsAfter, idx);
  stamp(rpub, rpriv, `Table hit · ${port} belongs to ${v.ip}:${v.port} · destination rewritten back`, rowsAfter, rowsAfter, idx);
  travel([[STAMP_X, LANE_Y, BED_Z], ...[...routeOut(vm)].reverse()], rpriv, `Delivered to ${v.name} · it never knew its address was shared`, rowsAfter, idx);
  segs.push({ d: 1.2, f: () => F({ rows: rowsAfter, hot: idx, say: `Delivered to ${v.name} · it never knew its address was shared` }) });
  return { segs, rowsAfter };
}

function pktItems(p: Pkt | null): Item[] {
  if (!p) return [];
  const [x, y, z] = p.at;
  const fam: Fam = p.blocked ? "warn" : p.pub ? "sig" : "teal";
  return [
    box(C, x - 6, y - 3.5, z, 12, 7, 3.4, "hi", { key: 0, bevel: 0.3 }),
    box(C, x - 5.4, y - 2.9, z + 3.4, 10.8, 5.8, 0.6, fam, { key: 0.1 }),
    faceText(C, p.label, [x, y, z + 4], "top", 1.35, "ink", { key: 0.2, weight: 700 }),
  ];
}

function ramItems(z: number): Item[] {
  return [
    box(C, STAMP_X - 1, LANE_Y - 1, z + 3, 2, 2, BED_Z + 24.5 - z - 3, "lit", { key: 0 }),
    box(C, STAMP_X - 7, LANE_Y - 5, z, 14, 10, 3, "sig", { key: 1, bevel: 0.5 }),
  ];
}

function ledgerItems(rows: Mapping[], hot: number): Item[] {
  const it: Item[] = [];
  rows.slice(-4).forEach((r, k) => {
    const z = Z0 + 30 - k * 5.4;
    it.push(faceText(C, r.priv, [NAT.x0 - 5, 3, z], "+y", 2.2, "teal", { anchor: "start", key: k, weight: k === hot ? 700 : 400 }));
    it.push(faceText(C, `⇄ :${r.pub}`, [NAT.x1 + 5, 3, z], "+y", 2.2, "sig", { anchor: "end", key: k, weight: k === hot ? 700 : 400 }));
  });
  if (!rows.length) it.push(faceText(C, "(empty)", [STAMP_X, 3, Z0 + 30], "+y", 2, "mid", { key: 0 }));
  return it;
}

export function NatPress() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [rows, setRows] = useState<Mapping[]>([]);
  const [job, setJob] = useState<{ n: number; kind: "vm0" | "vm1" | "stranger"; rows: Mapping[] }>({ n: 0, kind: "vm0", rows: [] });
  const [fr, setFr] = useState<Fr>({ pkt: null, ram: RAM_UP, rows: [], hot: -1, say: "Send a packet from a VM, or try reaching a VM from outside" });
  const live = useRef({ t: 0, n: -1, done: false, tour: 0, rows: [] as Mapping[] });

  const back = useMemo(() => staticBack(), []);
  const front = useMemo(() => staticFront(), []);
  const vb = useMemo(() => { const b = boundsOf(back, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [back]);
  const sc = useMemo(() => script(job.kind, job.rows), [job]);

  const send = (kind: "vm0" | "vm1" | "stranger") => setJob((j) => ({ n: j.n + 1, kind, rows: live.current.rows }));

  const poke = useTour(() => {
    const seq: ("vm0" | "vm1" | "stranger")[] = ["vm0", "vm1", "stranger"];
    send(seq[live.current.tour++ % 3]);
  }, inView && !reduced, 11, 5);

  useLoop((_t, dt) => {
    const L = live.current;
    if (L.n !== job.n) { L.n = job.n; L.t = 0; L.done = false; }
    if (L.done) return;
    const T = totalOf(sc.segs);
    L.t = reduced ? T : Math.min(T, L.t + dt);
    const f = frameAt(sc.segs, L.t).fr;
    setFr(f);
    if (L.t >= T) { L.done = true; L.rows = sc.rowsAfter; setRows(sc.rowsAfter); }
  }, inView);

  const dyn = useMemo(() => ({ pkt: pktItems(fr.pkt), ram: ramItems(fr.ram), ledger: ledgerItems(fr.rows, fr.hot) }), [fr]);
  const onKey = (e: React.KeyboardEvent) => {
    poke();
    if (e.key === "1") send("vm0");
    if (e.key === "2") send("vm1");
    if (e.key === "3") send("stranger");
  };

  return (
    <div>
      <Card
        n={8}
        title="Translation press"
        hint="1 vm-web · 2 vm-api · 3 stranger"
        readout={<>{fr.say.split(" · ").map((s, i) => (i === 0 ? <b key={i}>{s}</b> : <span key={i}> · {s}</span>))}</>}
        viewBox={vb}
        label="Two private VMs send packets along belts into a NAT gateway press. The press stamps each packet's private source with the gateway's public IP and a unique port, writes the pair on a ledger, and reverses it for the reply. A packet from a stranger with no ledger entry falls into a reject bin."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={back} />
        <Items items={dyn.ledger} />
        <g opacity={fr.pkt?.alpha ?? 1}><Items items={dyn.pkt} /></g>
        <Items items={dyn.ram} />
        <Items items={front} />
      </Card>
      <div className="controls">
        <button className="pill-btn" onClick={() => { poke(); send("vm0"); }}><span className="c-teal">●</span> vm-web → web server</button>
        <button className="pill-btn" onClick={() => { poke(); send("vm1"); }}><span className="c-teal">●</span> vm-api → web server</button>
        <button className="pill-btn" onClick={() => { poke(); send("stranger"); }}><span className="c-rose">●</span> stranger → {PUBLIC_IP}</button>
        <button className="pill-btn" onClick={() => { poke(); live.current.rows = []; setRows([]); setFr((f) => ({ ...f, rows: [], hot: -1, say: `Table cleared · entries expire after ${IDLE_TIMEOUT_MIN} min idle` })); }}>Expire entries</button>
        <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>SNAT ports in use {rows.length} / {fmt(SNAT_PORTS_PER_IP)}</span>
      </div>
      <Legend items={[
        { swatch: "teal", text: "Private address (inside the VNet)" },
        { swatch: "sig", text: "Public address (what the internet sees)" },
        { swatch: "warn", text: "Unsolicited inbound: no entry, dropped" },
      ]} />
      <p className="caption">
        Both VMs leave as {PUBLIC_IP}; the gateway tells their flows apart by the public port it hands each one ({FIRST_PORT}, {FIRST_PORT + 1}, …). One public IP has {fmt(SNAT_PORTS_PER_IP)} such ports (1024–65535). A packet arriving from outside matches no entry, so it has nowhere to go.
      </p>
    </div>
  );
}
