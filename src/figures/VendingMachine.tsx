import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, cyl, ease, faceText, halo, lerp, line3, prism, rrect, sortItems, tube,
  type Fam, type Item, type LineItem, type Seg, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useReducedMotion, useTour } from "../iso/live";
import { splitSay, useScript } from "../iso/script";

const C = camera(24, 30);
const GZ = 3;
const VM: V3 = [26, 34, GZ];
const DOOR: V3 = [80, 46, GZ];
const SLOT: V3 = [172, 30, GZ];
const KIOSK: V3 = [58, 10, GZ];
const STRANGER: V3 = [196, 76, GZ];
type Mode = "public" | "se" | "pe";

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-8, -10, 232, 100, 5);
  it.push(halo(C, plan, 6));
  it.push(prism(C, plan, 0, GZ - 1, "lo", { key: -100, bevel: 0.6 }));
  // office (your VNet): floor, back and right walls with a door
  it.push(box(C, -6, -6, GZ - 1, 88, 84, 1, "mid", { key: -95 }));
  it.push(box(C, -6, -8, GZ, 88, 2, 34, "hi", { key: -90 }));
  it.push(box(C, 80, -8, GZ, 3, 50, 34, "hi", { key: 10 }));
  it.push(box(C, 80, 52, GZ, 3, 26, 34, "hi", { key: 11 }));
  it.push(box(C, 80, 42, GZ + 24, 3, 10, 10, "hi", { key: 10.5 }));
  it.push(faceText(C, "YOUR VNET · snet-app 10.0.1.0/24", [2, -6, GZ + 28], "+y", 2.8, "ink", { anchor: "start", key: -89, weight: 700 }));
  // VM desk
  it.push(box(C, VM[0] - 10, VM[1] - 7, GZ, 20, 14, 8, "sand", { key: -80, bevel: 0.3 }));
  it.push(box(C, VM[0] - 5, VM[1] - 6, GZ + 8, 10, 2, 7, "lo", { key: -79.9 }));
  it.push(faceText(C, "vm-app 10.0.1.4", [VM[0], VM[1] + 7, GZ + 4], "+y", 2, "ink", { key: -79.8, weight: 700 }));
  // street outside, then the plaza
  it.push(box(C, 83, -10, GZ - 1, 18, 100, 0.6, "lo", { key: -94 }));
  let dash = "";
  for (let y = -8; y < 88; y += 7) dash += line3(C, [[92, y, GZ - 0.3], [92, y + 3.5, GZ - 0.3]]);
  it.push({ kind: "line", d: dash, tone: "lit", w: 0.5, layer: 0, key: -93.9 } as LineItem);
  it.push(faceText(C, "PUBLIC INTERNET", [92, 84, GZ - 0.3], "top", 2.2, "sig", { key: -93.8, weight: 700 }));
  it.push(box(C, 101, -10, GZ - 1, 123, 100, 0.8, "sand", { key: -92 }));
  let tiles = "";
  for (let x = 110; x < 224; x += 10) tiles += line3(C, [[x, -10, GZ - 0.2], [x, 90, GZ - 0.2]]);
  for (let y = 0; y < 90; y += 10) tiles += line3(C, [[101, y, GZ - 0.2], [224, y, GZ - 0.2]]);
  it.push({ kind: "line", d: tiles, tone: "faint", w: 0.35, layer: 0, key: -91.9 } as LineItem);
  // the vending machine: Azure Storage, public endpoint
  it.push(box(C, SLOT[0] - 18, 6, GZ, 36, 18, 44, "blue", { key: 20, bevel: 0.6 }));
  it.push(box(C, SLOT[0] - 14, 24, GZ + 26, 28, 0.4, 14, "lo", { key: 20.1 }));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) it.push(box(C, SLOT[0] - 12 + c * 7, 24.4, GZ + 28 + r * 4, 5, 0.4, 3, (r + c) % 2 ? "teal" : "sand", { key: 20.2 }));
  it.push(faceText(C, "AZURE STORAGE", [SLOT[0], 24, GZ + 22], "+y", 2.6, "ink", { key: 20.3, weight: 700 }));
  it.push(faceText(C, "mystorage.blob.core.windows.net", [SLOT[0], 24, GZ + 19], "+y", 1.7, "ink", { key: 20.3 }));
  it.push(box(C, SLOT[0] - 6, 24, GZ + 8, 12, 0.6, 6, "lo", { key: 20.4 }));
  it.push(faceText(C, "PUBLIC SLOT", [SLOT[0], 24.6, GZ + 11], "+y", 1.6, "hi", { key: 20.5, weight: 700 }));
  // badge reader post (the storage firewall)
  it.push(box(C, SLOT[0] + 20, 24, GZ, 2, 2, 16, "hi", { key: 21 }));
  return sortItems(it);
}

function modeItems(mode: Mode, lamp: Fam, shutter: number): { inside: Item[]; outside: Item[] } {
  const it: Item[] = []; // on the plaza
  const ins: Item[] = []; // inside the office
  it.push(box(C, SLOT[0] + 18.5, 25.5, GZ + 15, 5, 1.4, 5, lamp, { key: 0, bevel: 0.3 }));
  it.push(faceText(C, mode === "public" ? "all networks" : mode === "se" ? "allow: snet-app" : "public: off", [SLOT[0] + 21, 27, GZ + 21.6], "+y", 1.6, "hi", { key: 0.1, weight: 700 }));
  if (mode === "se") {
    // painted VIP lane from the office door to the slot: the service-endpoint route
    const lane: V3[] = [[DOOR[0] + 3, DOOR[1], GZ - 0.2], [140, DOOR[1], GZ - 0.2], [SLOT[0], 34, GZ - 0.2]];
    it.push({ kind: "line", d: line3(C, lane), tone: "ok", w: 4, layer: 0, key: -1 } as LineItem);
    it.push(faceText(C, "service endpoint lane: Azure backbone, source = snet-app", [104, DOOR[1] + 6, GZ - 0.2], "top", 1.7, "ok", { anchor: "start", key: -0.9, weight: 700 }));
  }
  if (mode === "pe") {
    // private slot inside the office, fed by a Private Link pipe through the wall
    ins.push(...tube(C, [[SLOT[0] - 18, 10, GZ + 30], [SLOT[0] - 30, 10, GZ + 30], [86, 4, GZ + 30], [KIOSK[0] + 6, 4, GZ + 30], [KIOSK[0] + 6, 4, GZ + 16]], "violet", 5, 3.4));
    ins.push(box(C, KIOSK[0] - 7, KIOSK[1] - 5, GZ, 14, 10, 18, "violet", { key: 6, bevel: 0.5 }));
    ins.push(box(C, KIOSK[0] - 4, KIOSK[1] + 5, GZ + 7, 8, 0.4, 4, "lo", { key: 6.1 }));
    ins.push(faceText(C, "PRIVATE ENDPOINT", [KIOSK[0], KIOSK[1] + 5.4, GZ + 14.6], "+y", 1.5, "ink", { key: 6.2, weight: 700 }));
    ins.push(faceText(C, "10.0.1.5", [KIOSK[0], KIOSK[1] + 5.4, GZ + 12.4], "+y", 1.8, "ink", { key: 6.2, weight: 700 }));
  }
  // shutter over the public slot when public access is disabled
  if (shutter > 0.01) it.push(box(C, SLOT[0] - 6.5, 24.8, GZ + 14 - shutter * 6.5, 13, 0.6, shutter * 6.5, "warn", { key: 1 }));
  return { inside: ins, outside: it };
}

type Fr = { who: V3 | null; whoFam: Fam; lamp: Fam; say: string };

function script(mode: Mode, actor: "vm" | "stranger"): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  const F = (p: Partial<Fr>): Fr => ({ who: null, whoFam: "teal", lamp: "mid", say: "", ...p });
  const walk = (pts: V3[], fam: Fam, say: string, d: number, lamp: Fam = "mid") => {
    segs.push({ d, f: (u) => {
      const t = ease(u) * (pts.length - 1);
      const i = Math.min(pts.length - 2, Math.floor(t)), f = t - i;
      return F({ who: [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f), GZ], whoFam: fam, lamp, say });
    } });
  };
  const front: V3 = [SLOT[0], 34, GZ];
  if (actor === "vm") {
    if (mode === "pe") {
      walk([VM, [KIOSK[0], KIOSK[1] + 10, GZ]], "teal", "vm-app → mystorage · DNS returns 10.0.1.5, the private endpoint in its own subnet", 1.5);
      segs.push({ d: 1.6, f: () => F({ who: [KIOSK[0], KIOSK[1] + 10, GZ], whoFam: "ok", lamp: "warn", say: "Served through Private Link · traffic never leaves your network, no SNAT, no public IP involved" }) });
      return segs;
    }
    const via = mode === "se" ? "on the service-endpoint lane (Azure backbone)" : "out through NAT to the public endpoint";
    walk([VM, DOOR, [140, DOOR[1], GZ], front], "teal", `vm-app → mystorage's public IP · ${via}`, 2.2);
    const lamp: Fam = mode === "se" ? "ok" : "sig";
    segs.push({ d: 1.6, f: () => F({ who: front, whoFam: "ok", lamp, say: mode === "se" ? "Storage firewall sees source subnet snet-app · allowed by the VNet rule" : "Allowed · the storage account accepts all networks" }) });
    return segs;
  }
  walk([STRANGER, [SLOT[0] + 8, 40, GZ], front], "warn", "A stranger on the internet tries the same account", 1.6);
  const denied = mode !== "public";
  segs.push({ d: 1.6, f: () => F({ who: front, whoFam: denied ? "warn" : "sig", lamp: denied ? "warn" : "sig", say: mode === "public" ? "Allowed · anyone with the key can reach a public endpoint open to all networks" : mode === "se" ? "Denied · the firewall only admits snet-app's service endpoint" : "Denied · public network access is disabled; only the private endpoint works" }) });
  if (denied) walk([front, STRANGER], "warn", "Turned away", 1.2, "warn");
  return segs;
}

export function VendingMachine() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [mode, setMode] = useState<Mode>("pe");
  const [actor, setActor] = useState<"vm" | "stranger">("vm");
  const [run, setRun] = useState(0);
  const tour = useRef(0);

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const segs = useMemo(() => script(mode, actor), [mode, actor]);
  const fr = useScript(segs, `${run}-${mode}-${actor}`, inView, reduced, { who: null, whoFam: "teal", lamp: "mid", say: "" } as Fr);
  const poke = useTour(() => {
    const seq: [Mode, "vm" | "stranger"][] = [["public", "vm"], ["public", "stranger"], ["se", "vm"], ["se", "stranger"], ["pe", "vm"], ["pe", "stranger"]];
    const [m, a] = seq[++tour.current % seq.length];
    setMode(m); setActor(a); setRun((r) => r + 1);
  }, inView && !reduced, 5, 6);

  const dyn = useMemo(() => {
    const { inside, outside } = modeItems(mode, fr.lamp, mode === "pe" ? 1 : 0);
    if (fr.who) {
      const [x, y] = fr.who;
      const person = [cyl(C, x, y, GZ, 3, 7, fr.whoFam, { key: 30 + y * 0.01, n: 16 }), cyl(C, x, y, GZ + 7, 2.4, 3, "hi", { key: 30.001 + y * 0.01, n: 14 })];
      (x < 82 ? inside : outside).push(...person);
    }
    return { inside: sortItems(inside), outside: sortItems(outside) };
  }, [mode, fr]);
  const { head, rest } = splitSay(fr.say);

  return (
    <div>
      <Card
        n={32}
        title="Storage vending machine"
        hint="pick an access mode and who's asking"
        readout={<><b>{head}</b>{rest.map((s, i) => <span key={i}> · {s}</span>)}</>}
        viewBox={vb}
        label="Your VNet is an office beside a street; across it, Azure Storage is a vending machine on a public plaza with a public slot and a firewall badge reader. With a service endpoint, your subnet's traffic takes a marked backbone lane to the public slot and the firewall admits only your subnet. With a private endpoint, a private slot with address 10.0.1.5 stands inside your office, fed by a Private Link pipe, and the public slot can be shuttered."
        onKeyDown={() => poke()}
        svgRef={svgRef}
      >
        <Items items={stat.filter((i) => i.key < 10)} />
        <Items items={dyn.inside} />
        <Items items={stat.filter((i) => i.key >= 10)} />
        <Items items={dyn.outside} />
      </Card>
      <div className="controls">
        <div className="seg">
          <button className={mode === "public" ? "on" : ""} onClick={() => { poke(); setMode("public"); setRun((r) => r + 1); }}>Public endpoint</button>
          <button className={mode === "se" ? "on" : ""} onClick={() => { poke(); setMode("se"); setRun((r) => r + 1); }}>Service endpoint</button>
          <button className={mode === "pe" ? "on" : ""} onClick={() => { poke(); setMode("pe"); setRun((r) => r + 1); }}>Private endpoint</button>
        </div>
        <div className="seg">
          <button className={actor === "vm" ? "on" : ""} onClick={() => { poke(); setActor("vm"); setRun((r) => r + 1); }}>vm-app asks</button>
          <button className={actor === "stranger" ? "on" : ""} onClick={() => { poke(); setActor("stranger"); setRun((r) => r + 1); }}>stranger asks</button>
        </div>
      </div>
      <div className="table-wrap">
        <table style={{ fontSize: 13.5 }}>
          <thead><tr><th></th><th>Service endpoint</th><th>Private endpoint</th></tr></thead>
          <tbody>
            <tr><td>Destination IP</td><td>The service's public IP</td><td>A private IP in your subnet (10.0.1.5)</td></tr>
            <tr><td>Path</td><td>Azure backbone, optimised route</td><td>Private Link, entirely private</td></tr>
            <tr><td>Locks the service to</td><td>Selected subnets (VNet rules)</td><td>Your endpoints; public access can be off</td></tr>
            <tr><td>Works from on-prem / peered VNets</td><td>No</td><td>Yes</td></tr>
            <tr><td>DNS changes</td><td>None</td><td>Needs a privatelink private DNS zone</td></tr>
            <tr><td>Cost</td><td>Free</td><td>Per endpoint + per GB</td></tr>
          </tbody>
        </table>
      </div>
      <Legend items={[
        { swatch: "blue", text: "Azure Storage (public endpoint)" },
        { swatch: "ok", text: "Service-endpoint lane" },
        { swatch: "violet", text: "Private endpoint + Private Link" },
        { swatch: "warn", text: "Denied / public access off" },
      ]} />
    </div>
  );
}
