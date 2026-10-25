import { useMemo, useRef, useState } from "react";
import {
  alongPath, box, boundsOf, camera, dotsItem, ease, faceText, frameAt, halo, headingAt, line3, offsetPath,
  pathOf, planeMatrix, prism, proj, rotRect, rrect, screws, smoothPath, sortItems, totalOf,
  type Fam, type Item, type LineItem, type Seg, type Solid, type TextItem, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { ipStr, parseIp, type Octets } from "../models/ip";
import { lookup, ROUTES, SAMPLES } from "../models/routes";

const C = camera(24, 36);
const GZ = 6; // grass top
const RZ = GZ + 1.2; // rail top
const ROUTE_FAM: Fam[] = ["teal", "violet", "blue", "sig"];
const END_Y = [-8, 20, 48, 76];
const JX = -6, JY = 40;
const MAIN: V3[] = smoothPath([[-92, JY, RZ], [JX, JY, RZ]], 2);
const BRANCH = END_Y.map((y) => smoothPath([[JX, JY, RZ], [14, JY, RZ], [60, y, RZ], [104, y, RZ]], 2));
const FULL = BRANCH.map((b) => [...MAIN, ...b.slice(1)]);

/** A flat polygon lying on the ground (ballast beds, platforms). */
function flat(pts: V3[], fam: Fam, key: number, edge = true): Solid {
  const d = pathOf(pts.map((p) => proj(C, p)), true);
  return { kind: "solid", faces: [{ d, fill: `var(--${fam}-t)` }], creases: "", outline: edge ? d : "", layer: 0, key };
}
const band = (path: V3[], w: number, z: number): V3[] => [
  ...offsetPath(path, w).map(([x, y]): V3 => [x, y, z]),
  ...offsetPath(path, -w).reverse().map(([x, y]): V3 => [x, y, z]),
];

/** Track in three passes so beds never cover rails: key + 0 beds, + 10 sleepers, + 20 rails. */
function trackItems(path: V3[], railTone: LineItem["tone"], key: number, sleepers = true): Item[] {
  const it: Item[] = [];
  it.push({ ...flat(band(path, 4, GZ + 0.05), "sand", key, false) });
  if (sleepers) {
    let d = "";
    let acc = 0;
    for (let k = 1; k < path.length; k++) {
      acc += Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]);
      if (acc < 3.6) continue;
      acc = 0;
      const [a, b] = [offsetPath(path, 2.8)[k], offsetPath(path, -2.8)[k]];
      d += line3(C, [[a[0], a[1], GZ + 0.4], [b[0], b[1], GZ + 0.4]]);
    }
    it.push({ kind: "line", d, tone: "lo", w: 1.1, layer: 0, key: key + 10 } as LineItem);
  }
  for (const s of [1.6, -1.6]) it.push({ kind: "line", d: line3(C, offsetPath(path, s)), tone: railTone, w: 0.7, layer: 0, key: key + 20 } as LineItem);
  return it;
}

function staticItems(): Item[] {
  const it: Item[] = [];
  // embankment: soil plinth with a grass top
  const plan = rrect(-104, -26, 242, 124, 8);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, GZ - 1, "sand", { key: -60, bevel: 1.2 }));
  it.push(prism(C, rrect(-103, -25, 240, 122, 7.5), GZ - 1, 1, "moss", { key: -59 }));
  // grass tufts
  let tufts = "";
  for (let i = 0; i < 90; i++) {
    const x = -98 + ((i * 53) % 230), y = -20 + ((i * 37) % 112);
    if (Math.abs(y - JY) < 8 && x < 0) continue;
    tufts += line3(C, [[x, y, GZ], [x + 0.6, y - 0.4, GZ + 1.6]]) + line3(C, [[x + 1, y, GZ], [x + 1.2, y + 0.2, GZ + 1.3]]);
  }
  it.push({ kind: "line", d: tufts, tone: "moss", w: 0.45, layer: 0, key: -58 } as LineItem);
  // main line and four branches (rails redrawn live in route colours)
  it.push(...trackItems(MAIN, "hi", -50));
  BRANCH.forEach((b, i) => it.push(...trackItems(b, "mid", -49.5 + i * 0.1)));
  // buffer stops and station signs at each end
  ROUTES.forEach((r, i) => {
    const y = END_Y[i];
    it.push(box(C, 104, y - 4, GZ, 4, 8, 4, "hi", { key: 10 + i, bevel: 0.4 }));
    it.push(box(C, 104.5, y - 3, GZ + 4, 3, 6, 1.4, ROUTE_FAM[i], { key: 10.1 + i }));
    it.push(flat([[86, y + 5, GZ + 0.1], [112, y + 5, GZ + 0.1], [112, y + 12, GZ + 0.1], [86, y + 12, GZ + 0.1]], "hi", 9 + i));
    it.push(box(C, 108, y + 9.5, GZ, 1.2, 1.2, 12, "mid", { key: 10.2 + i }));
    it.push(box(C, 112, y + 6, GZ + 8, 26, 1, 8.5, ROUTE_FAM[i], { key: 10.3 + i, bevel: 0.3 }));
    it.push(faceText(C, r.dest, [125, y + 7, GZ + 14], "+y", 2.4, "ink", { key: 10.4 + i, weight: 700 }));
    it.push(faceText(C, `${r.prefix}/${r.len}`, [125, y + 7, GZ + 10.5], "+y", 2.2, "ink", { key: 10.4 + i }));
  });
  // signal box: walls, windows, roof
  const hx = -64, hy = 2;
  it.push(box(C, hx, hy, GZ, 28, 18, 16, "sand", { key: 1, bevel: 0.5 }));
  for (let k = 0; k < 4; k++) it.push(box(C, hx + 2.5 + k * 6.2, hy + 18, GZ + 8, 4.6, 0.4, 5.4, "sea", { key: 1.1 }));
  it.push(box(C, hx + 11, hy + 18, GZ, 6, 0.4, 7, "lo", { key: 1.1 }));
  it.push(box(C, hx - 2, hy - 2, GZ + 16, 32, 22, 2, "warn", { key: 1.2, r: 0.6, bevel: 0.5 }));
  it.push(screws(C, hx - 2, hy - 2, 32, 22, GZ + 18, 2));
  it.push(faceText(C, "SIGNAL BOX", [hx + 14, hy + 9, GZ + 18], "top", 2.6, "ink", { key: 1.3, weight: 700 }));
  // lever frame on the ground in front of the box
  it.push(box(C, hx - 1, 25, GZ, 30, 4, 2, "mid", { key: 2, bevel: 0.4 }));
  return sortItems(it);
}

// ---------- script ----------

type Fr = { u: number; route: number; lit: number[]; pulled: number; say: string; phase: "in" | "match" | "out" | "done" };

function script(ip: Octets): Seg<Fr>[] {
  const { hits, best } = lookup(ip);
  const r = ROUTES[best];
  const path = FULL[best];
  let L = 0;
  for (let k = 1; k < path.length; k++) L += Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]);
  const stopAt = (Math.abs(MAIN[1][0] - MAIN[0][0]) - 18) / L; // wagon waits just before the points
  const F = (p: Partial<Fr> & { u: number }): Fr => ({ route: best, lit: [], pulled: -1, say: "", phase: "in", ...p });
  const segs: Seg<Fr>[] = [];
  segs.push({ d: 1.5, f: (u) => F({ u: stopAt * ease(u), say: `Packet for ${ipStr(ip)} arrives at the router` }) });
  hits.forEach((h, k) => {
    segs.push({ d: 0.45, f: () => F({ u: stopAt, lit: hits.slice(0, k + 1), phase: "match", say: `Matches ${ROUTES[h].prefix}/${ROUTES[h].len}` }) });
  });
  segs.push({ d: 0.7, f: () => F({ u: stopAt, lit: hits, pulled: best, phase: "match", say: `${hits.length} route${hits.length > 1 ? "s" : ""} match · longest prefix /${r.len} wins` }) });
  segs.push({ d: 2.0, f: (u) => F({ u: stopAt + (1 - stopAt) * ease(u), lit: hits, pulled: best, phase: "out", say: `Next hop: ${r.next} (${r.nextType})` }) });
  segs.push({ d: 1.6, f: () => F({ u: 1, lit: hits, pulled: best, phase: "done", say: `Delivered via ${r.dest.toLowerCase()} · /${r.len} was the most specific match` }) });
  return segs;
}

// ---------- live parts ----------

function leverItems(lit: number[], pulled: number): Item[] {
  const it: Item[] = [];
  const hx = -64;
  ROUTES.forEach((_, i) => {
    const x = hx + 3 + i * 7;
    const on = lit.includes(i);
    // lamp on the frame, lever leaning back or pulled toward the track
    it.push(box(C, x - 1.2, 28.6, GZ + 0.6, 2.4, 0.6, 1.2, on ? ROUTE_FAM[i] : "lo", { key: i * 2 }));
    const lean: [number, number] = i === pulled ? [0, 5] : [0, -3];
    it.push(box(C, x - 0.7, 26.3, GZ + 2, 1.4, 1.4, 10, "hi", { key: i * 2 + 1, shift: lean }));
    it.push(box(C, x - 1 + lean[0], 26 + lean[1], GZ + 12, 2, 2, 1.8, ROUTE_FAM[i], { key: i * 2 + 1.5, bevel: 0.2 }));
  });
  return sortItems(it);
}

function wagonItems(ip: Octets, path: V3[], u: number): Item[] {
  const p = alongPath(path, u);
  const a = headingAt(path, u);
  const it: Item[] = [];
  it.push(prism(C, rotRect(p[0], p[1], 14, 6.4, a), RZ, 1.4, "lo", { key: 0 }));
  it.push(prism(C, rotRect(p[0], p[1], 12.6, 6, a), RZ + 1.4, 4.6, "hi", { key: 1, bevel: 0.4 }));
  it.push(prism(C, rotRect(p[0], p[1], 10, 4.4, a), RZ + 6, 0.4, "lit", { key: 2 }));
  const ca = Math.cos(a), sa = Math.sin(a);
  const wheels: V3[] = [];
  for (const dx of [-4.5, 4.5]) for (const dy of [-3.3, 3.3]) wheels.push([p[0] + dx * ca - dy * sa, p[1] + dx * sa + dy * ca, RZ + 0.7]);
  it.push(dotsItem(C, wheels, 0.9, "mid", 0));
  (it[it.length - 1] as { key: number }).key = -1;
  const t: TextItem = {
    kind: "text", text: ipStr(ip), size: 1.9, tone: "ink", anchor: "middle", weight: 700, mono: true, layer: 0, key: 3,
    matrix: planeMatrix(C, [p[0], p[1], RZ + 6.4], [ca, sa, 0], [-sa, ca, 0]),
  };
  it.push(t);
  return sortItems(it);
}

export function RailJunction() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [ip, setIp] = useState<Octets>([10, 1, 2, 7]);
  const [draft, setDraft] = useState("10.1.2.7");
  const [run, setRun] = useState(0);
  const [fr, setFr] = useState<Fr>({ u: 0, route: 0, lit: [], pulled: -1, say: "", phase: "in" });
  const live = useRef({ t: 0, run: -1, done: false, tour: 0 });

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const segs = useMemo(() => script(ip), [ip, run]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (o: Octets) => { setIp(o); setDraft(ipStr(o)); setRun((r) => r + 1); };
  const poke = useTour(() => { live.current.tour = (live.current.tour + 1) % SAMPLES.length; go(parseIp(SAMPLES[live.current.tour].ip)!); }, inView && !reduced, totalOf(segs) + 1, 6);

  useLoop((_t, dt) => {
    const L = live.current;
    if (L.run !== run) { L.run = run; L.t = 0; L.done = false; }
    if (L.done) return;
    const T = totalOf(segs);
    L.t = reduced ? T : Math.min(T, L.t + dt);
    setFr(frameAt(segs, L.t).fr);
    if (L.t >= T) L.done = true;
  }, inView);

  const dyn = useMemo(() => {
    const rails: Item[] = [];
    // the chosen route's rails light up once its lever is pulled
    if (fr.pulled >= 0) {
      for (const s of [1.6, -1.6]) rails.push({ kind: "line", d: line3(C, offsetPath(BRANCH[fr.pulled], s)), tone: ROUTE_FAM[fr.pulled], w: 0.9, layer: 0, key: 0 } as LineItem);
    }
    return { rails, levers: leverItems(fr.lit, fr.pulled), wagon: wagonItems(ip, FULL[fr.route], fr.u) };
  }, [fr, ip]);

  const { hits, best } = lookup(ip);
  const onKey = (e: React.KeyboardEvent) => {
    poke();
    const k = Number(e.key);
    if (k >= 1 && k <= SAMPLES.length) go(parseIp(SAMPLES[k - 1].ip)!);
    if (e.key === " " || e.key === "Enter") { go(ip); e.preventDefault(); }
  };

  return (
    <div>
      <Card
        n={10}
        title="Junction & signal box"
        hint="1–4 destinations · space replay"
        readout={<>{fr.say.split(" · ").map((s, i) => (i === 0 ? <b key={i}>{s}</b> : <span key={i}> · {s}</span>))}</>}
        viewBox={vb}
        label="A railway junction on an embankment. A wagon labelled with a destination IP waits at the points; the signal box lights a lamp under every lever whose route contains the address, pulls the lever of the most specific route, and the wagon rolls down that branch to its station."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={dyn.rails} />
        <Items items={dyn.levers} />
        <Items items={dyn.wagon} />
      </Card>
      <div className="controls">
        <input className="ctl-input" value={draft} aria-label="Destination IP"
          style={{ borderColor: parseIp(draft) ? undefined : "var(--warn)" }}
          onChange={(e) => { poke(); setDraft(e.target.value); const p = parseIp(e.target.value); if (p) { setIp(p); setRun((r) => r + 1); } }} />
        <div className="seg">
          {SAMPLES.map((s) => (
            <button key={s.ip} className={ipStr(ip) === s.ip ? "on" : ""} title={s.why} onClick={() => { poke(); go(parseIp(s.ip)!); }}>{s.ip}</button>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table className="mono" style={{ fontSize: 13 }}>
          <thead><tr><th>Prefix</th><th>Next hop type</th><th>Contains {ipStr(ip)}?</th></tr></thead>
          <tbody>
            {ROUTES.map((r, i) => (
              <tr key={r.prefix} style={{ fontWeight: i === best ? 700 : 400, opacity: hits.includes(i) ? 1 : 0.5 }}>
                <td className={`c-${{ teal: "teal", violet: "violet", blue: "blue", sig: "amber" }[ROUTE_FAM[i] as string]}`}>{r.prefix}/{r.len}</td>
                <td>{r.nextType}</td>
                <td>{hits.includes(i) ? (i === best ? "yes · longest, wins" : "yes") : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Legend items={[
        { swatch: "teal", text: "/24 local subnet" },
        { swatch: "violet", text: "/16 peered VNet" },
        { swatch: "blue", text: "/8 on-premises via VPN" },
        { swatch: "sig", text: "/0 default route (internet)" },
      ]} />
      <p className="caption">
        A lamp lights under every lever whose route contains the destination; only the most specific one is pulled. 0.0.0.0/0 contains every address, so it is the route of last resort: it only wins when nothing narrower matches.
      </p>
    </div>
  );
}
