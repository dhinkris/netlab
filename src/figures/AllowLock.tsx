import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, ease, faceText, halo, lerp, line3, prism, rrect, sortItems,
  type Fam, type Item, type LineItem, type Seg,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useReducedMotion, useTour } from "../iso/live";
import { splitSay, useScript } from "../iso/script";

const C = camera(14, 20);
const FZ = 2;
const LOCK = { x0: 128, x1: 184, z0: 26, z1: 64 };
const PLUG_Z = 34, SHEAR = 46; // keyway floor and shear line
const PIN_X = [138, 146, 154, 162, 170];
const LOCK_PINS = [5, 3, 6, 2, 4]; // key-pin lengths: the lock's combination
const KEY_IN = 128; // blade tip at the back of the plug when fully inserted
const ALLOW = "203.0.113.48/30";

type Scenario = { id: string; label: string; keys: { ip: string; ok: boolean }[]; why: string };
const SCENARIOS: Scenario[] = [
  { id: "default", label: "Default outbound", keys: [{ ip: "20.62.18.41", ok: false }, { ip: "52.168.7.230", ok: false }], why: "an Azure-owned IP the partner never heard of, and it can change" },
  { id: "pip", label: "Public IP per VM, after scale-out", keys: [{ ip: "203.0.113.50", ok: true }, { ip: "203.0.113.77", ok: false }], why: "the new VM's IP was never added to the partner's list" },
  { id: "natgw", label: "NAT Gateway, static IP", keys: [{ ip: "203.0.113.50", ok: true }, { ip: "203.0.113.50", ok: true }], why: "every VM leaves as the same, registered IP" },
  { id: "prefix", label: "NAT Gateway + IP prefix /30", keys: [{ ip: "203.0.113.48", ok: true }, { ip: "203.0.113.51", ok: true }], why: "any address in the registered prefix fits, so you can grow without paperwork" },
];

/** Key cut depths: a fitting key lifts each key pin exactly to the shear line. */
function cutsFor(ip: string, ok: boolean): number[] {
  if (ok) return LOCK_PINS.map((L) => SHEAR - PLUG_Z - 1 - L);
  const h = ip.split(".").reduce((a, o) => a * 31 + Number(o), 7);
  return LOCK_PINS.map((L, i) => { const right = SHEAR - PLUG_Z - 1 - L; const off = ((h >> (i * 3)) % 5) - 2; return Math.max(1, Math.min(10, right + (off === 0 ? 3 : off * 2))); });
}

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-6, -10, 236, 40, 3);
  it.push(halo(C, plan, 5));
  it.push(prism(C, plan, 0, FZ, "mid", { key: -100 }));
  // partner's wall and door frame
  it.push(box(C, 118, -8, FZ, 112, 8, 96, "hi", { key: -90 }));
  it.push(box(C, 192, -1, FZ, 2, 2, 74, "sand", { key: -89 }));
  it.push(box(C, 226, -1, FZ, 2, 2, 74, "sand", { key: -89 }));
  it.push(box(C, 192, -1, FZ + 74, 36, 2, 3, "sand", { key: -89 }));
  it.push(box(C, 194, -1.5, FZ, 32, 0.5, 74, "lo", { key: -88.9 }));
  it.push(faceText(C, "PARTNER API", [210, 1, FZ + 88], "+y", 3.4, "ink", { key: -88.8, weight: 700 }));
  it.push(faceText(C, `allow-list: ${ALLOW}`, [210, 1, FZ + 83], "+y", 2.4, "sig", { key: -88.8, weight: 700 }));
  // lock body with its front cut away to show the pins
  it.push(box(C, LOCK.x0, 0, LOCK.z0, LOCK.x1 - LOCK.x0, 12, LOCK.z1 - LOCK.z0, "sand", { key: -80, bevel: 0.5 }));
  it.push(box(C, LOCK.x0 + 3, 12, LOCK.z0 + 3, LOCK.x1 - LOCK.x0 - 6, 0.3, LOCK.z1 - LOCK.z0 - 6, "lo", { key: -79.9 }));
  // plug (the part that turns) and its keyway
  it.push(box(C, LOCK.x0 + 3, 12.3, PLUG_Z - 6, LOCK.x1 - LOCK.x0 - 6, 0.3, SHEAR - PLUG_Z + 6, "mid", { key: -79.8 }));
  it.push(box(C, LOCK.x0 + 3, 12.6, PLUG_Z - 2, LOCK.x1 - LOCK.x0 - 6, 0.2, 4, "lo", { key: -79.7 }));
  // pin chambers
  PIN_X.forEach((x) => it.push(box(C, x - 2.4, 12.3, SHEAR - 10, 4.8, 0.3, LOCK.z1 - 3 - (SHEAR - 10), "lo", { key: -79.6 })));
  it.push({ kind: "line", d: line3(C, [[LOCK.x0 + 3, 13, SHEAR], [LOCK.x1 - 3, 13, SHEAR]]), tone: "warn", w: 0.5, layer: 0, key: -79.5, dash: "1.5 1.5" } as LineItem);
  it.push(faceText(C, "shear line", [LOCK.x1 - 4, 13, SHEAR + 1.6], "+y", 1.6, "warn", { anchor: "end", key: -79.4, weight: 700 }));
  // key rack on the left
  it.push(box(C, 2, -6, FZ, 60, 4, 60, "hi", { key: -70 }));
  it.push(faceText(C, "YOUR EGRESS IPs", [32, -2, FZ + 53], "+y", 2.6, "ink", { key: -69.9, weight: 700 }));
  // keys hanging on the rack, one per address in the NAT Gateway's prefix
  ["203.0.113.48", "203.0.113.49", "203.0.113.50", "203.0.113.51"].forEach((ip, k) => {
    const z = FZ + 44 - k * 10;
    it.push(box(C, 8, -2, z, 10, 1.2, 6, "sig", { key: -69.8, bevel: 0.3, r: 1.5 }));
    it.push(box(C, 18, -2, z + 2.2, 14, 1.2, 1.6, "sig", { key: -69.8 }));
    it.push(faceText(C, ip, [34, -0.8, z + 3], "+y", 2.2, "ink", { anchor: "start", key: -69.7, weight: 700 }));
  });
  it.push(faceText(C, "NAT Gateway prefix /30", [32, -2, FZ + 6], "+y", 2, "sig", { key: -69.7, weight: 700 }));
  return sortItems(it);
}

type Fr = { keyX: number; cuts: number[]; ip: string; ok: boolean; inserted: number; door: number; lamp: Fam; say: string };

function script(sc: Scenario): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  const START = 20;
  sc.keys.forEach((k, n) => {
    const cuts = cutsFor(k.ip, k.ok);
    const F = (p: Partial<Fr>): Fr => ({ keyX: START, cuts, ip: k.ip, ok: k.ok, inserted: 0, door: 0, lamp: "mid", say: "", ...p });
    const who = sc.id === "pip" ? (n === 0 ? "vm-1" : "vm-3 (new)") : `request ${n + 1}`;
    segs.push({ d: 1.4, f: (u) => F({ keyX: lerp(START, KEY_IN, ease(u)), inserted: ease(u), say: `${who} arrives from ${k.ip}` }) });
    if (k.ok) {
      segs.push({ d: 0.6, f: () => F({ keyX: KEY_IN, inserted: 1, lamp: "ok", say: `${k.ip} is in ${ALLOW} · every pin sits on the shear line` }) });
      segs.push({ d: 1.0, f: (u) => F({ keyX: KEY_IN, inserted: 1, lamp: "ok", door: ease(u), say: `Unlocked · ${sc.why}` }) });
      segs.push({ d: 0.8, f: (u) => F({ keyX: KEY_IN, inserted: 1, lamp: "ok", door: 1 - ease(u), say: `Unlocked · ${sc.why}` }) });
    } else {
      segs.push({ d: 1.2, f: () => F({ keyX: KEY_IN, inserted: 1, lamp: "warn", say: `${k.ip} isn't on the list · pins straddle the shear line, the plug can't turn` }) });
      segs.push({ d: 0.6, f: (u) => F({ keyX: lerp(KEY_IN, START, ease(u)), inserted: 1 - ease(u), lamp: "warn", say: `Refused · ${sc.why}` }) });
    }
    segs.push({ d: 0.4, f: () => F({ keyX: START, say: `${k.ok ? "Allowed" : "Refused"} · ${sc.why}` }) });
  });
  return segs;
}

function liveItems(fr: Fr): Item[] {
  const it: Item[] = [];
  // pins: key pin rides on the key's cut, driver pin stacks on top, spring above
  PIN_X.forEach((x, i) => {
    const lift = fr.inserted * fr.cuts[i];
    const kz = PLUG_Z + 1 + lift;
    it.push(box(C, x - 1.6, 12.6, kz, 3.2, 0.6, LOCK_PINS[i], "hi", { key: i, r: 0.3 }));
    const dz = kz + LOCK_PINS[i];
    it.push(box(C, x - 1.6, 12.6, dz, 3.2, 0.6, 6, "blue", { key: i + 0.1, r: 0.3 }));
    const top = LOCK.z1 - 4, n = 6, pts: [number, number, number][] = [];
    for (let k = 0; k <= n * 2; k++) pts.push([x + (k % 2 ? 1.4 : -1.4), 13, lerp(dz + 6, top, k / (n * 2))]);
    it.push({ kind: "line", d: line3(C, pts), tone: "mid", w: 0.5, layer: 0, key: i + 0.2 } as LineItem);
  });
  // the key: bow with an IP tag, blade with five cuts
  const tip = fr.keyX;
  const bladeL = PIN_X[4] - PIN_X[0] + 14;
  it.push(box(C, tip - bladeL - 20, 2, PLUG_Z - 6, 20, 8, 16, "sig", { key: 10, bevel: 0.6, r: 3 }));
  it.push(faceText(C, fr.ip, [tip - bladeL - 10, 10, PLUG_Z + 4], "+y", 1.9, "ink", { key: 10.1, weight: 700 }));
  it.push(box(C, tip - bladeL, 5, PLUG_Z - 1.6, bladeL, 3, 1.6, "sig", { key: 10.2 }));
  PIN_X.forEach((px, i) => {
    const x = tip - (KEY_IN - px);
    it.push(box(C, x - 2.5, 5, PLUG_Z, 5, 3, Math.max(0.4, fr.cuts[i]), "sig", { key: 10.3 + i * 0.01, bevel: 0.2 }));
  });
  // status lamp and the sliding door
  it.push(box(C, LOCK.x0 + 24, 12, LOCK.z1 + 1, 8, 2, 4, fr.lamp, { key: 11, bevel: 0.3 }));
  it.push(box(C, 195 + fr.door * 28, -1, FZ, 30, 1.4, 72, "sand", { key: 12, bevel: 0.4 }));
  it.push(box(C, 198 + fr.door * 28, 0.4, FZ + 34, 3, 1, 6, "lo", { key: 12.1 }));
  return it;
}

export function AllowLock() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [si, setSi] = useState(0);
  const [run, setRun] = useState(0);
  const tour = useRef(0);
  const sc = SCENARIOS[si];

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const segs = useMemo(() => script(sc), [sc]);
  const fr = useScript(segs, `${run}-${si}`, inView, reduced, { keyX: 20, cuts: [3, 3, 3, 3, 3], ip: "", ok: false, inserted: 0, door: 0, lamp: "mid", say: "" } as Fr);
  const go = (i: number) => { setSi(i); setRun((r) => r + 1); };
  const poke = useTour(() => go(++tour.current % SCENARIOS.length), inView && !reduced, 8.5, 6);
  const dyn = useMemo(() => liveItems(fr), [fr]);
  const { head, rest } = splitSay(fr.say);

  return (
    <div>
      <Card
        n={28}
        title="Allow-list lock"
        hint="pick an outbound setup"
        readout={<><b className={fr.lamp === "ok" ? "c-teal" : fr.lamp === "warn" ? "c-rose" : undefined}>{head}</b>{rest.map((s, i) => <span key={i}> · {s}</span>)}</>}
        viewBox={vb}
        label="A partner's door with a pin-tumbler lock cut away to show its pins. Each outbound request carries a key cut from its source public IP. Keys from the allow-listed prefix lift every pin exactly to the shear line and the door opens; keys from unknown or changing IPs leave pins across the line and are refused."
        onKeyDown={() => poke()}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={sortItems(dyn)} />
      </Card>
      <div className="controls">
        <div className="seg">
          {SCENARIOS.map((s, i) => <button key={s.id} className={si === i ? "on" : ""} onClick={() => { poke(); go(i); }}>{s.label}</button>)}
        </div>
      </div>
      <Legend items={[
        { swatch: "sig", text: "Key = your source public IP" },
        { swatch: "hi", text: "Key pins (lifted by the key's cuts)" },
        { swatch: "blue", text: "Driver pins" },
        { swatch: "warn", text: "Shear line: all gaps must sit on it" },
        { swatch: "ok", text: "Allowed" },
      ]} />
      <p className="caption">
        Partners who allow-list your traffic are cutting their lock to your keys. Give them addresses you control and that never change, ideally a whole prefix, so adding VMs or another NAT Gateway IP never needs a change on their side.
      </p>
    </div>
  );
}
