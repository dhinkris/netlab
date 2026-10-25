import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, cyl, dotsItem, ease, faceText, halo, lerp, line3, prism, rrect, sortItems,
  type Fam, type Item, type LineItem, type Seg, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useReducedMotion, useTour } from "../iso/live";
import { splitSay, useScript } from "../iso/script";

const C = camera(24, 40);
const SQ = 16, COLS = 8, ROWS = 6;
const BZ = 5; // board top
type Asg = "web" | "app" | "db";
const HAT: Record<Asg, Fam> = { web: "blue", app: "violet", db: "teal" };
type Pawn = { id: string; asg: Asg; ip: string; col: number; row: number };
const BASE: Pawn[] = [
  { id: "web-1", asg: "web", ip: "10.0.1.4", col: 1, row: 1 },
  { id: "web-2", asg: "web", ip: "10.0.1.5", col: 1, row: 4 },
  { id: "app-1", asg: "app", ip: "10.0.2.4", col: 4, row: 2 },
  { id: "db-1", asg: "db", ip: "10.0.3.4", col: 7, row: 3 },
];
const NEW_WEB: Pawn = { id: "web-3", asg: "web", ip: "10.0.1.6", col: 2, row: 5 };
const cell = (p: Pawn): V3 => [p.col * SQ + SQ / 2, p.row * SQ + SQ / 2, BZ];
const head = (p: Pawn): V3 => { const [x, y] = cell(p); return [x, y, BZ + 16.4]; };

type Mode = "asg" | "ip";
const RULES: Record<Mode, string[]> = {
  asg: ["100  asg-web → asg-app  :8080  ALLOW", "110  asg-app → asg-db   :1433  ALLOW", "4000 VirtualNetwork → any    DENY"],
  ip: ["100  10.0.1.4, 10.0.1.5 → 10.0.2.4 :8080 ALLOW", "110  10.0.2.4 → 10.0.3.4  :1433  ALLOW", "4000 VirtualNetwork → any      DENY"],
};

function allowed(mode: Mode, a: Pawn, b: Pawn, port: number) {
  if (mode === "asg") return (a.asg === "web" && b.asg === "app" && port === 8080) || (a.asg === "app" && b.asg === "db" && port === 1433);
  return (["10.0.1.4", "10.0.1.5"].includes(a.ip) && b.ip === "10.0.2.4" && port === 8080) || (a.ip === "10.0.2.4" && b.ip === "10.0.3.4" && port === 1433);
}

function boardItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-8, -8, COLS * SQ + 16 + 90, ROWS * SQ + 16, 4);
  it.push(halo(C, plan, 6));
  it.push(prism(C, rrect(-8, -8, COLS * SQ + 16, ROWS * SQ + 16, 3), 0, BZ - 0.6, "sand", { key: -100, bevel: 0.8 }));
  it.push(box(C, -2, -2, BZ - 0.6, COLS * SQ + 4, ROWS * SQ + 4, 0.4, "lo", { key: -99 }));
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    it.push(box(C, c * SQ, r * SQ, BZ - 0.2, SQ, SQ, 0.2, (c + r) % 2 ? "mid" : "hi", { key: -98 + (c + r) * 0.0001 }));
  }
  // file letters along the front edge
  for (let c = 0; c < COLS; c++) it.push(faceText(C, "ABCDEFGH"[c], [c * SQ + SQ / 2, ROWS * SQ + 4.5, BZ - 0.6], "top", 2.6, "ink", { key: -97, weight: 700 }));
  // card table to the right
  it.push(prism(C, rrect(COLS * SQ + 16, -8, 104, ROWS * SQ + 16, 3), 0, 2, "lo", { key: -96 }));
  return sortItems(it);
}

function pawnItems(p: Pawn, glow: Fam | null, fresh: number): Item[] {
  const [x, y] = cell(p);
  const k = (x + y) * 0.001;
  const z0 = BZ + (1 - fresh) * 30;
  return [
    cyl(C, x, y, z0, 5.6, 2, "mid", { key: k, n: 26 }),
    cyl(C, x, y, z0 + 2, 3.4, 9, "hi", { key: k + 0.0001, n: 22 }),
    cyl(C, x, y, z0 + 11, 4.4, 1.4, HAT[p.asg], { key: k + 0.0002, n: 24 }),
    cyl(C, x, y, z0 + 12.4, 3.4, 4, glow ?? HAT[p.asg], { key: k + 0.0003, n: 22, bevel: 0.4 }),
    faceText(C, p.ip, [x, y + 6.2, BZ], "top", 2, "ink", { key: k - 0.0001, weight: 700 }),
  ];
}

function cardItems(mode: Mode, scaled: boolean): Item[] {
  // two easels standing beside the board, faces toward the viewer
  const it: Item[] = [];
  const x0 = COLS * SQ + 20, W = 96;
  const easel = (y: number, h: number, key: number) => {
    it.push(box(C, x0 + 6, y - 6, 2, 1.4, 6, h - 4, "sand", { key, shift: [0, 5] }));
    it.push(box(C, x0 + W - 8, y - 6, 2, 1.4, 6, h - 4, "sand", { key, shift: [0, 5] }));
    it.push(box(C, x0, y, 6, W, 1, h, "hi", { key: key + 0.1, bevel: 0.3 }));
  };
  easel(10, 30, 0);
  it.push(faceText(C, mode === "asg" ? "NSG RULES · by ASG" : "NSG RULES · by IP list", [x0 + 3, 11, 32], "+y", 3, "ink", { anchor: "start", key: 1, weight: 700 }));
  RULES[mode].forEach((l, k) => it.push(faceText(C, l, [x0 + 3, 11, 26 - k * 5.4], "+y", mode === "ip" ? 2.1 : 2.6, k === 2 ? "warn" : "ink", { anchor: "start", key: 1, weight: 600 })));
  if (mode === "ip" && scaled) it.push(faceText(C, "web-3 (10.0.1.6) isn't in rule 100", [x0 + 3, 11, 9], "+y", 1.9, "warn", { anchor: "start", key: 1, weight: 700 }));
  easel(70, 34, 2);
  it.push(faceText(C, "ASG MEMBERSHIP (set on each NIC)", [x0 + 3, 71, 36], "+y", 2.6, "ink", { anchor: "start", key: 3, weight: 700 }));
  [...BASE, ...(scaled ? [NEW_WEB] : [])].forEach((p, k) => {
    const z = 30.5 - k * 5;
    it.push(box(C, x0 + 3, 71, z - 1.3, 3, 0.4, 3, HAT[p.asg], { key: 3.1 }));
    it.push(faceText(C, `${p.id}  ${p.ip}  asg-${p.asg}`, [x0 + 8, 71, z], "+y", 2.4, "ink", { anchor: "start", key: 3.2, weight: 600 }));
  });
  return it;
}

// ---------- script ----------

type Flow = { a: Pawn; b: Pawn; port: number; ok: boolean; u: number };
type Fr = { flows: Flow[]; glow: Record<string, Fam>; fresh: number; say: string };
type Scene = "web-app" | "web-db" | "scale";

function script(scene: Scene, mode: Mode, scaled: boolean): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  const pawns = [...BASE, ...(scaled || scene === "scale" ? [NEW_WEB] : [])];
  const get = (id: string) => pawns.find((p) => p.id === id)!;
  const done: Flow[] = [];
  const F = (p: Partial<Fr>): Fr => ({ flows: [...done], glow: {}, fresh: 1, say: "", ...p });
  if (scene === "scale") {
    segs.push({ d: 1.2, f: (u) => F({ fresh: ease(u), say: "Scale out: web-3 joins with a new IP, 10.0.1.6 · its NIC is put in asg-web" }) });
  }
  const tests: [string, string, number][] = scene === "web-db" ? [["web-1", "db-1", 1433], ["app-1", "db-1", 1433]] : pawns.filter((p) => p.asg === "web").map((p) => [p.id, "app-1", 8080] as [string, string, number]);
  for (const [ai, bi, port] of tests) {
    const a = get(ai), b = get(bi);
    const ok = allowed(mode, a, b, port);
    const why = ok
      ? (mode === "asg" ? `matches a rule by role (asg-${a.asg} → asg-${b.asg})` : `${a.ip} is on the rule's IP list`)
      : (scene === "web-db" ? "no rule allows web → db · falls to Deny 4000" : `${a.ip} isn't on the IP list · falls to Deny 4000`);
    segs.push({ d: 1.0, f: (u) => F({ flows: [...done, { a, b, port, ok, u: ease(u) }], glow: { [a.id]: "sig" }, say: `${a.id} → ${b.id} :${port}` }) });
    segs.push({ d: 0.7, f: () => F({ flows: [...done, { a, b, port, ok, u: 1 }], glow: { [b.id]: ok ? "ok" : "warn" }, say: `${a.id} → ${b.id} :${port} · ${ok ? "ALLOW" : "DENY"} · ${why}` }) });
    done.push({ a, b, port, ok, u: 1 });
  }
  const anyDenied = done.some((f) => !f.ok);
  segs.push({ d: 1.6, f: () => F({ say: scene === "scale" ? (mode === "asg" ? "The new VM was covered the moment its NIC joined asg-web · no rule edits" : "With IP rules, every scale-out needs a rule change · until then the new VM is cut off") : anyDenied ? "Only the paths you described exist" : "All allowed" }) });
  return segs;
}

function flowItems(fl: Flow[]): Item[] {
  const it: Item[] = [];
  fl.forEach((f, k) => {
    const a = head(f.a), b = head(f.b);
    const pts: V3[] = [];
    const n = 24;
    for (let i = 0; i <= Math.round(n * f.u); i++) {
      const u = i / n;
      pts.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u) + Math.sin(Math.PI * u) * 18]);
    }
    if (pts.length > 1) it.push({ kind: "line", d: line3(C, pts), tone: f.u < 1 ? "sig" : f.ok ? "ok" : "warn", w: 1, layer: 0, key: 100 + k, dash: f.ok || f.u < 1 ? undefined : "2 2" } as LineItem);
    if (f.u < 1) it.push({ ...dotsItem(C, [pts[pts.length - 1]], 1.6, "sig", 0), key: 101 + k });
  });
  return it;
}

export function AsgBoard() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [mode, setMode] = useState<Mode>("asg");
  const [scaled, setScaled] = useState(false);
  const [scene, setScene] = useState<Scene>("web-app");
  const [run, setRun] = useState(0);
  const tour = useRef(0);

  const board = useMemo(() => boardItems(), []);
  const vb = useMemo(() => { const b = boundsOf(board, 8); return `${b.x} ${b.y - 24} ${b.w} ${b.h + 24}`; }, [board]);
  const segs = useMemo(() => script(scene, mode, scaled), [scene, mode, scaled]);
  const fr = useScript(segs, run, inView, reduced, { flows: [], glow: {}, fresh: 1, say: "" } as Fr);

  // scaling out is sticky: web-3 stays on the board for later checks
  const go = (s: Scene) => { if (s === "scale") setScaled(true); setScene(s); setRun((r) => r + 1); };
  const showNew = scaled;
  const poke = useTour(() => {
    const seq: [Scene, Mode][] = [["web-app", "asg"], ["scale", "asg"], ["scale", "ip"], ["web-db", "asg"]];
    const [s, m] = seq[++tour.current % seq.length];
    setMode(m); go(s);
  }, inView && !reduced, 7, 6);

  const dyn = useMemo(() => {
    const pawns = [...BASE, ...(showNew ? [NEW_WEB] : [])];
    return {
      pawns: sortItems(pawns.flatMap((p) => pawnItems(p, fr.glow[p.id] ?? null, p.id === "web-3" && scene === "scale" ? fr.fresh : 1))),
      flows: flowItems(fr.flows),
      cards: cardItems(mode, showNew),
    };
  }, [fr, mode, showNew, scene]);

  const { head: h, rest } = splitSay(fr.say);
  const onKey = (e: React.KeyboardEvent) => {
    poke();
    if (e.key === "1") go("web-app");
    if (e.key === "2") go("scale");
    if (e.key === "3") go("web-db");
    if (e.key === "m") { setMode((m) => (m === "asg" ? "ip" : "asg")); setRun((r) => r + 1); }
  };

  return (
    <div>
      <Card
        n={19}
        title="Role board"
        hint="1 web → app · 2 scale out · 3 web → db · m rule style"
        readout={<><b>{h}</b>{rest.map((s, i) => <span key={i}> · {s}</span>)}</>}
        viewBox={vb}
        label="A game board where each VM is a pawn whose hat colour is its application security group. Rule cards on the side either name roles (asg-web to asg-app) or list IP addresses. When a new web pawn joins, role-based rules cover it at once; IP-list rules leave it blocked until someone edits them."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={board} />
        <Items items={dyn.cards} />
        <Items items={dyn.pawns} />
        <Items items={dyn.flows} />
      </Card>
      <div className="controls">
        <div className="seg">
          <button className={mode === "asg" ? "on" : ""} onClick={() => { poke(); setMode("asg"); setRun((r) => r + 1); }}>Rules by ASG</button>
          <button className={mode === "ip" ? "on" : ""} onClick={() => { poke(); setMode("ip"); setRun((r) => r + 1); }}>Rules by IP list</button>
        </div>
        <div className="seg">
          <button className={scene === "web-app" ? "on" : ""} onClick={() => { poke(); go("web-app"); }}>web → app</button>
          <button className={scene === "scale" ? "on" : ""} onClick={() => { poke(); go("scale"); }}>Scale out web</button>
          <button className={scene === "web-db" ? "on" : ""} onClick={() => { poke(); go("web-db"); }}>web → db</button>
        </div>
      </div>
      <Legend items={[
        { swatch: "blue", text: "asg-web" }, { swatch: "violet", text: "asg-app" }, { swatch: "teal", text: "asg-db" },
        { swatch: "ok", text: "Allowed flow" }, { swatch: "warn", text: "Denied flow" },
      ]} />
      <p className="caption">
        An ASG is a label you put on a NIC; rules then talk about labels. Scaling out, replacing or re-IPing a VM changes nothing in the rules, because the new NIC just joins the group.
      </p>
    </div>
  );
}
