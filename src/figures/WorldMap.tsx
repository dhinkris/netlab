import { useMemo, useRef, useState } from "react";
import {
  blob, box, boundsOf, camera, cyl, dotsItem, ease, faceText, halo, lerp, line3, prism, rrect, sortItems,
  type Fam, type Item, type LineItem, type Seg, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useReducedMotion, useTour } from "../iso/live";
import { splitSay, useScript } from "../iso/script";

const C = camera(2, 54);
const SZ = 2, LZ = SZ + 2; // sea top, land top
type Region = { id: string; name: string; x: number; y: number; fam: Fam };
const REGIONS: Region[] = [
  { id: "us", name: "East US", x: 70, y: 38, fam: "blue" },
  { id: "eu", name: "West Europe", x: 118, y: 28, fam: "violet" },
  { id: "as", name: "Southeast Asia", x: 184, y: 56, fam: "teal" },
];
type User = { id: string; name: string; x: number; y: number; pop: [number, number]; pref: string[] };
const USERS: User[] = [
  { id: "br", name: "São Paulo", x: 76, y: 92, pop: [72, 84], pref: ["us", "eu", "as"] },
  { id: "uk", name: "London", x: 112, y: 34, pop: [110, 24], pref: ["eu", "us", "as"] },
  { id: "in", name: "Mumbai", x: 160, y: 52, pop: [158, 44], pref: ["as", "eu", "us"] },
  { id: "au", name: "Sydney", x: 204, y: 98, pop: [198, 92], pref: ["as", "us", "eu"] },
];
const DNS: V3 = [128, 6, 46];
const reg = (id: string) => REGIONS.find((r) => r.id === id)!;

function arc(a: V3, b: V3, lift: number, upTo = 1): V3[] {
  const pts: V3[] = [];
  const n = 30;
  for (let i = 0; i <= Math.round(n * upTo); i++) {
    const u = i / n;
    pts.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u) + Math.sin(Math.PI * u) * lift]);
  }
  return pts;
}

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-8, -8, 236, 124, 6);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, SZ, "sea", { key: -100, bevel: 1 }));
  // graticule
  let grid = "";
  for (let x = 12; x < 228; x += 24) grid += line3(C, [[x, -8, SZ], [x, 116, SZ]]);
  for (let y = 4; y < 116; y += 24) grid += line3(C, [[-8, y, SZ], [228, y, SZ]]);
  it.push({ kind: "line", d: grid, tone: "blue", w: 0.3, layer: 0, key: -99 } as LineItem);
  // continents
  const land: [number, number, number, number, number][] = [[50, 34, 30, 18, 1], [70, 88, 12, 20, 2], [120, 28, 14, 10, 3], [128, 70, 15, 24, 4], [176, 38, 36, 20, 5], [200, 98, 14, 8, 6]];
  land.forEach(([x, y, rx, ry, sd], k) => it.push(prism(C, blob(x, y, rx, ry, sd, 0.16), SZ, LZ - SZ, k % 2 ? "sand" : "moss", { key: -90 + k * 0.01 })));
  // regions: data-centre towers
  REGIONS.forEach((r) => {
    it.push(box(C, r.x - 5, r.y - 4, LZ, 10, 8, 10, "hi", { key: r.y * 0.01, bevel: 0.4 }));
    it.push(box(C, r.x - 5.5, r.y - 4.5, LZ + 10, 11, 9, 1.2, r.fam, { key: r.y * 0.01 + 0.001 }));
    it.push(faceText(C, r.name, [r.x, r.y + 8, LZ], "top", 2.8, "ink", { key: r.y * 0.01 + 0.002, weight: 700 }));
  });
  // Front Door edge POPs and users
  USERS.forEach((u) => {
    it.push(cyl(C, u.pop[0], u.pop[1], LZ, 1.6, 4, "sig", { key: u.pop[1] * 0.01, n: 12 }));
    it.push(cyl(C, u.pop[0], u.pop[1], LZ + 4, 2.4, 1, "sig", { key: u.pop[1] * 0.01 + 0.001, n: 14 }));
    it.push(cyl(C, u.x, u.y, LZ, 1.6, 3, "rose", { key: u.y * 0.01, n: 12 }));
    it.push(cyl(C, u.x, u.y, LZ + 3, 1.6, 1.6, "rose", { key: u.y * 0.01 + 0.001, n: 12 }));
    it.push(faceText(C, u.name, [u.x, u.y + 5, LZ], "top", 2.6, "rose", { key: u.y * 0.01 + 0.002, weight: 700 }));
  });
  // Traffic Manager's DNS beacon hovering above the map
  it.push(cyl(C, DNS[0], DNS[1], DNS[2] - 2, 7, 3, "lit", { key: 50, n: 24, bevel: 0.5 }));
  it.push(faceText(C, "DNS · Traffic Manager", [DNS[0], DNS[1] + 9, DNS[2] - 1], "+y", 2.2, "hi", { key: 50.1, weight: 700 }));
  return sortItems(it);
}

// ---------- script ----------

type Fr = { trail: { pts: V3[]; tone: LineItem["tone"]; dash?: string }[]; dot: V3 | null; dotTone: Fam; x: V3 | null; say: string };
type Mode = "fd" | "tm";

function script(mode: Mode, user: User, down: string | null): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  const done: Fr["trail"] = [];
  const F = (p: Partial<Fr>): Fr => ({ trail: [...done], dot: null, dotTone: "sig", x: null, say: "", ...p });
  const leg = (a: V3, b: V3, lift: number, tone: LineItem["tone"], say: string, d = 1.2, dash?: string, keep = true) => {
    segs.push({ d, f: (u) => { const pts = arc(a, b, lift, ease(u)); return F({ trail: [...done, { pts, tone, dash }], dot: pts[pts.length - 1], dotTone: tone as Fam, say }); } });
    if (keep) done.push({ pts: arc(a, b, lift), tone, dash });
  };
  const U: V3 = [user.x, user.y, LZ + 4];
  const P: V3 = [user.pop[0], user.pop[1], LZ + 5];
  const healthy = user.pref.filter((r) => r !== down);
  const best = reg(healthy[0]);
  const B: V3 = [best.x, best.y, LZ + 11];
  if (mode === "fd") {
    leg(U, P, 4, "rose", `${user.name} user → nearest Front Door edge · anycast: one IP, the closest POP answers`, 0.9);
    segs.push({ d: 0.6, f: () => F({ say: `Edge terminates TLS, checks WAF and cache · ${down && user.pref[0] === down ? `${reg(down).name} is failing probes` : "picks the closest healthy origin"}` }) });
    leg(P, B, 22, "sig", `Over Microsoft's backbone to ${best.name}`, 1.5);
    segs.push({ d: 1.5, f: () => F({ say: `${user.name} served by ${best.name}${down && user.pref[0] === down ? " · failover was instant: the edge stopped using the failed origin" : ""}` }) });
  } else {
    const D = DNS;
    leg(U, D, 0, "hi", `${user.name} resolves shop.example.com · Traffic Manager answers by DNS`, 1.0, "2 2");
    const firstAnswer = down && user.pref[0] === down ? reg(down) : best;
    leg(D, U, 0, "hi", `Answer: ${firstAnswer.name}'s IP · cached for the DNS TTL`, 0.8, "2 2");
    const A: V3 = [firstAnswer.x, firstAnswer.y, LZ + 11];
    if (firstAnswer.id === down) {
      leg(U, A, 10, "warn", `Client connects straight to ${firstAnswer.name} over the internet · but it's down`, 1.3, "1.5 1.5", false);
      segs.push({ d: 1.0, f: () => F({ x: A, say: "Connection fails until the cached DNS answer expires" }) });
      leg(U, D, 0, "hi", "TTL expired · resolve again", 0.8, "2 2");
      leg(D, U, 0, "hi", `New answer: ${best.name}`, 0.7, "2 2");
    }
    leg(U, B, 10, "ok", `Client connects directly to ${best.name} · Traffic Manager is never in the data path`, 1.4, "1.5 1.5");
    segs.push({ d: 1.4, f: () => F({ say: `${user.name} served by ${best.name}` }) });
  }
  return segs;
}

function liveItems(fr: Fr, down: string | null): Item[] {
  const it: Item[] = [];
  fr.trail.forEach((t, k) => { if (t.pts.length > 1) it.push({ kind: "line", d: line3(C, t.pts), tone: t.tone, w: 0.9, layer: 0, key: 60 + k, dash: t.dash } as LineItem); });
  if (fr.dot) it.push({ ...dotsItem(C, [fr.dot], 1.8, fr.dotTone, 0), key: 70 });
  if (fr.x) it.push({ kind: "line", d: line3(C, [[fr.x[0] - 4, fr.x[1] - 4, fr.x[2] + 4], [fr.x[0] + 4, fr.x[1] + 4, fr.x[2] + 4]]) + line3(C, [[fr.x[0] - 4, fr.x[1] + 4, fr.x[2] + 4], [fr.x[0] + 4, fr.x[1] - 4, fr.x[2] + 4]]), tone: "warn", w: 1.4, layer: 0, key: 71 } as LineItem);
  if (down) {
    const r = reg(down);
    it.push(box(C, r.x - 6, r.y - 5, LZ + 11.2, 12, 10, 1, "warn", { key: 40 }));
    it.push(faceText(C, "DOWN", [r.x, r.y + 5, LZ + 13], "+y", 2.2, "warn", { key: 40.1, weight: 700 }));
  }
  return it;
}

export function WorldMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [mode, setMode] = useState<Mode>("fd");
  const [ui, setUi] = useState(1);
  const [down, setDown] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const tour = useRef(0);

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y - 10} ${b.w} ${b.h + 10}`; }, [stat]);
  const segs = useMemo(() => script(mode, USERS[ui], down), [mode, ui, down]);
  const fr = useScript(segs, `${run}-${mode}-${ui}-${down}`, inView, reduced, { trail: [], dot: null, dotTone: "sig", x: null, say: "" } as Fr);

  const poke = useTour(() => {
    const seq: [Mode, number, string | null][] = [["fd", 1, null], ["fd", 0, null], ["fd", 1, "eu"], ["tm", 1, null], ["tm", 1, "eu"], ["fd", 3, null]];
    const [m, u, d] = seq[++tour.current % seq.length];
    setMode(m); setUi(u); setDown(d); setRun((r) => r + 1);
  }, inView && !reduced, 7.5, 6);
  const dyn = useMemo(() => liveItems(fr, down), [fr, down]);
  const { head, rest } = splitSay(fr.say);

  return (
    <div>
      <Card
        n={31}
        title="World map"
        hint="pick a user, a mode, and fail a region"
        readout={<><b>{head}</b>{rest.map((s, i) => <span key={i}> · {s}</span>)}</>}
        viewBox={vb}
        label="A world map with three Azure regions, four users and a Front Door edge location near each user. In Front Door mode the user connects to the nearest edge, which carries the request over Microsoft's backbone to the closest healthy region. In Traffic Manager mode the user asks DNS, gets one region's address, and connects straight to it; if that region fails, the client keeps trying it until the cached answer expires."
        onKeyDown={() => poke()}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={sortItems(dyn)} />
      </Card>
      <div className="controls">
        <div className="seg">
          <button className={mode === "fd" ? "on" : ""} onClick={() => { poke(); setMode("fd"); setRun((r) => r + 1); }}>Front Door</button>
          <button className={mode === "tm" ? "on" : ""} onClick={() => { poke(); setMode("tm"); setRun((r) => r + 1); }}>Traffic Manager</button>
        </div>
        <div className="seg">
          {USERS.map((u, i) => <button key={u.id} className={ui === i ? "on" : ""} onClick={() => { poke(); setUi(i); setRun((r) => r + 1); }}>{u.name}</button>)}
        </div>
        <button className="pill-btn" onClick={() => { poke(); setDown(down ? null : "eu"); setRun((r) => r + 1); }} style={{ borderColor: down ? "var(--warn)" : undefined }}>{down ? "Restore West Europe" : "Fail West Europe"}</button>
      </div>
      <Legend items={[
        { swatch: "rose", text: "Users" },
        { swatch: "sig", text: "Front Door edge (POP) · backbone path" },
        { swatch: "lit", text: "Traffic Manager (DNS only)" },
        ...REGIONS.map((r) => ({ swatch: r.fam as string, text: r.name })),
      ]} />
      <p className="caption">
        Both send users to a nearby healthy region. Front Door is in the data path, so it can fail over instantly and adds caching, TLS and WAF at the edge. Traffic Manager only answers DNS questions, so it works for any protocol but fails over only as fast as clients forget the old answer.
      </p>
    </div>
  );
}
