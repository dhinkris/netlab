import { useMemo, useRef, useState } from "react";
import {
  box, boundsOf, camera, ease, faceText, halo, lerp, line3, prism, rrect, sortItems,
  type Fam, type Item, type LineItem, type Seg,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useReducedMotion, useTour } from "../iso/live";
import { splitSay, useScript } from "../iso/script";

const C = camera(22, 28);
const FZ = 2, BZ = 10; // floor, belt top
const OUT_Y = 26, IN_Y = 72; // belt centre lines
const X0 = 18, X1 = 214;
const DESK_X = 66, BOARD_X = 128, XRAY_X = 120;
const MON_X = XRAY_X + 44; // X-ray monitor's left edge, clear of the outbound checkpoints

type Scene = { id: string; dir: "out" | "in"; label: string; tag: string; detail: string; stop: "desk" | "board" | "xray" | null; why: string };
const SCENES: Scene[] = [
  { id: "o1", dir: "out", label: "vm → update.microsoft.com", tag: "update.microsoft.com", detail: "TCP 443", stop: null, why: "Network rule allows 443 · FQDN rule allows *.microsoft.com" },
  { id: "o2", dir: "out", label: "vm → bad-site.example", tag: "bad-site.example", detail: "TCP 443", stop: "board", why: "Port 443 is fine · but the FQDN isn't on the allow list (threat intel flags it too)" },
  { id: "o3", dir: "out", label: "vm → 203.0.113.9:25", tag: "203.0.113.9:25", detail: "TCP 25 (SMTP)", stop: "desk", why: "Network rules don't allow TCP 25 out · stopped before any FQDN check" },
  { id: "i1", dir: "in", label: "GET /products?id=42", tag: "GET /products?id=42", detail: "HTTPS", stop: null, why: "WAF inspects the request · nothing malicious · forwarded to the web app" },
  { id: "i2", dir: "in", label: "SQL injection", tag: "GET /products?id=42' OR 1=1--", detail: "HTTPS", stop: "xray", why: "WAF managed rules match SQL injection · 403 Forbidden" },
  { id: "i3", dir: "in", label: "Cross-site scripting", tag: "GET /search?q=<script>alert(1)</script>", detail: "HTTPS", stop: "xray", why: "WAF managed rules match XSS · 403 Forbidden" },
];
const FQDNS = [["*.microsoft.com", true], ["api.github.com", true], ["*.ubuntu.com", true], ["everything else", false]] as const;

function staticItems(): Item[] {
  const it: Item[] = [];
  const plan = rrect(-6, -10, 240, 104, 4);
  it.push(halo(C, plan, 5));
  it.push(prism(C, plan, 0, FZ, "mid", { key: -100, bevel: 0.6 }));
  let tiles = "";
  for (let x = 2; x < 234; x += 12) tiles += line3(C, [[x, -10, FZ], [x, 94, FZ]]);
  for (let y = -6; y < 94; y += 12) tiles += line3(C, [[-6, y, FZ], [234, y, FZ]]);
  it.push({ kind: "line", d: tiles, tone: "faint", w: 0.4, layer: 0, key: -99 } as LineItem);
  // two belts on legs, with rollers
  for (const [y, k] of [[OUT_Y, 0], [IN_Y, 10]] as const) {
    for (let x = X0 + 6; x < X1; x += 24) for (const dy of [-5, 4]) it.push(box(C, x, y + dy, FZ, 1.4, 1.4, BZ - FZ - 1.2, "lo", { key: -60 + k }));
    it.push(box(C, X0, y - 6, BZ - 1.2, X1 - X0, 12, 1.2, "hi", { key: -59 + k, bevel: 0.3 }));
    let rollers = "";
    for (let x = X0 + 2; x < X1; x += 4) rollers += line3(C, [[x, y - 5.6, BZ], [x, y + 5.6, BZ]]);
    it.push({ kind: "line", d: rollers, tone: "lo", w: 0.6, layer: 0, key: -58.9 + k } as LineItem);
  }
  // endpoints: VNet on the left, internet on the right
  it.push(box(C, -2, OUT_Y - 12, FZ, 16, 70, 18, "blue", { key: -50, bevel: 0.4 }));
  it.push(faceText(C, "VNET", [6, OUT_Y + 58, FZ + 12], "+y", 3, "ink", { key: -49, weight: 700 }));
  it.push(box(C, X1 + 2, OUT_Y - 12, FZ, 16, 70, 18, "sig", { key: -48, bevel: 0.4 }));
  it.push(faceText(C, "INTERNET", [X1 + 10, OUT_Y + 58, FZ + 12], "+y", 2.4, "ink", { key: -47, weight: 700 }));
  // lane signs
  it.push(box(C, X0 + 6, OUT_Y + 7, FZ, 46, 0.6, 7, "violet", { key: -40 }));
  it.push(faceText(C, "AZURE FIREWALL · outbound", [X0 + 29, OUT_Y + 7.6, FZ + 3.6], "+y", 2.2, "ink", { key: -39, weight: 700 }));
  it.push(box(C, X1 - 60, IN_Y + 7, FZ, 56, 0.6, 7, "teal", { key: -38 }));
  it.push(faceText(C, "APP GATEWAY + WAF · inbound", [X1 - 32, IN_Y + 7.6, FZ + 3.6], "+y", 2.2, "ink", { key: -37, weight: 700 }));
  // passport desk (network rules: IP, port, protocol)
  it.push(box(C, DESK_X - 9, OUT_Y - 22, FZ, 18, 12, 16, "sand", { key: -30, bevel: 0.4 }));
  it.push(box(C, DESK_X - 10, OUT_Y - 23, FZ + 16, 20, 14, 1.4, "violet", { key: -29.9 }));
  it.push(box(C, DESK_X - 6, OUT_Y - 10, FZ + 8, 12, 0.4, 6, "sea", { key: -29.8 }));
  it.push(faceText(C, "NETWORK RULES", [DESK_X, OUT_Y - 9.6, FZ + 5.4], "+y", 1.7, "ink", { key: -29.7, weight: 700 }));
  it.push(faceText(C, "allow TCP 443, 80 · UDP 123", [DESK_X, OUT_Y - 9.6, FZ + 3], "+y", 1.4, "ink", { key: -29.7 }));
  // destination board (application rules: FQDNs)
  it.push(box(C, BOARD_X - 1, OUT_Y - 30, FZ, 2, 2, 40, "hi", { key: -28 }));
  it.push(box(C, BOARD_X + 33, OUT_Y - 30, FZ, 2, 2, 40, "hi", { key: -28 }));
  it.push(box(C, BOARD_X - 3, OUT_Y - 28, FZ + 22, 40, 1, 20, "lo", { key: -27.9, bevel: 0.3 }));
  it.push(faceText(C, "APPLICATION RULES (FQDN)", [BOARD_X + 17, OUT_Y - 27, FZ + 39], "+y", 2, "sig", { key: -27.8, weight: 700 }));
  FQDNS.forEach(([f, ok], k) => it.push(faceText(C, `${ok ? "✓" : "✗"} ${f}`, [BOARD_X, OUT_Y - 27, FZ + 34.5 - k * 3.6], "+y", 2, ok ? "ok" : "warn", { anchor: "start", key: -27.8, weight: 600 })));
  // scanner arch over the outbound belt at the board
  for (const y of [OUT_Y - 7, OUT_Y + 6]) it.push(box(C, BOARD_X + 14, y, FZ, 2, 1.4, 22, "mid", { key: y < OUT_Y ? -26 : 20 }));
  it.push(box(C, BOARD_X + 14, OUT_Y - 7, FZ + 22, 2, 14.4, 2, "mid", { key: 20.1 }));
  // X-ray tunnel over the inbound belt
  it.push(box(C, XRAY_X - 14, IN_Y - 9, FZ, 28, 2, 22, "teal", { key: -20 }));
  it.push(box(C, XRAY_X - 14, IN_Y - 9, FZ + 22, 28, 18, 3, "teal", { key: 30, bevel: 0.4 }));
  it.push(box(C, XRAY_X - 14, IN_Y + 7, FZ, 28, 2, 22, "teal", { key: 30.1 }));
  let curtain = "";
  for (let y = IN_Y - 6; y <= IN_Y + 6; y += 2) curtain += line3(C, [[XRAY_X + 14, y, BZ + 12], [XRAY_X + 14, y, BZ + 1]]);
  it.push({ kind: "line", d: curtain, tone: "lo", w: 1, layer: 0, key: 30.2 } as LineItem);
  // its monitor stands behind the inbound belt, right of the tunnel
  it.push(box(C, MON_X + 18, IN_Y - 16, FZ, 2, 2, 14, "hi", { key: 15 }));
  it.push(box(C, MON_X, IN_Y - 17, FZ + 14, 40, 1.4, 15, "lo", { key: 15.1, bevel: 0.4 }));
  // reject bins beside each checkpoint
  for (const [x, y] of [[DESK_X, OUT_Y + 14], [BOARD_X + 15, OUT_Y + 14], [XRAY_X - 30, IN_Y + 14]] as const) {
    it.push(box(C, x - 7, y - 4, FZ, 14, 10, 6, "warn", { key: 40, noTop: true }));
    it.push(box(C, x - 6, y - 3, FZ + 0.5, 12, 8, 0.4, "lo", { key: 40.1 }));
  }
  return sortItems(it);
}

// ---------- script ----------

type Parcel = { x: number; y: number; z: number; fam: Fam; tag: string };
type Fr = { parcel: Parcel | null; screen: string; screenFam: Fam | "ink"; lamp: { desk: Fam; board: Fam; xray: Fam }; say: string };

function script(sc: Scene): Seg<Fr>[] {
  const segs: Seg<Fr>[] = [];
  const lampIdle = { desk: "mid" as Fam, board: "mid" as Fam, xray: "mid" as Fam };
  const F = (p: Partial<Fr>): Fr => ({ parcel: null, screen: "", screenFam: "mid", lamp: lampIdle, say: "", ...p });
  const y = sc.dir === "out" ? OUT_Y : IN_Y;
  const P = (x: number, fam: Fam = "hi", z = BZ): Parcel => ({ x, y, z, fam, tag: sc.tag });
  const ride = (a: number, b: number, d: number, p: Partial<Fr>, fam: Fam = "hi") => segs.push({ d, f: (u) => F({ ...p, parcel: P(lerp(a, b, ease(u)), fam) }) });
  const reject = (x: number, by: number, lamp: Fr["lamp"], screen = "", say = "") => {
    segs.push({ d: 0.9, f: (u) => F({ parcel: { x, y: lerp(y, by, ease(u)), z: lerp(BZ, FZ + 1, ease(u)), fam: "warn", tag: sc.tag }, lamp, screen, screenFam: "warn", say }) });
    segs.push({ d: 1.5, f: () => F({ parcel: { x, y: by, z: FZ + 1, fam: "warn", tag: sc.tag }, lamp, screen, screenFam: "warn", say }) });
  };
  const head = `${sc.label} · ${sc.detail}`;
  if (sc.dir === "out") {
    ride(X0 + 4, DESK_X, 1.1, { say: head });
    const deskOk = sc.stop !== "desk";
    segs.push({ d: 0.7, f: () => F({ parcel: P(DESK_X, deskOk ? "hi" : "warn"), lamp: { ...lampIdle, desk: deskOk ? "ok" : "warn" }, say: `Network rules (IP, port, protocol) · ${deskOk ? "allowed" : "no rule allows it"}` }) });
    if (!deskOk) { reject(DESK_X, OUT_Y + 14, { ...lampIdle, desk: "warn" }, "", `Denied at the network rules · ${sc.why}`); return segs; }
    ride(DESK_X, BOARD_X + 15, 1.1, { lamp: { ...lampIdle, desk: "ok" }, say: "Next: application rules read the destination name" });
    const boardOk = sc.stop !== "board";
    segs.push({ d: 0.8, f: () => F({ parcel: P(BOARD_X + 15, boardOk ? "ok" : "warn"), lamp: { desk: "ok", board: boardOk ? "ok" : "warn", xray: "mid" }, say: `Application rules check "${sc.tag}" · ${boardOk ? "on the allow list" : "not allowed"}` }) });
    if (!boardOk) { reject(BOARD_X + 15, OUT_Y + 14, { desk: "ok", board: "warn", xray: "mid" }, "", `Denied by FQDN filtering · ${sc.why}`); return segs; }
    ride(BOARD_X + 15, X1 - 4, 1.1, { lamp: { desk: "ok", board: "ok", xray: "mid" }, say: `Allowed · ${sc.why}` }, "ok");
    segs.push({ d: 1.4, f: () => F({ lamp: { desk: "ok", board: "ok", xray: "mid" }, say: `Allowed · ${sc.why}` }) });
    return segs;
  }
  ride(X1 - 4, XRAY_X + 14, 1.1, { say: head });
  segs.push({ d: 0.9, f: (u) => F({ parcel: P(lerp(XRAY_X + 14, XRAY_X, u)), screen: sc.tag, screenFam: "ink", lamp: { ...lampIdle, xray: "sig" }, say: "WAF reads the whole HTTP request: path, query, headers, body" }) });
  const ok = sc.stop !== "xray";
  segs.push({ d: 0.8, f: () => F({ parcel: P(XRAY_X, ok ? "ok" : "warn"), screen: sc.tag, screenFam: ok ? "ok" : "warn", lamp: { ...lampIdle, xray: ok ? "ok" : "warn" }, say: ok ? "Request looks clean" : `Blocked · ${sc.why}` }) });
  if (!ok) { ride(XRAY_X, XRAY_X - 30, 0.8, { screen: sc.tag, screenFam: "warn", lamp: { ...lampIdle, xray: "warn" }, say: `Blocked · ${sc.why}` }, "warn"); reject(XRAY_X - 30, IN_Y + 14, { ...lampIdle, xray: "warn" }, sc.tag, `Blocked · ${sc.why}`); return segs; }
  ride(XRAY_X, X0 + 4, 1.2, { screen: sc.tag, screenFam: "ok", lamp: { ...lampIdle, xray: "ok" }, say: `Allowed · ${sc.why}` }, "ok");
  segs.push({ d: 1.4, f: () => F({ screen: sc.tag, screenFam: "ok", lamp: { ...lampIdle, xray: "ok" }, say: `Allowed · ${sc.why}` }) });
  return segs;
}

function liveItems(fr: Fr): Item[] {
  const it: Item[] = [];
  // station lamps
  it.push(box(C, DESK_X + 5, OUT_Y - 10.2, FZ + 15, 3, 0.6, 2, fr.lamp.desk, { key: 0 }));
  it.push(box(C, BOARD_X + 13.5, OUT_Y - 1.5, FZ + 24, 3, 3, 1.4, fr.lamp.board, { key: 0 }));
  it.push(box(C, XRAY_X - 2, IN_Y - 2, FZ + 25.2, 4, 4, 1.4, fr.lamp.xray, { key: 0 }));
  // X-ray monitor shows the payload
  if (fr.screen) {
    const t = fr.screen.length > 30 ? fr.screen.slice(0, 30) + "…" : fr.screen;
    const sy = IN_Y - 15.5;
    it.push(faceText(C, "WAF · inspecting request", [MON_X + 2, sy, FZ + 26], "+y", 1.7, "mid", { anchor: "start", key: 1, weight: 700 }));
    it.push(faceText(C, t, [MON_X + 2, sy, FZ + 22], "+y", 1.5, fr.screenFam === "ink" ? "hi" : fr.screenFam, { anchor: "start", key: 1, weight: 700 }));
    if (fr.screenFam === "warn") it.push(faceText(C, "403 FORBIDDEN", [MON_X + 2, sy, FZ + 17.5], "+y", 2.2, "warn", { anchor: "start", key: 1, weight: 700 }));
    if (fr.screenFam === "ok") it.push(faceText(C, "clean → forwarded", [MON_X + 2, sy, FZ + 17.5], "+y", 2, "ok", { anchor: "start", key: 1, weight: 700 }));
  }
  if (fr.parcel) {
    const p = fr.parcel;
    it.push(box(C, p.x - 6, p.y - 4, p.z, 12, 8, 6, "hi", { key: 2, bevel: 0.5, r: 0.8 }));
    it.push(box(C, p.x - 2, p.y - 1, p.z + 6, 4, 2, 1.4, "lo", { key: 2.1 }));
    it.push(box(C, p.x + 2.5, p.y + 4, p.z + 1, 3, 0.4, 4, p.fam, { key: 2.2 }));
    const tag = p.tag.length > 22 ? p.tag.slice(0, 21) + "…" : p.tag;
    it.push(faceText(C, tag, [p.x - 5, p.y + 4.2, p.z + 3], "+y", 1.25, "ink", { anchor: "start", key: 2.3, weight: 700 }));
  }
  return it;
}

export function CustomsHall() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const [si, setSi] = useState(0);
  const [run, setRun] = useState(0);
  const tour = useRef(0);
  const sc = SCENES[si];

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);
  const segs = useMemo(() => script(sc), [sc]);
  const fr = useScript(segs, `${run}-${si}`, inView, reduced, { parcel: null, screen: "", screenFam: "mid", lamp: { desk: "mid", board: "mid", xray: "mid" }, say: "" } as Fr);

  const go = (i: number) => { setSi(i); setRun((r) => r + 1); };
  const poke = useTour(() => go(++tour.current % SCENES.length), inView && !reduced, 6.5, 6);
  const dyn = useMemo(() => liveItems(fr), [fr]);
  const { head, rest } = splitSay(fr.say);
  const onKey = (e: React.KeyboardEvent) => { poke(); const k = Number(e.key); if (k >= 1 && k <= SCENES.length) go(k - 1); };

  return (
    <div>
      <Card
        n={20}
        title="Customs hall"
        hint="1–3 outbound · 4–6 inbound"
        readout={<><b>{head}</b>{rest.map((s, i) => <span key={i}> · {s}</span>)}</>}
        viewBox={vb}
        label="A customs hall with two conveyor belts. Outbound parcels pass Azure Firewall's passport desk, which checks IP, port and protocol, then a destination board that only allows listed domain names. Inbound HTTP requests pass through a WAF X-ray tunnel whose monitor shows the request; SQL injection and cross-site scripting are diverted to a reject bin."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat.filter((i) => i.key < 20)} />
        <Items items={dyn} />
        <Items items={stat.filter((i) => i.key >= 20)} />
      </Card>
      <div className="controls">
        <div className="seg">
          {SCENES.map((s, i) => (
            <button key={s.id} className={si === i ? "on" : ""} onClick={() => { poke(); go(i); }}>
              <span className={s.dir === "out" ? "c-violet" : "c-teal"}>{s.dir === "out" ? "↗" : "↙"}</span> {s.label}
            </button>
          ))}
        </div>
      </div>
      <Legend items={[
        { swatch: "violet", text: "Azure Firewall: network + application rules" },
        { swatch: "teal", text: "Application Gateway WAF: reads HTTP content" },
        { swatch: "ok", text: "Passed" }, { swatch: "warn", text: "Rejected" },
      ]} />
      <p className="caption">
        Each layer sees more than the one before. Network rules see addresses and ports; application rules also see the domain name being asked for; a WAF opens the HTTP request itself. None replaces the others, and an NSG (L4) still guards each subnet behind them.
      </p>
    </div>
  );
}
