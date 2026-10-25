import { useMemo, useRef, useState } from "react";
import {
  alongPath, box, boundsOf, camera, cyl, ease, faceText, frameAt, halo, lerp, line3, prism, rrect, sortItems, totalOf,
  type Fam, type Item, type LineItem, type Seg, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";

const C = camera(20, 26);
const FZ = 2; // floor top
const WALL_H = 52;
const IN_X = 22, OUT_X = 178, LANE_Y = 52, DESK_X = 100;
const VM = "10.0.1.4", EPH = 51514, SRV = "198.51.100.7";
const PATH_OUT: V3[] = [[IN_X, 6, FZ], [IN_X, LANE_Y, FZ], [OUT_X, LANE_Y, FZ], [OUT_X, 6, FZ]];
const PATH_IN: V3[] = [...PATH_OUT].reverse();
const STOP = (() => { for (let k = 0; k <= 400; k++) if (alongPath(PATH_OUT, k / 400)[0] >= DESK_X - 4) return k / 400; return 0.5; })();
const STOP_IN = (() => { for (let k = 0; k <= 400; k++) if (alongPath(PATH_IN, k / 400)[0] <= DESK_X + 4) return k / 400; return 0.5; })();

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-8, -6, 216, 84, 4);
  it.push(halo(C, plan, 5));
  it.push(prism(C, plan, 0, FZ, "sand", { key: -100, bevel: 0.6 }));
  let planks = "";
  for (let y = 4; y < 78; y += 6) planks += line3(C, [[-8, y, FZ], [208, y, FZ]]);
  for (let y = 4, r = 0; y < 78; y += 6, r++) for (let x = (r % 3) * 22; x < 208; x += 66) planks += line3(C, [[x, y, FZ], [x, y + 6, FZ]]);
  it.push({ kind: "line", d: planks, tone: "faint", w: 0.4, layer: 0, key: -99 } as LineItem);
  // back wall with skirting and a dado rail
  it.push(box(C, -8, -6, FZ, 216, 6, WALL_H, "hi", { key: -90 }));
  it.push(box(C, -8, 0, FZ, 216, 0.8, 3, "mid", { key: -89.9 }));
  it.push(box(C, -8, 0, FZ + 20, 216, 0.6, 1, "mid", { key: -89.8 }));
  // two doorways: inside (left) and outside (right)
  for (const [x, label, fam, sub] of [[IN_X, "INSIDE", "teal", `vm ${VM}`], [OUT_X, "OUTSIDE", "sig", "internet"]] as const) {
    it.push(box(C, x - 10, 0, FZ, 20, 0.4, 30, "lo", { key: -80 }));
    it.push(box(C, x - 12, 0, FZ, 2, 2, 32, fam, { key: -79.9 }));
    it.push(box(C, x + 10, 0, FZ, 2, 2, 32, fam, { key: -79.9 }));
    it.push(box(C, x - 12, 0, FZ + 30, 24, 2, 2.4, fam, { key: -79.8 }));
    it.push(faceText(C, label, [x, 2, FZ + 37], "+y", 3.4, fam, { key: -79.7, weight: 700 }));
    it.push(faceText(C, sub, [x, 2, FZ + 31.2], "+y", 1.8, "ink", { key: -79.7, weight: 700 }));
  }
  // hook board behind the desk
  it.push(box(C, DESK_X - 34, 0, FZ + 24, 68, 1.2, 22, "sand", { key: -70, bevel: 0.4 }));
  it.push(faceText(C, "CONNECTION TABLE", [DESK_X, 1.2, FZ + 43], "+y", 2.2, "ink", { key: -69.9, weight: 700 }));
  for (let k = 0; k < 4; k++) it.push(cyl(C, DESK_X - 24 + k * 16, 1.4, FZ + 38, 0.8, 0.01, "hi", { key: -69.8, n: 10 }));
  // the desk (the firewall)
  it.push(box(C, DESK_X - 22, 30, FZ, 44, 12, 14, "sand", { key: 10, bevel: 0.4 }));
  it.push(box(C, DESK_X - 24, 29, FZ + 14, 48, 15, 1.6, "violet", { key: 10.1, bevel: 0.4 }));
  let panels = "";
  for (let x = DESK_X - 18; x <= DESK_X + 18; x += 12) panels += line3(C, [[x, 42, FZ + 2], [x, 42, FZ + 12]]);
  it.push({ kind: "line", d: panels, tone: "lo", w: 0.5, layer: 0, key: 10.2 } as LineItem);
  it.push(faceText(C, "FIREWALL", [DESK_X, 42, FZ + 8], "+y", 3, "ink", { key: 10.3, weight: 700 }));
  it.push(cyl(C, DESK_X + 16, 36, FZ + 15.6, 1.8, 1, "sig", { key: 10.4, n: 16 }));
  return sortItems(it);
}

// ---------- script ----------

type Tok = { path: V3[]; u: number; fam: Fam; label: string };
type Fr = { tok: Tok | null; tags: string[]; hot: number; lamp: Fam; say: string };
export type Mode = "stateful" | "stateless";
type Scene = "conn" | "stranger";

function script(sc: Scene, mode: Mode, highPorts: boolean, tags0: string[]): { segs: Seg<Fr>[]; tagsAfter: string[] } {
  const segs: Seg<Fr>[] = [];
  const F = (p: Partial<Fr>): Fr => ({ tok: null, tags: tags0, hot: -1, lamp: "mid", say: "", ...p });
  const walk = (path: V3[], from: number, to: number, fam: Fam, label: string, say: string, tags: string[], d = 1.6, hot = -1) =>
    segs.push({ d, f: (u) => F({ tok: { path, u: lerp(from, to, ease(u)), fam, label }, tags, hot, say }) });
  const tag = `${EPH}⇄${SRV.split(".").pop()}:443`;
  if (sc === "conn") {
    let tags = tags0;
    walk(PATH_OUT, 0, STOP, "teal", "SYN →", `vm sends SYN · ${VM}:${EPH} → ${SRV}:443`, tags);
    if (mode === "stateful") {
      const after = tags.includes(tag) ? tags : [...tags, tag].slice(-4);
      segs.push({ d: 0.9, f: () => F({ tok: { path: PATH_OUT, u: STOP, fam: "teal", label: "SYN →" }, tags: after, hot: after.indexOf(tag), lamp: "ok", say: "Outbound allowed · the firewall hangs a tag: it now remembers this connection" }) });
      tags = after;
    } else {
      segs.push({ d: 0.9, f: () => F({ tok: { path: PATH_OUT, u: STOP, fam: "teal", label: "SYN →" }, lamp: "ok", say: "Rule: OUT any ALLOW · nothing is remembered" }) });
    }
    walk(PATH_OUT, STOP, 1, "teal", "SYN →", "Out to the server", tags, 1.4);
    segs.push({ d: 0.4, f: () => F({ tags, say: "The server replies to port " + EPH }) });
    walk(PATH_IN, 0, STOP_IN, "teal", "← SYN-ACK", `Reply arrives · ${SRV}:443 → ${VM}:${EPH}`, tags);
    const ok = mode === "stateful" || highPorts;
    if (ok) {
      segs.push({ d: 0.9, f: () => F({ tok: { path: PATH_IN, u: STOP_IN, fam: "teal", label: "← SYN-ACK" }, tags, hot: mode === "stateful" ? tags.indexOf(tag) : -1, lamp: "ok", say: mode === "stateful" ? "Matches a tag on the board · let in, no inbound rule needed" : `Rule: IN ${1024}–65535 ALLOW · let in because of the port, not the connection` }) });
      walk(PATH_IN, STOP_IN, 1, "teal", "← SYN-ACK", "Back to the vm · the connection is up", tags, 1.4);
    } else {
      segs.push({ d: 1.0, f: () => F({ tok: { path: PATH_IN, u: STOP_IN, fam: "warn", label: "← SYN-ACK" }, tags, lamp: "warn", say: `No rule allows inbound to port ${EPH} · the reply to our own request is dropped` }) });
      walk(PATH_IN, STOP_IN, 0, "warn", "← SYN-ACK", "Stateless filters need a rule for return traffic too", tags, 1.2);
    }
    segs.push({ d: 1.2, f: () => F({ tags, say: ok ? "Connection established" : "Stateless filters need a rule for return traffic too" }) });
    return { segs, tagsAfter: tags };
  }
  walk(PATH_IN, 0, STOP_IN, "warn", "PROBE →", `A stranger sends ${"192.0.2.66"} → ${VM}:50123`, tags0);
  const ok = mode === "stateless" && highPorts;
  if (ok) {
    segs.push({ d: 1.0, f: () => F({ tok: { path: PATH_IN, u: STOP_IN, fam: "warn", label: "PROBE →" }, lamp: "warn", say: "Rule: IN 1024–65535 ALLOW · the stranger walks right in" }) });
    walk(PATH_IN, STOP_IN, 1, "warn", "PROBE →", "The hole opened for replies lets anyone reach high ports", tags0, 1.4);
  } else {
    segs.push({ d: 1.0, f: () => F({ tok: { path: PATH_IN, u: STOP_IN, fam: "warn", label: "PROBE →" }, lamp: "warn", say: mode === "stateful" ? "No tag matches · nobody inside started this, so it's dropped" : "No inbound rule matches · dropped" }) });
    walk(PATH_IN, STOP_IN, 0, "warn", "PROBE →", "Turned away", tags0, 1.2);
  }
  segs.push({ d: 1.2, f: () => F({ say: ok ? "The hole opened for replies lets anyone reach high ports" : "Turned away" }) });
  return { segs, tagsAfter: tags0 };
}

// ---------- live parts ----------

function tokItems(t: Tok | null): Item[] {
  if (!t) return [];
  const [x, y] = alongPath(t.path, t.u);
  return [
    box(C, x - 6, y - 4, FZ, 12, 8, 10, "hi", { key: 0, bevel: 0.4 }),
    box(C, x - 5.4, y - 3.4, FZ + 10, 10.8, 6.8, 1.2, t.fam, { key: 0.1 }),
    faceText(C, t.label, [x, y + 4, FZ + 5.5], "+y", 2.3, "ink", { key: 0.2, weight: 700 }),
  ];
}

function boardItems(mode: Mode, tags: string[], hot: number, highPorts: boolean, lamp: Fam): Item[] {
  const it: Item[] = [];
  if (mode === "stateful") {
    tags.forEach((t, k) => {
      const x = DESK_X - 24 + k * 16;
      it.push({ kind: "line", d: line3(C, [[x, 1.6, FZ + 38], [x, 1.6, FZ + 35.5]]), tone: "mid", w: 0.4, layer: 0, key: k } as LineItem);
      it.push(box(C, x - 6.5, 1.4, FZ + 26.5, 13, 0.6, 9, k === hot ? "sig" : "lit", { key: k + 0.1 }));
      it.push(faceText(C, `#${k + 1}`, [x, 2, FZ + 33], "+y", 1.8, "ink", { key: k + 0.2, weight: 700 }));
      it.push(faceText(C, t, [x, 2, FZ + 29.5], "+y", 1.25, "ink", { key: k + 0.2 }));
    });
  } else {
    // stateless: the board is covered by a fixed rule plaque; nothing gets remembered
    it.push(box(C, DESK_X - 34.5, 1.2, FZ + 23.5, 69, 0.6, 23, "lo", { key: 0 }));
    it.push(faceText(C, "RULES (no memory)", [DESK_X, 1.8, FZ + 43], "+y", 2.2, "hi", { key: 0.5, weight: 700 }));
    ["OUT  any            ALLOW", `IN   1024–65535     ${highPorts ? "ALLOW" : "—"}`, "IN   any            DENY"].forEach((t, k) => {
      it.push(faceText(C, t, [DESK_X - 30, 1.8, FZ + 37 - k * 4.4], "+y", 2.2, k === 1 ? (highPorts ? "sig" : "mid") : k === 0 ? "teal" : "warn", { anchor: "start", key: 1, weight: 600 }));
    });
    // a lever on the desk for the high-ports rule
    it.push(box(C, DESK_X - 18, 34, FZ + 15.6, 1.4, 1.4, 8, highPorts ? "sig" : "mid", { key: 2, shift: highPorts ? [0, 4] : [0, -3] }));
  }
  it.push(cyl(C, DESK_X + 16, 36, FZ + 16.6, 1.2, 1.4, lamp, { key: 3, n: 14 }));
  return it;
}

export function Cloakroom() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [mode, setMode] = useState<Mode>("stateful");
  const [highPorts, setHighPorts] = useState(false);
  const [job, setJob] = useState<{ n: number; sc: Scene; tags: string[] }>({ n: 0, sc: "conn", tags: [] });
  const [fr, setFr] = useState<Fr>({ tok: null, tags: [], hot: -1, lamp: "mid", say: "" });
  const live = useRef({ t: 0, n: -1, done: false, tour: 0, tags: [] as string[] });

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const sc = useMemo(() => script(job.sc, mode, highPorts, job.tags), [job, mode, highPorts]);

  const send = (s: Scene) => setJob((j) => ({ n: j.n + 1, sc: s, tags: live.current.tags }));
  const poke = useTour(() => {
    const seq: [Mode, boolean, Scene][] = [["stateful", false, "conn"], ["stateful", false, "stranger"], ["stateless", false, "conn"], ["stateless", true, "conn"], ["stateless", true, "stranger"]];
    const [m, h, s] = seq[++live.current.tour % seq.length];
    setMode(m); setHighPorts(h); live.current.tags = []; send(s);
  }, inView && !reduced, totalOf(sc.segs) + 1, 6);

  useLoop((_t, dt) => {
    const L = live.current;
    if (L.n !== job.n) { L.n = job.n; L.t = 0; L.done = false; }
    if (L.done) return;
    const T = totalOf(sc.segs);
    L.t = reduced ? T : Math.min(T, L.t + dt);
    setFr(frameAt(sc.segs, L.t).fr);
    if (L.t >= T) { L.done = true; L.tags = sc.tagsAfter; }
  }, inView);

  const dyn = useMemo(() => ({ tok: tokItems(fr.tok), board: boardItems(mode, fr.tags, fr.hot, highPorts, fr.lamp) }), [fr, mode, highPorts]);
  const onKey = (e: React.KeyboardEvent) => {
    poke();
    if (e.key === "1") send("conn");
    if (e.key === "2") send("stranger");
    if (e.key === "m") { setMode((m) => (m === "stateful" ? "stateless" : "stateful")); live.current.tags = []; }
    if (e.key === "h") setHighPorts((v) => !v);
  };

  return (
    <div>
      <Card
        n={16}
        title="Cloakroom"
        hint="1 connect · 2 stranger · m mode · h high-ports lever"
        readout={<>{fr.say.split(" · ").map((s, i) => (i === 0 ? <b key={i}>{s}</b> : <span key={i}> · {s}</span>))}</>}
        viewBox={vb}
        label="A room between an inside door and an outside door, with a firewall desk in the middle. In stateful mode the desk hangs a numbered tag for every outgoing connection and lets in only replies that match a tag. In stateless mode the board is a fixed rule plaque with no memory, and a lever opens inbound high ports so replies can return, which also lets strangers in."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat.filter((i) => i.key < 10)} />
        <Items items={dyn.board} />
        <Items items={dyn.tok.length && fr.tok && alongPath(fr.tok.path, fr.tok.u)[1] > 44 ? [] : dyn.tok} />
        <Items items={stat.filter((i) => i.key >= 10)} />
        <Items items={dyn.tok.length && fr.tok && alongPath(fr.tok.path, fr.tok.u)[1] > 44 ? dyn.tok : []} />
      </Card>
      <div className="controls">
        <div className="seg">
          <button className={mode === "stateful" ? "on" : ""} onClick={() => { poke(); setMode("stateful"); live.current.tags = []; }}>Stateful</button>
          <button className={mode === "stateless" ? "on" : ""} onClick={() => { poke(); setMode("stateless"); live.current.tags = []; }}>Stateless</button>
        </div>
        <button className="pill-btn" disabled={mode === "stateful"} onClick={() => { poke(); setHighPorts((v) => !v); }} style={{ borderColor: highPorts && mode === "stateless" ? "var(--accent)" : undefined }}>
          Lever: allow inbound 1024–65535 {highPorts ? "ON" : "OFF"}
        </button>
        <button className="pill-btn" onClick={() => { poke(); send("conn"); }}><span className="c-teal">●</span> vm → server and reply</button>
        <button className="pill-btn" onClick={() => { poke(); send("stranger"); }}><span className="c-rose">●</span> stranger → :50123</button>
      </div>
      <Legend items={[
        { swatch: "teal", text: "Our connection (request and reply)" },
        { swatch: "warn", text: "Unsolicited / dropped" },
        { swatch: "lit", text: "Tag = remembered connection" },
        { swatch: "sig", text: "Tag just matched / high-ports rule" },
      ]} />
      <p className="caption">
        A stateful firewall decides once, on the first packet, then recognises the rest of the conversation by its 5-tuple. A stateless filter judges every packet alone, so returning traffic needs its own rule, and the usual rule (allow all high ports in) is a hole anyone can walk through.
      </p>
    </div>
  );
}
