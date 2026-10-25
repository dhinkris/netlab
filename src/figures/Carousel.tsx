import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, cyl, faceText, halo, lerp, line3, prism, rotRect, rrect, sortItems,
  type Fam, type Item, type LineItem, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";

const C = camera(24, 40);
const FZ = 2, BZ = FZ + 6; // floor, belt top
const CX = 112, CY = 62, R = 38;
const ENTRY_A = Math.PI; // bags drop on at the left
const GATES = [-Math.PI / 3, Math.PI / 6, (2 * Math.PI) / 3].map((a) => a + 2 * Math.PI); // angles going clockwise from entry
const BACKENDS = [
  { name: "vm-1", ip: "10.0.1.4" },
  { name: "vm-2", ip: "10.0.1.5" },
  { name: "vm-3", ip: "10.0.1.6" },
];
const FLOWS = [
  { id: "A", src: "198.51.100.7:50122", fam: "blue" as Fam },
  { id: "B", src: "198.51.100.7:50123", fam: "violet" as Fam },
  { id: "C", src: "192.0.2.44:61002", fam: "rose" as Fam },
  { id: "D", src: "203.0.113.90:40441", fam: "sand" as Fam },
  { id: "E", src: "192.0.2.10:55870", fam: "moss" as Fam },
];
const ringPt = (a: number, r = R, z = BZ): V3 => [CX + r * Math.cos(a), CY + r * Math.sin(a), z];

/** 5-tuple hash → one of the healthy backends (stable while the healthy set is unchanged). */
function pickBackend(src: string, healthy: number[]) {
  let h = 2166136261;
  for (const ch of `${src}|203.0.113.10:443|TCP`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return healthy[h % healthy.length];
}

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-10, -4, 214, 132, 5);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, FZ, "mid", { key: -100, bevel: 0.6 }));
  let tiles = "";
  for (let x = -6; x < 204; x += 12) tiles += line3(C, [[x, -4, FZ], [x, 128, FZ]]);
  for (let y = 2; y < 128; y += 12) tiles += line3(C, [[-10, y, FZ], [204, y, FZ]]);
  it.push({ kind: "line", d: tiles, tone: "faint", w: 0.35, layer: 0, key: -99 } as LineItem);
  // carousel: skirt, slatted belt, central island
  it.push(cyl(C, CX, CY, FZ, R + 6, BZ - FZ - 1, "lo", { key: -50, n: 48 }));
  const N = 40;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const [x, y] = ringPt(a);
    it.push(prism(C, rotRect(x, y, 6.6, 11, a), BZ - 1, 1, "hi", { key: -40 + Math.sin(a) * 0.5 + Math.cos(a) * 0.01 }));
  }
  it.push(cyl(C, CX, CY, FZ, R - 7, BZ - FZ + 2, "violet", { key: -30, n: 44, bevel: 0.6 }));
  it.push(faceText(C, "AZURE LOAD BALANCER", [CX, CY - 5, BZ + 2], "top", 3, "ink", { key: -29.9, weight: 700 }));
  it.push(faceText(C, "frontend 203.0.113.10:443", [CX, CY + 1, BZ + 2], "top", 2.4, "ink", { key: -29.9 }));
  it.push(faceText(C, "hash(5-tuple) → backend", [CX, CY + 6, BZ + 2], "top", 2.2, "ink", { key: -29.9 }));
  // entry chute from the internet
  const [ex, ey] = ringPt(ENTRY_A, R + 8);
  it.push(box(C, ex - 30, ey - 6, FZ, 26, 12, BZ - FZ + 6, "sig", { key: -20, bevel: 0.4, shift: [0, 0] }));
  it.push(faceText(C, "FROM INTERNET", [ex - 17, ey + 6, BZ + 1], "+y", 2, "ink", { key: -19.9, weight: 700 }));
  // backend pool around the ring
  GATES.forEach((g, i) => {
    const [bx, by] = ringPt(g, R + 30, FZ);
    it.push(box(C, bx - 10, by - 8, FZ, 20, 16, 14, "hi", { key: 10 + by * 0.01, bevel: 0.5 }));
    it.push(box(C, bx - 11, by - 9, FZ + 14, 22, 18, 1.4, "teal", { key: 10.01 + by * 0.01 }));
    it.push(faceText(C, BACKENDS[i].name, [bx, by + 8, FZ + 9], "+y", 2.4, "ink", { key: 10.02 + by * 0.01, weight: 700 }));
    it.push(faceText(C, BACKENDS[i].ip, [bx, by + 8, FZ + 5.6], "+y", 1.9, "ink", { key: 10.02 + by * 0.01 }));
    // slide from the gate down to the backend
    const [gx, gy] = ringPt(g, R + 7, BZ);
    const [sx, sy] = ringPt(g, R + 17, FZ);
    it.push({ kind: "line", d: line3(C, [[gx, gy, BZ], [sx, sy, FZ + 4]]), tone: "mid", w: 3, layer: 0, key: 0 } as LineItem);
  });
  return sortItems(it);
}

type Bag = { flow: number; t0: number; target: number };

export function Carousel() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [down, setDown] = useState<number | null>(null);
  const S = useRef({ t: 0, next: 0, k: 0, bags: [] as Bag[], counts: [0, 0, 0], tour: 0, last: "" });
  const [, setTick] = useState(0);

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const healthy = [0, 1, 2].filter((i) => i !== down);
  const SPEED = 1.1; // radians per second around the ring

  const poke = useTour(() => { S.current.tour++; setDown(S.current.tour % 2 ? 1 : null); }, inView && !reduced, 7, 6);

  useLoop((_t, dt) => {
    const st = S.current;
    st.t += reduced ? 0 : dt;
    if (st.t >= st.next) {
      st.next = st.t + 0.55;
      const flow = st.k++ % FLOWS.length;
      const target = pickBackend(FLOWS[flow].src, healthy);
      st.bags.push({ flow, t0: st.t, target });
      st.last = `Flow ${FLOWS[flow].id} ${FLOWS[flow].src} → ${BACKENDS[target].name}`;
    }
    st.bags = st.bags.filter((b) => {
      const travel = GATES[b.target] - ENTRY_A;
      const tRing = travel / SPEED;
      if (st.t - b.t0 > tRing + 0.9) { st.counts[b.target]++; return false; }
      return true;
    });
    setTick((x) => (x + 1) % 1e6);
  }, inView);

  const st = S.current;
  const dyn: Item[] = [];
  for (const b of st.bags) {
    const age = st.t - b.t0;
    const travel = GATES[b.target] - ENTRY_A;
    const tRing = travel / SPEED;
    let p: V3;
    if (age < tRing) p = ringPt(ENTRY_A + age * SPEED, R, BZ);
    else {
      const u = Math.min(1, (age - tRing) / 0.9);
      const g = ringPt(GATES[b.target], R, BZ), bk = ringPt(GATES[b.target], R + 17, FZ + 4); // stops at the backend's door
      p = [lerp(g[0], bk[0], u), lerp(g[1], bk[1], u), lerp(g[2], bk[2], u)];
    }
    const fam = FLOWS[b.flow].fam;
    dyn.push(box(C, p[0] - 3, p[1] - 2.5, p[2], 6, 5, 4, fam, { key: 1 + p[1] * 0.001 + p[0] * 0.00001, bevel: 0.4, r: 0.8 }));
    dyn.push(box(C, p[0] - 1, p[1] - 0.6, p[2] + 4, 2, 1.2, 1.4, "lo", { key: 1.0001 + p[1] * 0.001 + p[0] * 0.00001 }));
  }
  // gate pushers and health-probe lamps
  GATES.forEach((g, i) => {
    const [gx, gy] = ringPt(g, R + 8, BZ);
    const ok = i !== down;
    dyn.push(box(C, gx - 2, gy - 2, BZ, 4, 4, 6, ok ? "teal" : "warn", { key: 0.5 + gy * 0.001, bevel: 0.3 }));
    const [bx, by] = ringPt(g, R + 30, FZ);
    dyn.push(cyl(C, bx + 7, by - 4, FZ + 15.4, 1.8, 1.6, ok ? "ok" : "warn", { key: 11 + by * 0.01, n: 12 }));
    dyn.push(faceText(C, ok ? `probe OK · ${st.counts[i]} bags` : "probe FAILED", [bx, by + 8, FZ + 2.4], "+y", 1.7, ok ? "ok" : "warn", { key: 11.01 + by * 0.01, weight: 700 }));
  });

  const say = down !== null
    ? <><b className="c-rose">{BACKENDS[down].name} failed its health probe</b> · new flows hash across the other two · {st.last}</>
    : <><b>Each flow sticks to one backend</b> · same 5-tuple, same hash, same gate · {st.last}</>;

  return (
    <div>
      <Card
        n={29}
        title="Hash carousel"
        hint="fail a backend · watch flows re-hash"
        readout={say}
        viewBox={vb}
        label="A baggage carousel stands for Azure Load Balancer. Bags (packets) from five flows drop onto the belt and are pushed off at the gate of the backend chosen by hashing the flow's 5-tuple, so every bag of a flow goes to the same backend. Health-probe lamps show each backend's state; a failed backend's gate closes and new flows hash across the rest."
        onKeyDown={() => poke()}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={sortItems(dyn)} />
      </Card>
      <div className="controls">
        {BACKENDS.map((b, i) => (
          <button key={b.name} className="pill-btn" onClick={() => { poke(); setDown(down === i ? null : i); }} style={{ borderColor: down === i ? "var(--warn)" : undefined }}>
            {down === i ? `Heal ${b.name}` : `Fail ${b.name}`}
          </button>
        ))}
      </div>
      <Legend items={[
        ...FLOWS.map((f) => ({ swatch: f.fam as string, text: `Flow ${f.id} ${f.src}` })),
        { swatch: "ok", text: "Health probe passing" },
      ]} />
      <p className="caption">
        An L4 load balancer never opens the bags: it sees addresses, ports and protocol only. It hashes those five values to pick a backend, so every packet of a connection lands on the same VM, and it stops sending new flows to any VM whose health probe fails.
      </p>
    </div>
  );
}
