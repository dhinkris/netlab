import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, cyl, ease, faceText, halo, lerp, line3, prism, rrect, sortItems,
  type Fam, type Item, type LineItem, type Seg, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useReducedMotion, useTour } from "../iso/live";
import { splitSay, useScript } from "../iso/script";

const C = camera(12, 22);
const FZ = 2;
const NAME = "mystorage.blob.core.windows.net";
const PL = "mystorage.privatelink.blob.core.windows.net";
const PRIV_IP = "10.0.1.5", PUB_IP = "20.60.40.4"; // the public one is an example address
type Caller = { id: string; label: string; sub: string; linked: boolean; fam: Fam; z: number };
const CALLERS: Caller[] = [
  { id: "vm", label: "vm-app", sub: "vnet-app (zone linked)", linked: true, fam: "teal", z: 50 },
  { id: "other", label: "vm-other", sub: "vnet-other (not linked)", linked: false, fam: "sig", z: 38 },
  { id: "onprem", label: "on-prem server", sub: "via DNS Private Resolver", linked: true, fam: "violet", z: 26 },
  { id: "laptop", label: "home laptop", sub: "public internet", linked: false, fam: "rose", z: 14 },
];
const BOARD = { x0: 60, x1: 170, z0: 8, z1: 64 };
const callerJack = (c: Caller): V3 => [BOARD.x0 + 10, 3, FZ + c.z];
const ANS = { priv: [BOARD.x1 - 14, 3, FZ + 46] as V3, pub: [BOARD.x1 - 14, 3, FZ + 22] as V3 };
const BOOKS = { pub: [96, 26, FZ + 14] as V3, priv: [134, 26, FZ + 14] as V3 };

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-6, -10, 200, 56, 3);
  it.push(halo(C, plan, 5));
  it.push(prism(C, plan, 0, FZ, "sand", { key: -100, bevel: 0.5 }));
  let boards = "";
  for (let y = -6; y < 46; y += 5) boards += line3(C, [[-6, y, FZ], [194, y, FZ]]);
  it.push({ kind: "line", d: boards, tone: "faint", w: 0.4, layer: 0, key: -99 } as LineItem);
  // telephones for each caller on a side table
  it.push(box(C, 2, -6, FZ, 46, 12, 64, "hi", { key: -90 }));
  CALLERS.forEach((c) => {
    it.push(box(C, 6, 6, FZ + c.z - 3, 10, 5, 4, c.fam, { key: -89, bevel: 0.4 }));
    it.push(box(C, 7, 7, FZ + c.z + 1, 8, 3, 1.4, "lo", { key: -88.9, r: 0.6 }));
    it.push(faceText(C, c.label, [18, 6, FZ + c.z + 0.6], "+y", 2.1, "ink", { anchor: "start", key: -88.8, weight: 700 }));
    it.push(faceText(C, c.sub, [18, 6, FZ + c.z - 2.4], "+y", 1.6, "ink", { anchor: "start", key: -88.8 }));
    it.push({ kind: "line", d: line3(C, [[16, 6, FZ + c.z - 1], [48, 3, FZ + c.z - 1], callerJack(c)]), tone: "mid", w: 0.6, layer: 0, key: -88 } as LineItem);
  });
  // the switchboard: jack field, answer jacks
  it.push(box(C, BOARD.x0, -6, FZ, BOARD.x1 - BOARD.x0, 9, BOARD.z1, "sand", { key: -80, bevel: 0.6 }));
  it.push(box(C, BOARD.x0 + 4, 3, FZ + BOARD.z0, BOARD.x1 - BOARD.x0 - 8, 0.4, BOARD.z1 - BOARD.z0 - 6, "lo", { key: -79.9 }));
  for (let r = 0; r < 9; r++) for (let c = 0; c < 14; c++) {
    it.push(cyl(C, BOARD.x0 + 18 + c * 6, 3.4, FZ + 14 + r * 5, 1, 0.01, "mid", { key: -79.8, n: 10 }));
  }
  it.push(faceText(C, "DNS RESOLVER · 168.63.129.16", [(BOARD.x0 + BOARD.x1) / 2, 3.6, FZ + BOARD.z1 - 3], "+y", 2.4, "sig", { key: -79.7, weight: 700 }));
  for (const [k, p, fam, t] of [["priv", ANS.priv, "teal", PRIV_IP], ["pub", ANS.pub, "sig", PUB_IP]] as const) {
    it.push(box(C, p[0] - 7, 3, p[2] - 4, 14, 0.8, 8, fam, { key: -79.6, bevel: 0.3 }));
    it.push(faceText(C, t, [p[0], 3.9, p[2] - 1.5], "+y", 1.9, "ink", { key: -79.5, weight: 700 }));
    it.push(faceText(C, k === "priv" ? "private" : "public", [p[0], 3.9, p[2] + 2], "+y", 1.6, "ink", { key: -79.5 }));
  }
  // operator's desk with two directories
  it.push(box(C, 76, 18, FZ, 80, 18, 12, "hi", { key: -60, bevel: 0.4 }));
  for (const [p, fam, t1, t2] of [[BOOKS.pub, "sig", "PUBLIC DNS", "internet zones"], [BOOKS.priv, "teal", "PRIVATE ZONE", "privatelink.blob…"]] as const) {
    it.push(box(C, p[0] - 12, p[1] - 6, p[2], 24, 12, 3, fam, { key: -59, bevel: 0.4 }));
    it.push(faceText(C, t1, [p[0], p[1] + 6, p[2] + 1.8], "+y", 1.9, "ink", { key: -58.9, weight: 700 }));
    it.push(faceText(C, t2, [p[0], p[1], p[2] + 3], "top", 1.8, "ink", { key: -58.9 }));
  }
  it.push(faceText(C, "linked to: vnet-app", [BOOKS.priv[0], 37, FZ + 6], "+y", 1.8, "teal", { key: -58.8, weight: 700 }));
  return sortItems(it);
}

type Fr = { cord: V3[] | null; cordTone: LineItem["tone"]; book: "pub" | "priv" | null; trace: string[]; say: string };

function cordPath(a: V3, b: V3, u: number): V3[] {
  const pts: V3[] = [];
  const n = 24;
  for (let i = 0; i <= Math.round(n * u); i++) {
    const t = i / n;
    pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) + Math.sin(Math.PI * t) * 10, lerp(a[2], b[2], t) - Math.sin(Math.PI * t) * 10]);
  }
  return pts;
}

function script(c: Caller): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  const trace: string[] = [];
  const F = (p: Partial<Fr>): Fr => ({ cord: null, cordTone: "mid", book: null, trace: [...trace], say: "", ...p });
  segs.push({ d: 0.8, f: () => F({ say: `${c.label} asks: what's ${NAME}?` }) });
  segs.push({ d: 1.0, f: () => F({ book: "pub", say: "Public DNS answers first: it's a CNAME" }) });
  trace.push(`${NAME}  CNAME  ${PL}`);
  segs.push({ d: 1.0, f: () => F({ book: c.linked ? "priv" : "pub", say: c.linked ? `${PL} · this resolver can see the private zone` : `${PL} · no private zone visible here, keep following public DNS` }) });
  const priv = c.linked;
  trace.push(priv ? `${PL}  A  ${PRIV_IP}   (private zone)` : `${PL}  CNAME … → A ${PUB_IP}   (public)`);
  const target = priv ? ANS.priv : ANS.pub;
  const tone: LineItem["tone"] = priv ? "teal" : "sig";
  segs.push({ d: 1.2, f: (u) => F({ cord: cordPath(callerJack(c), target, ease(u)), cordTone: tone, book: priv ? "priv" : "pub", say: `Answer: ${priv ? PRIV_IP : PUB_IP}` }) });
  const end = c.id === "vm" ? "Connects privately through the private endpoint"
    : c.id === "onprem" ? "On-prem forwards *.blob.core.windows.net to the DNS Private Resolver, which sees the zone · private answer"
    : c.id === "other" ? "vnet-other isn't linked to the zone · it gets the public IP, which is blocked if public access is off"
    : "The internet gets the public IP · blocked if public access is disabled";
  segs.push({ d: 1.8, f: () => F({ cord: cordPath(callerJack(c), target, 1), cordTone: tone, book: priv ? "priv" : "pub", say: `${priv ? PRIV_IP : PUB_IP} · ${end}` }) });
  return segs;
}

export function Switchboard() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [ci, setCi] = useState(0);
  const [run, setRun] = useState(0);
  const tour = useRef(0);

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const segs = useMemo(() => script(CALLERS[ci]), [ci]);
  const fr = useScript(segs, `${run}-${ci}`, inView, reduced, { cord: null, cordTone: "mid", book: null, trace: [], say: "" } as Fr);
  const go = (i: number) => { setCi(i); setRun((r) => r + 1); };
  const poke = useTour(() => go(++tour.current % CALLERS.length), inView && !reduced, 6.5, 6);

  const dyn = useMemo(() => {
    const it: Item[] = [];
    const c = CALLERS[ci];
    it.push(cyl(C, callerJack(c)[0], 3.6, callerJack(c)[2], 1.6, 0.01, c.fam, { key: 0, n: 12 }));
    if (fr.book) {
      // the open directory lifts and shows what it's reading
      const p = BOOKS[fr.book];
      it.push(box(C, p[0] - 13, p[1] - 7, p[2] + 3, 26, 14, 1.4, fr.book === "priv" ? "teal" : "sig", { key: 1, bevel: 0.3 }));
      it.push(faceText(C, fr.book === "priv" ? `A ${PRIV_IP}` : fr.cord ? `A ${PUB_IP}` : "CNAME → privatelink", [p[0], p[1], p[2] + 4.5], "top", 2.2, "ink", { key: 1.1, weight: 700 }));
    }
    if (fr.cord && fr.cord.length > 1) it.push({ kind: "line", d: line3(C, fr.cord), tone: fr.cordTone, w: 1.2, layer: 0, key: 2 } as LineItem);
    return it;
  }, [fr, ci]);
  const { head, rest } = splitSay(fr.say);

  return (
    <div>
      <Card
        n={33}
        title="Switchboard"
        hint="pick who's calling"
        readout={<><b>{head}</b>{rest.map((s, i) => <span key={i}> · {s}</span>)}</>}
        viewBox={vb}
        label="An old telephone exchange stands for DNS resolution. Four callers ask for the storage account's name. The operator first checks the public directory, which says the name is an alias for its privatelink name; callers whose resolver can see the private zone get patched to the private address 10.0.1.5, everyone else to the public address."
        onKeyDown={() => poke()}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={sortItems(dyn)} />
      </Card>
      <div className="controls">
        <div className="seg">
          {CALLERS.map((c, i) => <button key={c.id} className={ci === i ? "on" : ""} onClick={() => { poke(); go(i); }}><span className={`c-${{ teal: "teal", sig: "amber", violet: "violet", rose: "rose" }[c.fam as string]}`}>●</span> {c.label}</button>)}
        </div>
      </div>
      <div className="table-wrap">
        <table className="mono" style={{ fontSize: 12.5 }}>
          <thead><tr><th>Resolution trace for {CALLERS[ci].label}</th></tr></thead>
          <tbody>
            {fr.trace.length === 0 && <tr><td style={{ color: "var(--dim)" }}>dialling…</td></tr>}
            {fr.trace.map((t, i) => <tr key={i}><td>{t}</td></tr>)}
          </tbody>
        </table>
      </div>
      <Legend items={[
        { swatch: "sig", text: "Public DNS answer" },
        { swatch: "teal", text: "Private zone answer (linked VNets)" },
        { swatch: "violet", text: "On-premises via DNS Private Resolver" },
      ]} />
      <p className="caption">
        The trick is that the public name never changes: Azure's public DNS always aliases it to a <code>privatelink</code> name. Whoever can see your private zone for that name gets the private IP; everyone else falls through to the public one.
      </p>
    </div>
  );
}
