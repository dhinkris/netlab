import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, ease, faceText, halo, line3, prism, rrect, sortItems,
  type Fam, type Item, type LineItem,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { follow, useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { CANDIDATES, cidrOf, describe, overlaps, size, SUBNETS, VNET, type SubnetDef } from "../models/vnet";

const C = camera(12, 16);
const FH = 16; // floor height
const D = 34; // building depth
const GZ = 3;
const fz = (floor: number) => GZ + floor * FH;

function shell(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-34, -8, 330, D + 20, 3);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, GZ, "lo", { key: -100 }));
  // back wall, side walls, floor slabs, cut faces hatched
  it.push(box(C, -2, -3, GZ, 260, 3, FH * 4 + 2, "hi", { key: -90 }));
  for (const x of [-4, 256]) it.push(box(C, x, -3, GZ, 4, D + 3, FH * 4 + 2, "sand", { key: -89 + x * 0.001, bevel: 0.3 }));
  for (let f = 0; f <= 4; f++) {
    it.push(box(C, -4, 0, fz(f) - 1.4, 264, D, 1.4, "sand", { key: -80 + f, bevel: 0.2 }));
    let hatch = "";
    for (let x = -3; x < 259; x += 3) hatch += line3(C, [[x, D, fz(f) - 1.3], [x + 1.6, D, fz(f) - 0.1]]);
    it.push({ kind: "line", d: hatch, tone: "lo", w: 0.35, layer: 0, key: -79.9 + f } as LineItem);
    if (f < 4) {
      it.push(faceText(C, `10.0.${f}.x`, [-8, D, fz(f) + FH / 2], "+y", 3, "hi", { anchor: "end", key: -79.8, weight: 700 }));
      // address ruler along the floor's front edge: one tick per 16 addresses
      let ticks = "";
      for (let a = 0; a <= 256; a += 16) ticks += line3(C, [[a, D, fz(f) - 1.4], [a, D, fz(f) - 1.4 - (a % 64 ? 1 : 2)]]);
      it.push({ kind: "line", d: ticks, tone: "mid", w: 0.4, layer: 0, key: -79.7 } as LineItem);
    }
  }
  // roof sign and "more floors" note
  it.push(box(C, 60, 4, fz(4), 140, 2, 10, "blue", { key: -70, bevel: 0.3 }));
  it.push(faceText(C, `VNET ${VNET}`, [130, 6, fz(4) + 6.6], "+y", 4, "ink", { key: -69, weight: 700 }));
  it.push(faceText(C, "65,536 addresses = 256 floors like these · 4 shown", [130, 6, fz(4) + 2.6], "+y", 2.2, "ink", { key: -69 }));
  return sortItems(it);
}

function roomItems(s: SubnetDef, sel: boolean, grow = 1, bad = false): Item[] {
  const it: Item[] = [];
  const n = size(s);
  const x0 = s.start, w = n * grow;
  const z = fz(s.floor);
  const fam: Fam = bad ? "warn" : s.fam;
  const k = s.floor * 10 + s.start * 0.001;
  // floor inlay and partition walls
  it.push(box(C, x0 + 0.4, 1, z, Math.max(0.5, w - 0.8), D - 2, 0.4, sel ? fam : "mid", { key: k }));
  for (const x of [x0, x0 + w]) it.push(box(C, x - 0.4, 0, z, 0.8, D - 4, FH - 2, "hi", { key: k + 0.1 + x * 0.00001 }));
  if (grow < 1) return it;
  // reserved addresses: 4 at the start, 1 at the end
  for (const a of [0, 1, 2, 3, n - 1]) it.push(box(C, x0 + a + 0.1, 2, z + 0.4, 0.8, 6, 7, "warn", { key: k + 0.2 }));
  // VM desks, starting just after the reserved lockers (spaced out for visibility)
  (s.vms ?? []).forEach((a) => {
    it.push(box(C, x0 + a * 4 + 6, 12, z + 0.4, 6, 8, 4, "hi", { key: k + 0.3 }));
    it.push(box(C, x0 + a * 4 + 7, 14, z + 4.4, 4, 1, 3, fam, { key: k + 0.31 }));
  });
  // name plate on the header beam along the room's front edge, just under the slab above
  const label = n >= 64 ? s.name : s.name.replace("Subnet", "");
  const bz = z + FH - 1.4 - 5;
  it.push(box(C, x0 + 0.8, D - 0.8, bz, w - 1.6, 0.8, 5, fam, { key: k + 0.4 }));
  it.push(faceText(C, `${label}  ${cidrOf(s)}`, [x0 + 2.4, D, bz + 3.3], "+y", n >= 64 ? 2.1 : 1.35, "ink", { anchor: "start", key: k + 0.5, weight: 700 }));
  it.push(faceText(C, `${n} addresses · ${n - 5} usable`, [x0 + 2.4, D, bz + 1.2], "+y", n >= 64 ? 1.6 : 1.1, "ink", { anchor: "start", key: k + 0.5 }));
  return it;
}

export function VnetBuilding() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [sel, setSel] = useState("snet-data");
  const [added, setAdded] = useState<SubnetDef[]>([]);
  const [attempt, setAttempt] = useState<{ s: SubnetDef; ok: boolean; at: number } | null>(null);
  const grow = useRef(1);
  const [, setTick] = useState(0);
  const tour = useRef(0);

  const base = useMemo(() => shell(), []);
  const vb = useMemo(() => { const b = boundsOf(base, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [base]);
  const all = [...SUBNETS, ...added];

  const tryAdd = (c: SubnetDef) => {
    const clash = all.find((s) => s !== c && overlaps(s, c));
    if (clash) { setAttempt({ s: c, ok: false, at: performance.now() }); return; }
    if (!added.includes(c)) { setAdded((a) => [...a, c]); grow.current = 0; }
    setSel(c.name);
    setAttempt({ s: c, ok: true, at: performance.now() });
  };

  const poke = useTour(() => {
    const seq = ["snet-web", "GatewaySubnet", "snet-data", "add-bad", "add-pe", "reset"];
    const step = seq[++tour.current % seq.length];
    if (step === "add-bad") tryAdd(CANDIDATES[1]);
    else if (step === "add-pe") tryAdd(CANDIDATES[0]);
    else if (step === "reset") { setAdded([]); setAttempt(null); setSel("snet-web"); }
    else { setSel(step); setAttempt(null); }
  }, inView && !reduced, 3.6, 6);

  useLoop((_t, dt) => {
    const before = grow.current;
    grow.current = reduced ? 1 : follow(grow.current, 1, dt, 0.25);
    if (Math.abs(grow.current - 1) < 0.005) grow.current = 1;
    if (before !== grow.current || (attempt && performance.now() - attempt.at < 1600)) setTick((k) => (k + 1) % 1e6);
  }, inView);

  const rooms = sortItems(all.flatMap((s) => roomItems(s, s.name === sel, added.includes(s) && s === added[added.length - 1] ? ease(grow.current) : 1)));
  const ghost = attempt && !attempt.ok && performance.now() - attempt.at < 1600 ? roomItems(attempt.s, true, 1, true).slice(0, 3) : [];
  const cur = all.find((s) => s.name === sel)!;
  const d = describe(cur);
  const readout = attempt && !attempt.ok && performance.now() - attempt.at < 1600
    ? <><b className="c-rose">Can't add {cidrOf(attempt.s)}</b> · it overlaps {all.find((s) => overlaps(s, attempt.s))!.name}</>
    : <><b>{cur.name}</b> · {d.cidr} · {d.total} addresses · {d.usable} usable · first VM {d.firstVm}</>;

  return (
    <div>
      <Card
        n={22}
        title="Address building"
        hint="pick a subnet · add one to floor 3"
        readout={readout}
        viewBox={vb}
        label="A building cut open from the front. The VNet's address space is the building; each floor is one /24 of 256 addresses, drawn one unit per address; subnets are rooms sized to their CIDR block, each with four reserved red lockers at the start and one at the end."
        onKeyDown={() => poke()}
        svgRef={svgRef}
      >
        <Items items={base} />
        <Items items={rooms} />
        <Items items={ghost} />
      </Card>
      <div className="controls">
        <div className="seg">
          {all.map((s) => <button key={s.name} className={sel === s.name ? "on" : ""} onClick={() => { poke(); setSel(s.name); setAttempt(null); }}>{s.name}</button>)}
        </div>
        {CANDIDATES.map((c) => (
          <button key={c.name} className="pill-btn" onClick={() => { poke(); tryAdd(c); }}>+ {cidrOf(c)}</button>
        ))}
        {added.length > 0 && <button className="pill-btn" onClick={() => { poke(); setAdded([]); setAttempt(null); setSel("snet-web"); }}>Reset</button>}
      </div>
      <p className="mono" style={{ fontSize: 12.5, margin: "10px 2px 0", color: "var(--muted)" }}>reserved in {cur.name}: {d.reserved}</p>
      <Legend items={[
        { swatch: "warn", text: "5 addresses Azure reserves per subnet" },
        { swatch: "sig", text: "GatewaySubnet" }, { swatch: "moss", text: "AzureBastionSubnet" }, { swatch: "rose", text: "AzureFirewallSubnet" },
        { swatch: "blue", text: "Workload subnets" },
      ]} />
      <p className="caption">
        Widths are to scale: one unit per address, so a /26 really is a quarter of a floor. Subnets can't overlap, and each one gives up five addresses to the platform no matter its size, which is why tiny subnets waste the most.
      </p>
    </div>
  );
}
