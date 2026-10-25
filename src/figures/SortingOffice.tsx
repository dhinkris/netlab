import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, cyl, ease, faceText, halo, lerp, line3, prism, rrect, sortItems,
  type Fam, type Item, type LineItem, type Seg, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useReducedMotion, useTour } from "../iso/live";
import { splitSay, useScript } from "../iso/script";

const C = camera(14, 24);
const FZ = 2, TZ = FZ + 12; // floor, counter top
const CY = 40; // counter centre line
const ST = { intake: 14, tls: 52, waf: 88, read: 122 };
type Pool = { id: string; name: string; rule: string; fam: Fam; x: number; servers: string[] };
const POOLS: Pool[] = [
  { id: "img", name: "pool-images", rule: "/images/*", fam: "blue", x: 154, servers: ["img-1", "img-2"] },
  { id: "api", name: "pool-api", rule: "/api/*", fam: "violet", x: 176, servers: ["api-1", "api-2"] },
  { id: "web", name: "pool-web", rule: "/* (default)", fam: "teal", x: 198, servers: ["web-1", "web-2"] },
];
type Req = { path: string; pool: string | null; why: string };
const REQS: Req[] = [
  { path: "GET /images/logo.png", pool: "img", why: "matches /images/*" },
  { path: "GET /api/orders", pool: "api", why: "matches /api/*" },
  { path: "GET /checkout", pool: "web", why: "no specific rule, so the default pool" },
  { path: "GET /api/orders?id=1' OR 1=1--", pool: null, why: "WAF rule: SQL injection · 403" },
  { path: "GET /api/orders", pool: "api", why: "matches /api/* · round-robin picks the other server" },
];

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-8, -8, 226, 72, 3);
  it.push(halo(C, plan, 5));
  it.push(prism(C, plan, 0, FZ, "sand", { key: -100, bevel: 0.5 }));
  let boards = "";
  for (let y = -4; y < 64; y += 6) boards += line3(C, [[-8, y, FZ], [218, y, FZ]]);
  it.push({ kind: "line", d: boards, tone: "faint", w: 0.4, layer: 0, key: -99 } as LineItem);
  // back wall with the listener and rule board
  it.push(box(C, -8, -8, FZ, 226, 4, 62, "hi", { key: -90 }));
  it.push(box(C, 4, -4, FZ + 33, 120, 0.8, 25, "lo", { key: -89, bevel: 0.3 }));
  it.push(faceText(C, "APPLICATION GATEWAY · listener https://shop.example.com:443", [8, -3.2, FZ + 53], "+y", 2.3, "sig", { anchor: "start", key: -88, weight: 700 }));
  POOLS.forEach((p, k) => it.push(faceText(C, `rule  ${p.rule.padEnd(14)} → ${p.name}`, [8, -3.2, FZ + 48 - k * 4.4], "+y", 2.2, p.fam, { anchor: "start", key: -88, weight: 600 })));
  // the counter
  it.push(box(C, 0, CY - 7, FZ, 134, 14, TZ - FZ, "sand", { key: -50, bevel: 0.4 }));
  it.push(box(C, -1, CY - 8, TZ, 136, 16, 1.2, "hi", { key: -49.9, bevel: 0.3 }));
  // stations on the counter
  it.push(box(C, ST.intake - 8, CY - 6, TZ + 1.2, 16, 12, 2, "sig", { key: -40, bevel: 0.3 }));
  it.push(faceText(C, "INTAKE", [ST.intake, CY + 6, TZ + 2.2], "+y", 1.9, "ink", { key: -39.9, weight: 700 }));
  it.push(box(C, ST.tls - 7, CY - 9, TZ + 1.2, 14, 6, 9, "rose", { key: -38, bevel: 0.4 }));
  it.push(box(C, ST.tls - 1, CY - 3, TZ + 4, 2, 6, 0.6, "lit", { key: -37.9 }));
  it.push(faceText(C, "TLS TERMINATION", [ST.tls, CY - 3, TZ + 7.8], "+y", 1.7, "ink", { key: -37.8, weight: 700 }));
  it.push(faceText(C, "cert *.example.com", [ST.tls, CY - 3, TZ + 5.6], "+y", 1.5, "ink", { key: -37.8 }));
  it.push(box(C, ST.waf - 6, CY - 9, TZ + 1.2, 12, 6, 12, "warn", { key: -36, bevel: 0.4 }));
  it.push(faceText(C, "WAF", [ST.waf, CY - 3, TZ + 9], "+y", 2.4, "ink", { key: -35.9, weight: 700 }));
  it.push(cyl(C, ST.read, CY - 6, TZ + 1.2, 1, 8, "hi", { key: -34, n: 10 }));
  it.push(cyl(C, ST.read, CY - 2, TZ + 9, 5, 0.8, "sea", { key: -33.9, n: 22 }));
  it.push(faceText(C, "READ URL", [ST.read, CY + 8, TZ + 0.6], "+y", 1.8, "ink", { key: -33.8, weight: 700 }));
  // pigeonhole cabinet: one column per pool, one hole per server
  it.push(box(C, 142, -4, FZ, 68, 14, 46, "sand", { key: -30, bevel: 0.5 }));
  POOLS.forEach((p) => {
    for (let r = 0; r < 2; r++) {
      const z = FZ + 26 - r * 14;
      it.push(box(C, p.x - 9, 10, z, 18, 0.4, 11, "lo", { key: -29.9 }));
      it.push(faceText(C, p.servers[r], [p.x, 10.4, z + 2], "+y", 1.8, "hi", { key: -29.8, weight: 700 }));
    }
    it.push(box(C, p.x - 9, 10, FZ + 40, 18, 0.6, 4, p.fam, { key: -29.7 }));
    it.push(faceText(C, p.name, [p.x, 10.6, FZ + 42], "+y", 1.7, "ink", { key: -29.6, weight: 700 }));
  });
  it.push(box(C, 142, -4, FZ + 46, 68, 14, 1.4, "hi", { key: -28 }));
  // reject tray for blocked requests
  it.push(box(C, ST.waf - 7, CY + 12, FZ, 14, 10, 5, "warn", { key: 0, noTop: true }));
  it.push(box(C, ST.waf - 6, CY + 13, FZ + 0.5, 12, 8, 0.4, "lo", { key: 0.1 }));
  return sortItems(it);
}

// ---------- script ----------

type Env = { at: V3; sealed: boolean; stamp: Fam | null; text: string };
type Fr = { env: Env | null; lens: string; say: string };

function script(req: Req, turn: number): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  const F = (p: Partial<Fr>): Fr => ({ env: null, lens: "", say: "", ...p });
  const at = (x: number): V3 => [x, CY, TZ + 1.2];
  const slide = (a: number, b: number, sealed: boolean, stamp: Fam | null, say: string, d = 0.9, lens = "") =>
    segs.push({ d, f: (u) => F({ env: { at: at(lerp(a, b, ease(u))), sealed, stamp, text: sealed ? "🔒 TLS" : req.path }, lens, say }) });
  slide(-6, ST.intake, true, null, `HTTPS request arrives · encrypted, the gateway can't read it yet`, 0.8);
  slide(ST.intake, ST.tls, true, null, "To TLS termination", 0.7);
  segs.push({ d: 0.7, f: () => F({ env: { at: at(ST.tls), sealed: false, stamp: null, text: req.path }, say: `TLS terminated with the gateway's certificate · now it reads: ${req.path}` }) });
  slide(ST.tls, ST.waf, false, null, "To the WAF", 0.7);
  const blocked = req.pool === null;
  segs.push({ d: 0.7, f: () => F({ env: { at: at(ST.waf), sealed: false, stamp: blocked ? "warn" : "ok", text: req.path }, say: blocked ? `WAF · ${req.why}` : "WAF finds nothing malicious" }) });
  if (blocked) {
    segs.push({ d: 0.9, f: (u) => F({ env: { at: [ST.waf, lerp(CY, CY + 17, ease(u)), lerp(TZ + 1.2, FZ + 1, ease(u))], sealed: false, stamp: "warn", text: req.path }, say: `Blocked · ${req.why}` }) });
    segs.push({ d: 1.4, f: () => F({ env: { at: [ST.waf, CY + 17, FZ + 1], sealed: false, stamp: "warn", text: req.path }, say: `Blocked · ${req.why} · the backends never see it` }) });
    return segs;
  }
  slide(ST.waf, ST.read, false, "ok", "To the URL reader", 0.6);
  const pool = POOLS.find((p) => p.id === req.pool)!;
  const row = turn % 2; // round-robin within the pool
  segs.push({ d: 0.8, f: () => F({ env: { at: at(ST.read), sealed: false, stamp: "ok", text: req.path }, lens: req.path.split(" ")[1].split("?")[0], say: `Path ${req.path.split(" ")[1].split("?")[0]} · ${req.why} → ${pool.name}` }) });
  const hole: V3 = [pool.x, 10.6, FZ + 26 - row * 14 + 3];
  segs.push({ d: 1.1, f: (u) => { const e = ease(u); return F({ env: { at: [lerp(ST.read, hole[0], e), lerp(CY, hole[1], e), lerp(TZ + 1.2, hole[2], e) + Math.sin(Math.PI * e) * 12], sealed: false, stamp: "ok", text: req.path }, say: `${pool.name} · round-robin to ${pool.servers[row]}` }); } });
  segs.push({ d: 1.2, f: () => F({ say: `Delivered to ${pool.servers[row]} · (re-encrypted to the backend if end-to-end TLS is on)` }) });
  return segs;
}

function liveItems(fr: Fr): Item[] {
  const it: Item[] = [];
  if (fr.lens) it.push(faceText(C, fr.lens, [ST.read, CY - 2, TZ + 9.8], "top", 2, "lit", { key: 5, weight: 700 }));
  if (fr.env) {
    const [x, y, z] = fr.env.at;
    it.push(box(C, x - 7, y - 4.5, z, 14, 9, 1, "hi", { key: 6 }));
    if (fr.env.sealed) it.push(cyl(C, x, y, z + 1, 2.2, 0.8, "warn", { key: 6.1, n: 16 }));
    else {
      it.push({ kind: "line", d: line3(C, [[x - 7, y - 4.5, z + 1], [x, y, z + 1], [x + 7, y - 4.5, z + 1]]), tone: "mid", w: 0.5, layer: 0, key: 6.1 } as LineItem);
      const t = fr.env.text.length > 26 ? fr.env.text.slice(0, 25) + "…" : fr.env.text;
      it.push(faceText(C, t, [x, y + 8, z + 0.5], "top", 2.1, "hi", { key: 6.2, weight: 700 }));
    }
    if (fr.env.stamp) it.push(box(C, x + 3, y - 3.5, z + 1, 3.4, 3, 0.4, fr.env.stamp, { key: 6.3 }));
  }
  return it;
}

export function SortingOffice() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [ri, setRi] = useState(0);
  const [run, setRun] = useState(0);
  const rr = useRef<Record<string, number>>({}); // per-pool round-robin counters
  const tour = useRef(0);
  const req = REQS[ri];

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const [turn, setTurn] = useState(0);
  const segs = useMemo(() => script(req, turn), [req, turn]);
  const fr = useScript(segs, run, inView, reduced, { env: null, lens: "", say: "" } as Fr);

  const go = (i: number) => {
    const pool = REQS[i].pool;
    if (pool) { rr.current[pool] = (rr.current[pool] ?? -1) + 1; setTurn(rr.current[pool]); }
    setRi(i); setRun((r) => r + 1);
  };
  const poke = useTour(() => go(++tour.current % REQS.length), inView && !reduced, 7, 6);
  const dyn = useMemo(() => liveItems(fr), [fr]);
  const { head, rest } = splitSay(fr.say);

  return (
    <div>
      <Card
        n={30}
        title="Sorting office"
        hint="send a request"
        readout={<><b>{head}</b>{rest.map((s, i) => <span key={i}> · {s}</span>)}</>}
        viewBox={vb}
        label="A sorting office stands for Application Gateway. Sealed envelopes (HTTPS requests) arrive at an intake tray, are opened at the TLS-termination desk using the gateway's certificate, checked at the WAF stamp, and read under a magnifier for their URL path. Path rules on the wall send each one to a pigeonhole column for a backend pool, alternating between the pool's servers; an SQL-injection request is stamped and dropped in the reject tray."
        onKeyDown={() => poke()}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={sortItems(dyn)} />
      </Card>
      <div className="controls">
        <div className="seg">
          {REQS.slice(0, 4).map((r, i) => <button key={i} className={ri === i ? "on" : ""} onClick={() => { poke(); go(i); }}>{r.path.replace("GET ", "")}</button>)}
        </div>
      </div>
      <Legend items={[
        { swatch: "warn", text: "Wax seal = TLS (unreadable until opened)" },
        ...POOLS.map((p) => ({ swatch: p.fam as string, text: `${p.rule} → ${p.name}` })),
      ]} />
      <p className="caption">
        An L7 gateway has to open the envelope to do its job: only after TLS termination can it read the path, run WAF rules, and pick a pool. That's the trade it makes, and why it holds your certificate.
      </p>
    </div>
  );
}
