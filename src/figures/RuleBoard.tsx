import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, dotsItem, ease, faceText, halo, lerp, prism, rrect, sortItems,
  type Fam, type Item, type Seg, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useReducedMotion, useTour } from "../iso/live";
import { useScript, splitSay } from "../iso/script";
import { evaluate, PORTS, PRESETS, RULES, SOURCES, type Src } from "../models/nsg";

const C = camera(12, 14);
const FY = 1; // play-field face (y)
const ROW_Z = (k: number) => 160 - k * 22;
const DROP_X = 140;
const ALLOW_X = 204, DENY_X = 76;
const BIN_Z = 6;

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-6, -10, 228, 26, 3);
  it.push(halo(C, plan, 5));
  it.push(prism(C, plan, 0, 4, "lo", { key: -100 }));
  // the board: back panel, wooden frame, title
  it.push(box(C, 0, -6, 4, 216, 6, 178, "hi", { key: -90 }));
  for (const [x, w] of [[0, 4], [212, 4]] as const) it.push(box(C, x, -6, 4, w, 9, 178, "sand", { key: -89, bevel: 0.4 }));
  it.push(box(C, 0, -6, 178, 216, 9, 6, "sand", { key: -88, bevel: 0.4 }));
  it.push(faceText(C, "NSG · snet-web · INBOUND", [108, 3, 181], "+y", 3.6, "ink", { key: -87, weight: 700 }));
  it.push(box(C, 64, -6, 4, 2, 7, 174, "sand", { key: -86 }));
  // pegs between the rows
  const pegs: V3[] = [];
  for (let k = 0; k < RULES.length; k++) for (let i = 0; i < 9; i++) {
    const x = 82 + i * 14 + (k % 2) * 7, z = ROW_Z(k) - 11;
    if (Math.abs(x - DROP_X) > 8) pegs.push([x, FY, z]);
  }
  it.push({ ...dotsItem(C, pegs, 0.9, "mid", 0, true), key: -80 });
  // rule rows: plaque on the left, shelf halves either side of the drop gap
  RULES.forEach((r, k) => {
    const z = ROW_Z(k);
    const fam: Fam = r.allow ? "ok" : "warn";
    it.push(box(C, 6, 0, z - 9, 56, 1, 12, r.builtin ? "mid" : "sand", { key: -70 + k * 0.01, bevel: 0.3 }));
    it.push(box(C, 6, 1, z - 9, 3, 0.4, 12, fam, { key: -69.9 + k * 0.01 }));
    it.push(faceText(C, String(r.prio), [11, 1.2, z - 0.5], "+y", 3.2, r.builtin ? "hi" : "ink", { anchor: "start", key: -69.8, weight: 700 }));
    it.push(faceText(C, r.name.length > 22 ? r.name.slice(0, 21) + "…" : r.name, [11, 1.2, z - 4.4], "+y", 2.1, r.builtin ? "hi" : "ink", { anchor: "start", key: -69.8, weight: 600 }));
    it.push(faceText(C, `${r.src} → ${r.port} · ${r.allow ? "ALLOW" : "DENY"}`, [11, 1.2, z - 7.6], "+y", 1.8, fam, { anchor: "start", key: -69.8, weight: 700 }));
    it.push(box(C, 70, 0, z - 2, DROP_X - 8 - 70, 7, 2, "sand", { key: -60 + k * 0.01 }));
    it.push(box(C, DROP_X + 8, 0, z - 2, 206 - DROP_X - 8, 7, 2, "sand", { key: -60 + k * 0.01 }));
  });
  // side chutes and bins
  for (const [x, fam] of [[DENY_X, "warn"], [ALLOW_X, "ok"]] as const) {
    it.push(box(C, x - 4, 0, BIN_Z + 14, 1, 7, 150, "mid", { key: -50 }));
    it.push(box(C, x + 4, 0, BIN_Z + 14, 1, 7, 150, "mid", { key: -50 }));
    it.push(box(C, x - 12, 0, 4, 24, 12, 14, fam, { key: 50, bevel: 0.5 }));
    it.push(faceText(C, fam === "ok" ? "ALLOW" : "DENY", [x, 12, 14], "+y", 3.4, "ink", { key: 50.1, weight: 700 }));
  }
  return sortItems(it);
}

// ---------- script ----------

type Fr = { ball: V3 | null; ballFam: Fam; row: number; flip: number; dir: number; checked: number; say: string };

function script(src: Src, port: number): Seg<Fr>[] {
  const { index, rule } = evaluate(src, port);
  const segs: Seg<Fr>[] = [];
  const F = (p: Partial<Fr>): Fr => ({ ball: null, ballFam: "sig", row: -1, flip: 0, dir: 0, checked: -1, say: "", ...p });
  const top: V3 = [DROP_X, FY + 3, 176];
  let z = top[2];
  segs.push({ d: 0.4, f: () => F({ ball: top, say: `Packet: ${src.label} ${src.ip} → snet-web : ${port}` }) });
  for (let k = 0; k <= index; k++) {
    const z0 = z, z1 = ROW_Z(k) + 3;
    segs.push({ d: 0.35, f: (u) => F({ ball: [DROP_X, FY + 3, lerp(z0, z1, u * u)], checked: k - 1, say: `Checking rule ${RULES[k].prio}` }) });
    z = z1;
    if (k < index) segs.push({ d: 0.3, f: () => F({ ball: [DROP_X, FY + 3, z1], row: k, checked: k, say: `${RULES[k].prio} ${RULES[k].name} · doesn't match · fall through` }) });
  }
  const dir = rule.allow ? 1 : -1;
  const zr = ROW_Z(index) + 3;
  const sideX = rule.allow ? ALLOW_X : DENY_X;
  const fam: Fam = rule.allow ? "ok" : "warn";
  const head = `${rule.prio} ${rule.name} matches · ${rule.allow ? "ALLOW" : "DENY"}`;
  segs.push({ d: 0.5, f: (u) => F({ ball: [DROP_X, FY + 3, zr], ballFam: fam, row: index, checked: index, flip: ease(u), dir, say: head }) });
  segs.push({ d: 0.8, f: (u) => F({ ball: [lerp(DROP_X, sideX, ease(u)), FY + 3, zr], ballFam: fam, row: index, checked: index, flip: 1, dir, say: `${head} · first match wins, the rest are never read` }) });
  segs.push({ d: 0.9, f: (u) => F({ ball: [sideX, FY + 3, lerp(zr, BIN_Z + 18, u * u)], ballFam: fam, row: index, checked: index, flip: 1, dir, say: `${head} · first match wins, the rest are never read` }) });
  const note = rule.builtin && rule.allow && rule.name === "AllowVnetInBound" ? " · default rule: anything in the VNet gets in unless you deny it higher up" : rule.builtin && !rule.allow ? " · nothing above matched, so the final default deny caught it" : "";
  segs.push({ d: 1.6, f: () => F({ ball: [sideX, FY + 3, BIN_Z + 18], ballFam: fam, row: index, checked: index, flip: 1, dir, say: `${head}${note}` }) });
  return segs;
}

// ---------- live parts ----------

function rowItems(fr: Fr): Item[] {
  const it: Item[] = [];
  RULES.forEach((r, k) => {
    const z = ROW_Z(k);
    const lit = k === fr.row && fr.flip > 0 ? (r.allow ? "ok" : "warn") : k <= fr.checked ? "mid" : "lo";
    it.push(box(C, 60, 0, z - 6, 3, 1.4, 3, lit as Fam, { key: k, bevel: 0.2 }));
    // flipper at the drop gap: upright until its rule matches, then it tilts toward its chute
    const tilt = k === fr.row ? fr.flip * fr.dir : 0;
    it.push(box(C, DROP_X - 0.8, 0, z - 2, 1.6, 7, 9, k === fr.row && fr.flip > 0 ? (r.allow ? "ok" : "warn") : "sig", { key: k + 0.1, shift: [tilt * 7, 0] }));
  });
  return it;
}

export function RuleBoard() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [srcId, setSrcId] = useState("inet");
  const [port, setPort] = useState(443);
  const [run, setRun] = useState(0);
  const tour = useRef(0);
  const src = SOURCES.find((s) => s.id === srcId)!;

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const segs = useMemo(() => script(src, port), [src, port]);
  const fr = useScript(segs, `${run}-${srcId}-${port}`, inView, reduced, { ball: null, ballFam: "sig" as Fam, row: -1, flip: 0, dir: 0, checked: -1, say: "" });

  const drop = (s: string, p: number) => { setSrcId(s); setPort(p); setRun((r) => r + 1); };
  const poke = useTour(() => { const pr = PRESETS[++tour.current % PRESETS.length]; drop(pr.src, pr.port); }, inView && !reduced, 7.5, 6);

  const dyn = useMemo(() => ({
    rows: rowItems(fr),
    ball: fr.ball ? [{ ...dotsItem(C, [fr.ball], 3.4, fr.ballFam === "sig" ? "sig" : fr.ballFam, 0, false), key: 0 }] : [],
  }), [fr]);
  const { head, rest } = splitSay(fr.say);
  const onKey = (e: React.KeyboardEvent) => {
    poke();
    const k = Number(e.key);
    if (k >= 1 && k <= PRESETS.length) drop(PRESETS[k - 1].src, PRESETS[k - 1].port);
  };

  return (
    <div>
      <Card
        n={18}
        title="Rule board"
        hint="1–6 presets · or pick source and port"
        readout={<><b>{head}</b>{rest.map((s, i) => <span key={i}> · {s}</span>)}</>}
        viewBox={vb}
        label="An upright board with one gate per NSG rule, in priority order from 100 at the top to 65500 at the bottom. A packet ball drops from the top; each rule it doesn't match lets it fall through; the first matching rule's flipper tips it into the ALLOW or DENY bin."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat.filter((i) => i.key < 50)} />
        <Items items={dyn.rows} />
        <Items items={dyn.ball} />
        <Items items={stat.filter((i) => i.key >= 50)} />
      </Card>
      <div className="controls">
        <div className="seg">
          {SOURCES.map((s) => <button key={s.id} className={srcId === s.id ? "on" : ""} onClick={() => { poke(); drop(s.id, port); }}>{s.label}</button>)}
        </div>
        <div className="seg">
          {PORTS.map((p) => <button key={p} className={port === p ? "on" : ""} onClick={() => { poke(); drop(srcId, p); }}>:{p}</button>)}
        </div>
      </div>
      <Legend items={[
        { swatch: "sand", text: "Your rules (100–4096)" },
        { swatch: "mid", text: "Default rules (65000+)" },
        { swatch: "ok", text: "Allow" },
        { swatch: "warn", text: "Deny" },
      ]} />
      <p className="caption">
        Rules are read top to bottom by priority number, and the first rule that matches source, port (and protocol and destination) decides. Try <b>another subnet → :3389</b>: none of your rules match, so the built-in AllowVnetInBound lets it in. That's why segmentation needs explicit denies above 65000.
      </p>
    </div>
  );
}
