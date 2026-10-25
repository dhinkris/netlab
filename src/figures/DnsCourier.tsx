import { useEffect, useMemo, useRef, useState } from "react";
import {
  bench, box, boundsOf, camera, cyl, ease, faceText, frameAt, labelPlate, lerp, screws, sortItems, totalOf,
  type Fam, type Item, type Seg,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { AUTH_NS, QUERIES, ROOT_LETTERS, TLD_NS, TLDS, type Query } from "../models/dns";

const C = camera(30, 30);
const Z0 = 7;
const FRONT = 22; // cabinet front face
const TRACK_Y = 40;

type StationId = "client" | "resolver" | "root" | "tld" | "auth";
const ST: Record<StationId, { x: number; fam: Fam }> = {
  client: { x: -4, fam: "mid" },
  resolver: { x: 46, fam: "sig" },
  root: { x: 104, fam: "violet" },
  tld: { x: 152, fam: "blue" },
  auth: { x: 200, fam: "teal" },
};
const CAB_W = 32;

/** Drawer slot geometry inside each cabinet. */
function drawerSlot(st: "root" | "tld" | "auth", i: number) {
  const x0 = ST[st].x - CAB_W / 2;
  if (st === "root") {
    const col = i % 3, row = Math.floor(i / 3);
    return { x: x0 + 2 + col * 9.6, w: 8.6, z: Z0 + 24 - row * 5.2, h: 4.4 };
  }
  return { x: x0 + 2, w: CAB_W - 4, z: Z0 + 18 - i * 5.4, h: 4.6 };
}

function staticItems(): Item[] {
  const it: Item[] = [];
  it.push(...bench(C, -26, -8, 256, 66, Z0));
  it.push(...labelPlate(C, 196, 50, Z0, 30, 6).map((x) => ({ ...x, key: -47 })));

  // track
  for (let x = -18; x < 222; x += 6) it.push(box(C, x, TRACK_Y - 5.5, Z0, 2, 11, 0.6, "mid", { key: 0 }));
  for (const y of [TRACK_Y - 4, TRACK_Y + 3]) it.push(box(C, -20, y, Z0 + 0.6, 244, 1.2, 1.2, "hi", { key: 1 }));

  // client laptop at the left end of the track
  const cx = ST.client.x;
  it.push(box(C, cx - 12, 6, Z0, 22, 16, 1.6, "mid", { key: 2, r: 1, bevel: 0.5 }));
  it.push(box(C, cx - 10, 9, Z0 + 1.6, 18, 9, 0.3, "lo", { key: 2.1, r: 0.4 }));
  it.push(box(C, cx - 12, 4.8, Z0, 22, 1.2, 15, "mid", { key: 2.2, bevel: 0.4 }));
  it.push(box(C, cx - 10.5, 6, Z0 + 2, 19, 0.3, 11.5, "lo", { key: 2.3 }));
  it.push(faceText(C, "www.example.com", [cx - 1, 6.3, Z0 + 9], "+y", 1.8, "sig", { key: 2.4 }));
  it.push(faceText(C, "STUB", [cx - 1, 6.3, Z0 + 5.5], "+y", 1.6, "mid", { key: 2.4 }));

  // resolver: desk cabinet with a cache tray on top
  const rx = ST.resolver.x - CAB_W / 2;
  it.push(box(C, rx, 0, Z0, CAB_W, FRONT, 18, "lo", { key: 3, bevel: 0.6 }));
  it.push(box(C, rx - 1, -1, Z0 + 18, CAB_W + 2, FRONT + 2, 1.4, "sig", { key: 3.1, r: 0.8, bevel: 0.5 }));
  it.push(screws(C, rx - 1, -1, CAB_W + 2, FRONT + 2, Z0 + 19.4, 2));
  it.push(box(C, rx + 3, 4, Z0 + 19.4, CAB_W - 6, 13, 1, "mid", { key: 3.2, r: 0.5 }));
  it.push(faceText(C, "RECURSIVE", [ST.resolver.x, FRONT, Z0 + 13], "+y", 2.6, "sig", { key: 3.3, weight: 700 }));
  it.push(faceText(C, "RESOLVER", [ST.resolver.x, FRONT, Z0 + 9.6], "+y", 2.6, "sig", { key: 3.3, weight: 700 }));
  it.push(faceText(C, "CACHE", [ST.resolver.x, 17.4, Z0 + 20.4], "top", 1.6, "mid", { key: 3.4 }));

  // three server cabinets with their drawers
  const cabs: { id: "root" | "tld" | "auth"; h: number; title: string; labels: string[] }[] = [
    { id: "root", h: 30, title: "ROOT", labels: ROOT_LETTERS },
    { id: "tld", h: 24, title: "TLD", labels: TLDS },
    { id: "auth", h: 24, title: "AUTHORITATIVE", labels: QUERIES.map((q) => q.type) },
  ];
  cabs.forEach((cb, ci) => {
    const x0 = ST[cb.id].x - CAB_W / 2;
    const k = 10 + ci * 10;
    it.push(box(C, x0, 0, Z0, CAB_W, FRONT, cb.h, "lo", { key: k, bevel: 0.6 }));
    it.push(box(C, x0 - 1, -1, Z0 + cb.h, CAB_W + 2, FRONT + 2, 1.6, ST[cb.id].fam, { key: k + 0.1, r: 0.8, bevel: 0.5 }));
    it.push(screws(C, x0 - 1, -1, CAB_W + 2, FRONT + 2, Z0 + cb.h + 1.6, 2));
    it.push(faceText(C, cb.title, [ST[cb.id].x, 11, Z0 + cb.h + 1.6], "top", cb.title.length > 6 ? 2.3 : 3, "ink", { key: k + 0.2, weight: 700 }));
    const n = cb.id === "root" ? 15 : 4;
    for (let i = 0; i < n; i++) {
      const s = drawerSlot(cb.id, i);
      const used = i < cb.labels.length;
      it.push(box(C, s.x, FRONT, s.z, s.w, 0.6, s.h, used ? "mid" : "lo", { key: k + 1 + i * 0.01 }));
      if (used) it.push(faceText(C, cb.labels[i], [s.x + s.w / 2, FRONT + 0.6, s.z + s.h / 2], "+y", cb.id === "root" ? 2.4 : 2.6, ST[cb.id].fam, { key: k + 2, weight: 700 }));
    }
  });
  return sortItems(it);
}

// ---------- timeline ----------

type Fr = {
  cart: number;
  token: { label: string; fam: Fam } | null;
  drawer: { st: "root" | "tld" | "auth"; i: number; out: number; card: string } | null;
  lamp: Fam;
  stored: boolean;
  say: string;
};

function plan(q: Query, cached: boolean, rootIdx: number): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  const ask = { label: `${q.type}?`, fam: "sig" as Fam };
  const ans = { label: q.answer.length > 12 ? q.answer.split(" ").pop()!.split(".")[0] : q.answer, fam: "ok" as Fam };
  const F = (p: Partial<Fr> & { cart: number; say: string }): Fr => ({ token: null, drawer: null, lamp: "mid", stored: false, ...p });
  let stored = false;
  const move = (a: StationId, b: StationId, token: Fr["token"], say: string) => {
    const d = 0.35 + Math.abs(ST[b].x - ST[a].x) / 95;
    const st = stored;
    segs.push({ d, f: (u) => F({ cart: lerp(ST[a].x, ST[b].x, ease(u)), token, stored: st, say }) });
  };
  const drawer = (st: "root" | "tld" | "auth", i: number, card: string, token: Fr["token"], say: string) => {
    segs.push({ d: 0.45, f: (u) => F({ cart: ST[st].x, token, drawer: { st, i, out: ease(u), card }, say }) });
    segs.push({ d: 0.9, f: () => F({ cart: ST[st].x, token, drawer: { st, i, out: 1, card }, say }) });
    segs.push({ d: 0.4, f: (u) => F({ cart: ST[st].x, token, drawer: { st, i, out: 1 - ease(u), card }, say }) });
  };
  segs.push({ d: 0.4, f: () => F({ cart: ST.client.x, token: ask, stored: cached, say: `Stub asks: ${q.name} ${q.type}?` }) });
  stored = cached;
  move("client", "resolver", ask, `Stub → resolver · "${q.name} ${q.type}?" · recursion desired`);
  if (cached) {
    segs.push({ d: 0.8, f: () => F({ cart: ST.resolver.x, token: ask, lamp: "ok", stored: true, say: "Cache hit · answered without asking anyone" }) });
    move("resolver", "client", ans, `Resolver → stub · ${q.answer} (from cache)`);
    segs.push({ d: 1.6, f: () => F({ cart: ST.client.x, token: ans, stored: true, say: `Answer: ${q.name} ${q.type} ${q.answer}` }) });
    return segs;
  }
  segs.push({ d: 0.7, f: () => F({ cart: ST.resolver.x, token: ask, lamp: "warn", say: "Cache miss · resolver starts at the root" }) });
  const L = ROOT_LETTERS[rootIdx];
  move("resolver", "root", ask, `Resolver → ${L}.root-servers.net`);
  drawer("root", rootIdx, "→.com", ask, `Root: "not mine, ask the .com servers" · referral to ${TLD_NS}`);
  move("root", "tld", ask, `Resolver → ${TLD_NS}`);
  drawer("tld", 0, "→ns1", ask, `.com TLD: "example.com is served by ${AUTH_NS}" · referral`);
  move("tld", "auth", ask, `Resolver → ${AUTH_NS}`);
  const ti = QUERIES.findIndex((x) => x.type === q.type);
  drawer("auth", ti, q.type, ans, `Authoritative answer: ${q.name} ${q.type} ${q.answer} · TTL ${q.ttl} s`);
  move("auth", "resolver", ans, "Answer back to the resolver");
  segs.push({ d: 0.7, f: () => F({ cart: ST.resolver.x, token: ans, lamp: "ok", stored: true, say: `Resolver caches it for ${q.ttl} s (the TTL)` }) });
  stored = true;
  move("resolver", "client", ans, `Resolver → stub · ${q.answer}`);
  segs.push({ d: 1.6, f: () => F({ cart: ST.client.x, token: ans, stored: true, say: `Answer: ${q.name} ${q.type} ${q.answer}` }) });
  return segs;
}

// ---------- live parts ----------

function cartItems(x: number, token: Fr["token"]): Item[] {
  const it: Item[] = [];
  it.push(box(C, x - 6, TRACK_Y - 5, Z0 + 1.8, 12, 10, 2.6, "hi", { key: 0, bevel: 0.5, r: 0.6 }));
  if (token) {
    it.push(box(C, x - 5, TRACK_Y - 3.5, Z0 + 4.4, 10, 7, 4, token.fam, { key: 1, bevel: 0.4 }));
    it.push(faceText(C, token.label, [x, TRACK_Y, Z0 + 8.4], "top", token.label.length > 6 ? 1.5 : 2.2, "ink", { key: 2, weight: 700 }));
  }
  return it;
}

function drawerItems(d: Fr["drawer"]): Item[] {
  if (!d || d.out < 0.01) return [];
  const s = drawerSlot(d.st, d.i);
  const y1 = FRONT + 0.6 + d.out * 12;
  const it: Item[] = [];
  it.push(box(C, s.x + 0.3, FRONT + 0.6, s.z, s.w - 0.6, y1 - FRONT - 0.6, s.h, "mid", { key: 0, noTop: true }));
  it.push(box(C, s.x + 0.8, FRONT + 0.6, s.z, s.w - 1.6, y1 - FRONT - 0.6, 0.6, "lo", { key: 0.1 }));
  // the index card standing in the drawer
  const cw = Math.min(s.w - 2, 10);
  it.push(box(C, s.x + (s.w - cw) / 2, y1 - 4, s.z + 0.6, cw, 0.6, s.h + 4.5, ST[d.st].fam, { key: 0.2 }));
  it.push(faceText(C, d.card, [s.x + s.w / 2, y1 - 3.4, s.z + s.h + 2.2], "+y", 1.9, "ink", { key: 0.3, weight: 700 }));
  it.push(box(C, s.x, y1, s.z, s.w, 0.6, s.h, "hi", { key: 0.4 }));
  return it;
}

function cacheItems(entries: { type: string }[], lamp: Fam): Item[] {
  const it: Item[] = [];
  const rx = ST.resolver.x - CAB_W / 2;
  entries.slice(0, 4).forEach((e, i) => {
    it.push(box(C, rx + 5 + i * 6, 6 + i * 0.01, Z0 + 20.4, 5, 0.6, 7, "ok", { key: i }));
    it.push(faceText(C, e.type, [rx + 7.5 + i * 6, 6.6, Z0 + 24], "+y", 1.5, "ink", { key: i + 0.5, weight: 700 }));
  });
  it.push(cyl(C, ST.resolver.x + 11, FRONT + 0.1, Z0 + 4, 1.6, 0.01, "lo", { key: 10 }));
  it.push(box(C, ST.resolver.x + 9.5, FRONT, Z0 + 3, 3, 1, 3, lamp, { key: 11, bevel: 0.3 }));
  return it;
}

type CacheEntry = { type: string; answer: string; ttl: number; at: number };

export function DnsCourier() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [qi, setQi] = useState(0);
  const [cache, setCache] = useState<CacheEntry[]>([]);
  const [clockSkip, setClockSkip] = useState(0); // simulated seconds added by "advance clock"
  const [now, setNow] = useState(() => Date.now());
  const [run, setRun] = useState({ n: 0, cached: false, root: 0 });
  const [fr, setFr] = useState<Fr>({ cart: ST.client.x, token: null, drawer: null, lamp: "mid", stored: false, say: "Pick a record type to look up" });
  const live = useRef({ t: 0, n: -1, done: true, tour: 0 });

  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const age = (e: CacheEntry) => (now - e.at) / 1000 + clockSkip;
  const fresh = cache.filter((e) => age(e) < e.ttl);

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const q = QUERIES[qi];
  const segs = useMemo(() => plan(q, run.cached, run.root), [q, run]);

  const lookup = (i: number) => {
    const qq = QUERIES[i];
    const hit = fresh.some((e) => e.type === qq.type);
    live.current.t = 0;
    live.current.done = false;
    setQi(i);
    setRun((r) => ({ n: r.n + 1, cached: hit, root: hit ? r.root : (r.root + 5) % 13 }));
  };

  const poke = useTour(() => {
    live.current.tour++;
    // tour: A (miss), A again (hit), then the other types
    const seq = [0, 0, 2, 3, 1];
    lookup(seq[live.current.tour % seq.length]);
  }, inView && !reduced, 9, 6);

  useLoop((_t, dt) => {
    const L = live.current;
    if (L.n !== run.n) { L.n = run.n; L.t = 0; L.done = false; }
    if (L.done) return;
    const T = totalOf(segs);
    L.t = reduced ? T : Math.min(T, L.t + dt);
    const f = frameAt(segs, L.t).fr;
    setFr(f);
    if (f.stored && !run.cached && !cache.some((e) => e.type === q.type && age(e) < e.ttl)) {
      setCache((c) => [...c.filter((e) => e.type !== q.type), { type: q.type, answer: q.answer, ttl: q.ttl, at: Date.now() - clockSkip * 1000 }]);
    }
    if (L.t >= T) L.done = true;
  }, inView);

  const shownCache = fr.stored || run.cached ? fresh : fresh.filter((e) => e.type !== q.type);
  const dyn = useMemo(() => ({
    drawer: drawerItems(fr.drawer),
    cart: cartItems(fr.cart, fr.token),
    cache: cacheItems(shownCache, fr.lamp),
  }), [fr, shownCache.map((e) => e.type).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e: React.KeyboardEvent) => {
    poke();
    if (e.key === "ArrowRight") { lookup((qi + 1) % QUERIES.length); e.preventDefault(); }
    if (e.key === "ArrowLeft") { lookup((qi + QUERIES.length - 1) % QUERIES.length); e.preventDefault(); }
    if (e.key === " " || e.key === "Enter") { lookup(qi); e.preventDefault(); }
  };

  return (
    <div>
      <Card
        n={6}
        title="Referral courier"
        hint="← → record type · space look up again"
        readout={<>{fr.say.split(" · ").map((s, i) => (i === 0 ? <b key={i}>{s}</b> : <span key={i}> · {s}</span>))}</>}
        viewBox={vb}
        label="A courier cart carries a DNS question from a laptop to a recursive resolver, then to the root, .com TLD and authoritative cabinets, where a drawer slides out with the referral or answer. The resolver caches the answer for its TTL; a repeat lookup is answered from the cache."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={dyn.cache} />
        <Items items={dyn.drawer} />
        <Items items={dyn.cart} />
      </Card>
      <div className="controls">
        <div className="seg">
          {QUERIES.map((x, i) => (
            <button key={x.type} className={qi === i ? "on" : ""} onClick={() => { poke(); lookup(i); }} title={x.meaning}>
              {x.type} {x.name}
            </button>
          ))}
        </div>
        <button className="pill-btn" onClick={() => { poke(); setClockSkip((s) => s + 600); }}>⏩ +10 min</button>
        <button className="pill-btn" onClick={() => { poke(); setCache([]); setClockSkip(0); }}>Flush cache</button>
      </div>
      <div className="table-wrap">
        <table className="mono" style={{ fontSize: 13 }}>
          <thead><tr><th>Resolver cache</th><th>Answer</th><th>TTL left</th></tr></thead>
          <tbody>
            {fresh.length === 0 && <tr><td colSpan={3} style={{ color: "var(--dim)" }}>empty: the next lookup walks root → TLD → authoritative</td></tr>}
            {fresh.map((e) => (
              <tr key={e.type}>
                <td>{QUERIES.find((x) => x.type === e.type)!.name} <span className="c-teal">{e.type}</span></td>
                <td>{e.answer}</td>
                <td>{Math.max(0, Math.round(e.ttl - age(e)))} s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Legend items={[
        { swatch: "sig", text: "Question / recursive resolver" },
        { swatch: "violet", text: "Root servers (a–m)" },
        { swatch: "blue", text: "TLD servers" },
        { swatch: "teal", text: "Authoritative server" },
        { swatch: "ok", text: "Answer / cached record" },
      ]} />
      <p className="caption">
        The stub on your laptop asks once and waits; the resolver does all the walking. Each server either answers or refers the resolver one level down the tree. Answers are cached for their TTL, so the second lookup never leaves the resolver. Use <b>+10 min</b> to watch the 300 s CNAME expire while the 3600 s records stay.
      </p>
    </div>
  );
}
