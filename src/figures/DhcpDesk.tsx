import { useMemo, useRef, useState } from "react";
import {
  alongPath, bench, box, boundsOf, camera, cyl, dotsItem, faceText, labelPlate, line3, screws, sortItems, tube,
  type Fam, type Item, type LineItem, type V3,
} from "../iso/kit";
import { Card, Items, Legend } from "../iso/draw";
import { useInView, useLoop, useReducedMotion, useTour } from "../iso/live";
import { LEASE_H, POOL, SECONDS_PER_HOUR, SERVER_IP, T1, T2, WIRE, type Msg } from "../models/dhcp";

const C = camera(34, 32);
const Z0 = 7;
const BUS_Y = 40;
const CZ = Z0 + 1.2;
const SRV = { x0: 0, x1: 44, y1: 22, h: 26 };
const CLIENT_X = [64, 114, 164];
const CL = { w: 34, y0: 54, y1: 78, h: 10 };
const HUE: ("violet" | "teal" | "rose")[] = ["violet", "teal", "rose"];
const NAMES = ["laptop", "phone", "printer"];
const MSG_FAM: Record<Msg, Fam> = { DISCOVER: "sig", OFFER: "teal", REQUEST: "blue", ACK: "ok", RELEASE: "warn" };
const LEASE_S = LEASE_H * SECONDS_PER_HOUR;

const tagX = (i: number) => SRV.x0 + 5 + i * 4.5;
const TAG_Z = Z0 + 11;
const srvTap: V3 = [22, BUS_Y, CZ];
const cliTap = (i: number): V3 => [CLIENT_X[i] + CL.w / 2, BUS_Y, CZ];

// paths (for pulses) from the server port, along the bus, to client i, and back
const srvPath = (): V3[] => [[22, SRV.y1 + 2, CZ], srvTap];
const cliPath = (i: number): V3[] => [cliTap(i), [CLIENT_X[i] + CL.w / 2, CL.y0 - 2, CZ]];
const toClient = (i: number): V3[] => [...srvPath(), ...cliPath(i)];
const toServer = (i: number): V3[] => [...toClient(i)].reverse();

function staticItems(): Item[] {
  const it: Item[] = [];
  it.push(...bench(C, -18, -8, 240, 96, Z0));
  it.push(...labelPlate(C, 186, 4, Z0, 28, 7).map((x) => ({ ...x, key: -47 })));
  // the shared segment with a terminator at each end, and drops to every device
  it.push(...tube(C, [[2, BUS_Y, CZ], [206, BUS_Y, CZ]], "mid", 0, 3));
  for (const x of [0, 206]) it.push(box(C, x - 2, BUS_Y - 2.4, Z0, 4, 4.8, 3, "hi", { key: 0.5, bevel: 0.3 }));
  it.push(...tube(C, srvPath(), "blue", 0.1));
  CLIENT_X.forEach((_, i) => it.push(...tube(C, cliPath(i), HUE[i], 0.1 + i * 0.01)));
  for (const p of [srvTap, ...CLIENT_X.map((_, i) => cliTap(i))]) it.push(box(C, p[0] - 2.4, p[1] - 2.4, Z0, 4.8, 4.8, 2.8, "mid", { key: 0.6, bevel: 0.3 }));

  // DHCP server with its pegboard of address tags
  it.push(box(C, SRV.x0, 0, Z0, SRV.x1, SRV.y1, SRV.h, "lo", { key: 1, bevel: 0.6 }));
  it.push(box(C, SRV.x0 - 1, -1, Z0 + SRV.h, SRV.x1 + 2, SRV.y1 + 2, 1.6, "blue", { key: 1.1, r: 0.8, bevel: 0.5 }));
  it.push(screws(C, SRV.x0 - 1, -1, SRV.x1 + 2, SRV.y1 + 2, Z0 + SRV.h + 1.6, 2));
  it.push(faceText(C, "DHCP SERVER", [SRV.x1 / 2, 10.5, Z0 + SRV.h + 1.6], "top", 3, "ink", { key: 1.2, weight: 700 }));
  it.push(box(C, SRV.x0 + 3, SRV.y1, Z0 + 8.5, 38, 0.5, 12, "mid", { key: 1.3 }));
  it.push(faceText(C, `POOL ${POOL[0]} – .${POOL[POOL.length - 1].split(".")[3]}`, [SRV.x1 / 2, SRV.y1 + 0.5, Z0 + 22.5], "+y", 2.1, "blue", { key: 1.4, weight: 600 }));
  it.push(faceText(C, `${SERVER_IP} · UDP 67`, [SRV.x1 / 2, SRV.y1, Z0 + 4.5], "+y", 2.1, "mid", { key: 1.4 }));
  it.push(dotsItem(C, POOL.map((_, i): V3 => [tagX(i) + 1.6, SRV.y1 + 0.6, TAG_Z + 7]), 0.45, "hi", 0, true));
  (it[it.length - 1] as { key: number }).key = 1.5;

  // clients
  CLIENT_X.forEach((x, i) => {
    it.push(box(C, x, CL.y0, Z0, CL.w, CL.y1 - CL.y0, CL.h, "mid", { key: 10 + i, r: 1.2, bevel: 0.7 }));
    it.push(box(C, x + 2.5, CL.y0 + 2.5, Z0 + CL.h, 18, CL.y1 - CL.y0 - 5, 0.4, "lo", { key: 10.1 + i, r: 0.6 }));
    it.push(faceText(C, NAMES[i].toUpperCase(), [x + 4, CL.y0 + 6, Z0 + CL.h + 0.4], "top", 2.2, HUE[i], { anchor: "start", key: 10.2 + i, weight: 700 }));
    it.push(faceText(C, "UDP 68", [x + CL.w / 2, CL.y1, Z0 + 4], "+y", 2, "mid", { key: 10.2 + i }));
    // lease dial bezel and face, with T1 and T2 marks
    const dx = x + CL.w - 7, dy = CL.y0 + 12;
    it.push(cyl(C, dx, dy, Z0 + CL.h, 5.2, 1.2, "hi", { key: 10.3 + i, n: 36 }));
    let ticks = "";
    for (let k = 0; k < 24; k++) {
      const a = -Math.PI / 2 + (k / 24) * Math.PI * 2;
      ticks += line3(C, [[dx + 3.8 * Math.cos(a), dy + 3.8 * Math.sin(a), Z0 + CL.h + 1.2], [dx + 4.5 * Math.cos(a), dy + 4.5 * Math.sin(a), Z0 + CL.h + 1.2]]);
    }
    it.push({ kind: "line", d: ticks, tone: "lo", w: 0.3, layer: 0, key: 10.4 + i } as LineItem);
    for (const [f, tone] of [[T1, "blue"], [T2, "sig"]] as const) {
      const a = -Math.PI / 2 + f * Math.PI * 2;
      it.push({ kind: "line", d: line3(C, [[dx + 2.6 * Math.cos(a), dy + 2.6 * Math.sin(a), Z0 + CL.h + 1.2], [dx + 4.8 * Math.cos(a), dy + 4.8 * Math.sin(a), Z0 + CL.h + 1.2]]), tone, w: 0.8, layer: 0, key: 10.41 + i } as LineItem);
    }
  });
  return sortItems(it);
}

// ---------- simulation ----------

type Flight = { msg: Msg; path: V3[]; t0: number; d: number; fam: Fam; carry?: number; then?: () => void; from: string };
type Client = { ip: number | null; offered: number | null; leaseStart: number; busy: boolean };

export function DhcpDesk() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(svgRef);
  const sim = useRef({
    t: 0,
    flights: [] as Flight[],
    clients: [0, 1, 2].map((): Client => ({ ip: null, offered: null, leaseStart: 0, busy: false })),
    tags: POOL.map(() => "free" as "free" | "offered" | "leased"),
    last: { msg: "" as Msg | "", text: "Plug a device in to watch it ask for an address" },
    renewals: 0,
    tour: 0,
  });
  const [, setTick] = useState(0);
  const S = sim.current;

  const fly = (f: Omit<Flight, "t0">) => {
    S.flights.push({ ...f, t0: S.t });
    S.last = { msg: f.msg, text: `${f.msg} · ${f.from} · ${WIRE[f.msg]}` };
  };

  const connect = (i: number) => {
    const c = S.clients[i];
    if (c.busy || c.ip !== null) return;
    c.busy = true;
    const who = NAMES[i];
    // DISCOVER: broadcast floods the whole segment
    fly({ msg: "DISCOVER", path: toServer(i), d: 1.3, fam: MSG_FAM.DISCOVER, from: who, then: () => {
      const free = S.tags.findIndex((t) => t === "free");
      if (free < 0) { c.busy = false; S.last = { msg: "", text: "Pool exhausted · no offer, the device falls back to 169.254.x.x" }; return; }
      S.tags[free] = "offered";
      c.offered = free;
      fly({ msg: "OFFER", path: toClient(i), d: 1.2, fam: MSG_FAM.OFFER, carry: free, from: `server offers ${POOL[free]}`, then: () => {
        fly({ msg: "REQUEST", path: toServer(i), d: 1.2, fam: MSG_FAM.REQUEST, carry: free, from: `${who} requests ${POOL[free]}`, then: () => {
          S.tags[free] = "leased";
          fly({ msg: "ACK", path: toClient(i), d: 1.2, fam: HUE[i], carry: free, from: `${POOL[free]} leased for ${LEASE_H} h`, then: () => {
            c.ip = free; c.offered = null; c.leaseStart = S.t; c.busy = false;
          } });
        } });
      } });
    } });
    // the broadcast also reaches the other devices, which ignore it
    CLIENT_X.forEach((_, j) => {
      if (j === i) return;
      S.flights.push({ msg: "DISCOVER", path: [cliTap(i), ...cliPath(j)], t0: S.t + 0.25, d: 1.0, fam: MSG_FAM.DISCOVER, from: who });
    });
  };

  const release = (i: number) => {
    const c = S.clients[i];
    if (c.ip === null || c.busy) return;
    const tag = c.ip;
    c.busy = true;
    fly({ msg: "RELEASE", path: toServer(i), d: 1.2, fam: MSG_FAM.RELEASE, carry: tag, from: `${NAMES[i]} releases ${POOL[tag]}`, then: () => {
      S.tags[tag] = "free"; c.ip = null; c.busy = false;
    } });
    c.ip = null;
  };

  const renew = (i: number) => {
    const c = S.clients[i];
    if (c.ip === null || c.busy) return;
    c.busy = true;
    const tag = c.ip;
    fly({ msg: "REQUEST", path: toServer(i), d: 1.0, fam: MSG_FAM.REQUEST, from: `${NAMES[i]} renews ${POOL[tag]} at T1 (unicast to ${SERVER_IP})`, then: () => {
      fly({ msg: "ACK", path: toClient(i), d: 1.0, fam: MSG_FAM.ACK, from: `lease on ${POOL[tag]} extended another ${LEASE_H} h`, then: () => {
        c.leaseStart = S.t; c.busy = false; S.renewals++;
      } });
    } });
  };

  const poke = useTour(() => {
    const free = S.clients.findIndex((c) => c.ip === null && !c.busy);
    if (free >= 0) connect(free);
  }, inView && !reduced, 6, 4);

  useLoop((_t, dt) => {
    S.t += reduced ? dt * 20 : dt;
    // arrivals
    const done = S.flights.filter((f) => S.t >= f.t0 + f.d);
    S.flights = S.flights.filter((f) => S.t < f.t0 + f.d);
    done.forEach((f) => f.then?.());
    // automatic renewal at T1
    S.clients.forEach((c, i) => {
      if (c.ip !== null && !c.busy && (S.t - c.leaseStart) / LEASE_S >= T1) renew(i);
    });
    setTick((k) => (k + 1) % 1e6);
  }, inView);

  const stat = useMemo(() => staticItems(), []);
  const vb = useMemo(() => { const b = boundsOf(stat, 6); return `${b.x} ${b.y} ${b.w} ${b.h}`; }, [stat]);

  // ---- dynamic drawing (cheap: a few dozen parts) ----
  const tags: Item[] = [];
  POOL.forEach((ip, k) => {
    if (S.tags[k] === "leased" && !S.flights.some((f) => f.carry === k && f.msg === "ACK")) return;
    if (S.flights.some((f) => f.carry === k && (f.msg === "ACK" || f.msg === "RELEASE"))) return;
    const fam: Fam = S.tags[k] === "offered" ? "teal" : "hi";
    tags.push(box(C, tagX(k), SRV.y1 + 0.5, TAG_Z, 3.4, 0.8, 6.5, fam, { key: k, bevel: 0.2 }));
    tags.push(faceText(C, `.${ip.split(".")[3]}`, [tagX(k) + 1.7, SRV.y1 + 1.3, TAG_Z + 3], "+y", 1.6, "ink", { key: k + 0.5, weight: 700 }));
  });
  const pulses: Item[] = [];
  S.flights.forEach((f, k) => {
    const u = (S.t - f.t0) / f.d;
    if (u < 0) return;
    const p = alongPath(f.path, u);
    const big = f.carry !== undefined && (f.msg === "ACK" || f.msg === "RELEASE");
    pulses.push(box(C, p[0] - 2.2, p[1] - 2.2, Z0 + 2.4, 4.4, 4.4, big ? 5 : 2.8, f.fam, { key: k, bevel: 0.3 }));
    if (big) pulses.push(faceText(C, `.${POOL[f.carry!].split(".")[3]}`, [p[0], p[1], Z0 + 7.4], "top", 1.8, "ink", { key: k + 0.5, weight: 700 }));
  });
  const lids: Item[] = [];
  S.clients.forEach((c, i) => {
    const x = CLIENT_X[i];
    const ip = c.ip !== null ? POOL[c.ip] : "0.0.0.0";
    lids.push(faceText(C, ip, [x + 4, CL.y0 + 11, Z0 + CL.h + 0.4], "top", 2.6, c.ip !== null ? HUE[i] : "mid", { anchor: "start", key: 0, weight: 700 }));
    lids.push(faceText(C, c.ip !== null ? "BOUND" : c.busy ? "ASKING…" : "NO ADDRESS", [x + 4, CL.y0 + 15.5, Z0 + CL.h + 0.4], "top", 1.7, c.ip !== null ? "ok" : c.busy ? "sig" : "mid", { anchor: "start", key: 0 }));
    // lease needle
    const dx = x + CL.w - 7, dy = CL.y0 + 12;
    const frac = c.ip !== null ? Math.min(1, (S.t - c.leaseStart) / LEASE_S) : 0;
    const a = -Math.PI / 2 + frac * Math.PI * 2;
    lids.push({ kind: "line", d: line3(C, [[dx, dy, Z0 + CL.h + 1.4], [dx + 3.9 * Math.cos(a), dy + 3.9 * Math.sin(a), Z0 + CL.h + 1.4]]), tone: c.ip !== null ? HUE[i] : "lo", w: 0.7, layer: 0, key: 1 } as LineItem);
    lids.push(cyl(C, dx, dy, Z0 + CL.h + 1.2, 0.7, 0.4, "hi", { key: 2, n: 12 }));
  });

  const leased = S.clients.filter((c) => c.ip !== null).length;
  const onKey = (e: React.KeyboardEvent) => {
    poke();
    const k = Number(e.key);
    if (k >= 1 && k <= 3) { const c = S.clients[k - 1]; if (c.ip !== null) release(k - 1); else connect(k - 1); e.preventDefault(); }
  };

  const last = S.last;
  return (
    <div>
      <Card
        n={7}
        title="Lease desk"
        hint="1 2 3 plug in / release a device"
        readout={last.msg ? <><b className={`c-${{ DISCOVER: "amber", OFFER: "teal", REQUEST: "blue", ACK: "teal", RELEASE: "rose" }[last.msg]}`}>{last.text.split(" · ")[0]}</b> · {last.text.split(" · ").slice(1).join(" · ")}</> : last.text}
        viewBox={vb}
        label="A DHCP server with a pegboard of address tags sits on a shared Ethernet segment with three devices. A device broadcasts DISCOVER, the server OFFERs a tag, the device REQUESTs it, and the server's ACK carries the tag to the device. Lease dials show renewal at T1."
        onKeyDown={onKey}
        svgRef={svgRef}
      >
        <Items items={stat} />
        <Items items={sortItems(tags)} />
        <Items items={sortItems(pulses)} />
        <Items items={lids} />
      </Card>
      <div className="controls">
        {NAMES.map((n, i) => {
          const c = S.clients[i];
          return (
            <button key={n} className="pill-btn" disabled={c.busy} onClick={() => { poke(); if (c.ip !== null) release(i); else connect(i); }}>
              <span className={`c-${HUE[i]}`}>●</span> {c.ip !== null ? `Release ${n}` : `Plug in ${n}`}
            </button>
          );
        })}
        <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
          pool {leased}/{POOL.length} leased · renewals {S.renewals} · clock 1 s = 1 h
        </span>
      </div>
      <Legend items={[
        { swatch: "sig", text: "DISCOVER (broadcast)" },
        { swatch: "teal", text: "OFFER" },
        { swatch: "blue", text: "REQUEST · dial mark T1 = renew at 50%" },
        { swatch: "ok", text: "ACK (carries the lease)" },
        { swatch: "warn", text: "RELEASE" },
      ]} />
      <p className="caption">
        Until it has a lease the device has no address, so it shouts: DISCOVER and REQUEST go to 255.255.255.255 from 0.0.0.0, and every device on the segment hears them. At T1 (half the lease) it renews quietly by unicast; if the server doesn't answer by T2 (87.5%) it broadcasts to any server, and when the lease runs out it must stop using the address.
      </p>
    </div>
  );
}
