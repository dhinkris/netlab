// Isometric kit: camera, plans, extruded solids with facing tones, lines,
// dots, text on faces and painter's ordering. World units: x, y on the
// floor, z up. Everything is projected once into SVG path strings.

export type V2 = [number, number];
export type V3 = [number, number, number];

export type Cam = { ca: number; sa: number; ce: number; se: number };

export function camera(azimuthDeg = 45, elevationDeg = 30): Cam {
  const a = (azimuthDeg * Math.PI) / 180;
  const e = (elevationDeg * Math.PI) / 180;
  return { ca: Math.cos(a), sa: Math.sin(a), ce: Math.cos(e), se: Math.sin(e) };
}

export function proj(c: Cam, p: V3): V2 {
  const u = p[0] * c.ca - p[1] * c.sa;
  const v = p[0] * c.sa + p[1] * c.ca;
  return [u, v * c.se - p[2] * c.ce];
}

/** Larger = nearer the viewer. */
export function depthOf(c: Cam, p: V3): number {
  const v = p[0] * c.sa + p[1] * c.ca;
  return v * c.ce + p[2] * c.se;
}

/** Screen offset of a world displacement (projection is linear). */
export function along(c: Cam, d: V3): V2 {
  return proj(c, d);
}

const f = (n: number) => (Math.round(n * 100) / 100).toString();

export function pathOf(pts: V2[], close = false): string {
  if (!pts.length) return "";
  let s = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) s += `L${f(pts[i][0])} ${f(pts[i][1])}`;
  return close ? s + "Z" : s;
}

export function line3(c: Cam, pts: V3[], close = false): string {
  return pathOf(pts.map((p) => proj(c, p)), close);
}

// ---------- plans ----------

export type Plan = { pts: V2[]; sharp: boolean[] };

export function rrect(x: number, y: number, w: number, d: number, r = 0, seg = 5): Plan {
  if (r <= 0) {
    return {
      pts: [[x, y], [x + w, y], [x + w, y + d], [x, y + d]],
      sharp: [true, true, true, true],
    };
  }
  r = Math.min(r, w / 2, d / 2);
  const pts: V2[] = [];
  const corners: [number, number, number][] = [
    [x + w - r, y + r, -90],
    [x + w - r, y + d - r, 0],
    [x + r, y + d - r, 90],
    [x + r, y + r, 180],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = ((a0 + (90 * i) / seg) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return { pts, sharp: pts.map(() => false) };
}

export function circle(cx: number, cy: number, r: number, n = 32): Plan {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return { pts, sharp: pts.map(() => false) };
}

export function inset(plan: Plan, k: number): Plan {
  // centroid-scaled inset, good enough for the convex plans used here
  const n = plan.pts.length;
  let cx = 0, cy = 0;
  for (const p of plan.pts) { cx += p[0]; cy += p[1]; }
  cx /= n; cy /= n;
  const pts = plan.pts.map(([x, y]): V2 => {
    const dx = x - cx, dy = y - cy;
    const L = Math.hypot(dx, dy) || 1;
    return [x - (dx / L) * k, y - (dy / L) * k];
  });
  return { pts, sharp: plan.sharp };
}

// ---------- tones ----------

export type Fam = "lo" | "mid" | "hi" | "lit" | "sig" | "ok" | "warn" | "blue" | "teal" | "violet" | "rose";

function sideFill(fam: Fam, p: number) {
  return `color-mix(in srgb, var(--${fam}-l) ${Math.round(p * 100)}%, var(--${fam}-d))`;
}

function shadeOf(c: Cam, nx: number, ny: number) {
  const nu = nx * c.ca - ny * c.sa;
  const nv = nx * c.sa + ny * c.ca;
  // light from upper left of the screen, a little toward the viewer
  const s = -0.82 * nu + 0.35 * nv;
  return Math.max(0, Math.min(1, (s + 0.9) / 1.8));
}

// ---------- hull ----------

function hull(pts: V2[]): V2[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: V2[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up: V2[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  up.pop(); lo.pop();
  return lo.concat(up);
}

// ---------- solids ----------

export type Face = { d: string; fill: string };
export type Solid = {
  kind: "solid";
  faces: Face[];
  creases: string;
  outline: string;
  layer: number;
  key: number;
  id?: string;
};

export type SolidOpts = {
  layer?: number;
  key?: number;
  /** draw a bevel line inset on the top face */
  bevel?: number;
  /** extra crease lines on the top (world polylines at top height) */
  id?: string;
  /** hide the top face (open trays drawn from parts) */
  noTop?: boolean;
};

export function prism(c: Cam, plan: Plan, z0: number, h: number, fam: Fam, o: SolidOpts = {}): Solid {
  const n = plan.pts.length;
  // orientation: make outward normals consistent (plan is CCW in x-right,y-down?)
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = plan.pts[i], b = plan.pts[(i + 1) % n];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sgn = area > 0 ? 1 : -1;
  const z1 = z0 + h;
  const faces: { d: string; fill: string; dep: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = plan.pts[i], b = plan.pts[(i + 1) % n];
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const L = Math.hypot(ex, ey) || 1;
    // outward normal
    const nx = (sgn * ey) / L, ny = (-sgn * ex) / L;
    const toward = nx * c.sa + ny * c.ca;
    if (toward <= 1e-6) continue;
    const quad: V3[] = [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]];
    faces.push({
      d: line3(c, quad, true),
      fill: sideFill(fam, shadeOf(c, nx, ny)),
      dep: depthOf(c, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z0]),
    });
  }
  faces.sort((p, q) => p.dep - q.dep);
  const top: V3[] = plan.pts.map(([x, y]) => [x, y, z1]);
  const out: Face[] = faces.map(({ d, fill }) => ({ d, fill }));
  if (!o.noTop) out.push({ d: line3(c, top, true), fill: `var(--${fam}-t)` });

  let creases = line3(c, top, true);
  // vertical edges at sharp, visible corners
  for (let i = 0; i < n; i++) {
    if (!plan.sharp[i]) continue;
    const p = plan.pts[i];
    const prev = plan.pts[(i - 1 + n) % n], next = plan.pts[(i + 1) % n];
    const t1 = normalToward(c, prev, p, sgn), t2 = normalToward(c, p, next, sgn);
    if (t1 > 1e-6 && t2 > 1e-6) creases += line3(c, [[p[0], p[1], z0], [p[0], p[1], z1]]);
  }
  if (o.bevel) creases += line3(c, inset(plan, o.bevel).pts.map(([x, y]) => [x, y, z1] as V3), true);

  const all: V2[] = [];
  for (const [x, y] of plan.pts) { all.push(proj(c, [x, y, z0])); all.push(proj(c, [x, y, z1])); }
  let cx = 0, cy = 0;
  for (const p of plan.pts) { cx += p[0]; cy += p[1]; }
  return {
    kind: "solid",
    faces: out,
    creases,
    outline: pathOf(hull(all), true),
    layer: o.layer ?? 0,
    key: o.key ?? depthOf(c, [cx / n, cy / n, z0 + h / 2]),
    id: o.id,
  };
}

function normalToward(c: Cam, a: V2, b: V2, sgn: number) {
  const ex = b[0] - a[0], ey = b[1] - a[1];
  const L = Math.hypot(ex, ey) || 1;
  const nx = (sgn * ey) / L, ny = (-sgn * ex) / L;
  return nx * c.sa + ny * c.ca;
}

export function box(c: Cam, x: number, y: number, z: number, w: number, d: number, h: number, fam: Fam, o: SolidOpts & { r?: number } = {}): Solid {
  return prism(c, rrect(x, y, w, d, o.r ?? 0), z, h, fam, o);
}

export function cyl(c: Cam, cx: number, cy: number, z: number, r: number, h: number, fam: Fam, o: SolidOpts & { n?: number } = {}): Solid {
  return prism(c, circle(cx, cy, r, o.n ?? 28), z, h, fam, o);
}

// ---------- lines, dots, text ----------

export type Tone = "faint" | "lo" | "mid" | "hi" | "lit" | "sig" | "ok" | "warn" | "blue" | "teal" | "violet" | "rose" | "ink";

export type LineItem = { kind: "line"; d: string; tone: Tone; w: number; layer: number; key: number; dash?: string };
export type DotItem = { kind: "dots"; pts: V2[]; r: number; tone: Tone; ring?: boolean; layer: number; key: number };
export type TextItem = {
  kind: "text";
  text: string;
  matrix: string;
  size: number;
  tone: Tone;
  anchor: "start" | "middle" | "end";
  weight?: number;
  mono?: boolean;
  layer: number;
  key: number;
  id?: string;
};
export type HaloItem = { kind: "halo"; d: string; layer: number; key: number };
export type Item = Solid | LineItem | DotItem | TextItem | HaloItem;

export function lineItem(c: Cam, pts: V3[], tone: Tone, w = 0.6, layer = 0, key?: number, close = false): LineItem {
  return { kind: "line", d: line3(c, pts, close), tone, w, layer, key: key ?? avgDepth(c, pts) };
}

export function dotsItem(c: Cam, pts: V3[], r: number, tone: Tone, layer = 0, ring = false): DotItem {
  return { kind: "dots", pts: pts.map((p) => proj(c, p)), r, tone, ring, layer, key: avgDepth(c, pts) };
}

function avgDepth(c: Cam, pts: V3[]) {
  let s = 0;
  for (const p of pts) s += depthOf(c, p);
  return s / Math.max(1, pts.length);
}

/** SVG matrix that maps text (x along u, y along v) onto a world plane. */
export function planeMatrix(c: Cam, o: V3, u: V3, v: V3): string {
  const P0 = proj(c, o);
  const pu = proj(c, u), pv = proj(c, v);
  return `matrix(${f(pu[0])} ${f(pu[1])} ${f(pv[0])} ${f(pv[1])} ${f(P0[0])} ${f(P0[1])})`;
}

/** Text lying on a face. face: "top" (z up), "+x" or "+y" (vertical walls facing the viewer). */
export function faceText(
  c: Cam,
  text: string,
  at: V3,
  face: "top" | "+x" | "+y",
  size: number,
  tone: Tone = "mid",
  o: { anchor?: "start" | "middle" | "end"; weight?: number; mono?: boolean; layer?: number; key?: number; id?: string } = {},
): TextItem {
  let u: V3, v: V3;
  if (face === "top") { u = [1, 0, 0]; v = [0, 1, 0]; }
  else if (face === "+y") { u = [1, 0, 0]; v = [0, 0, -1]; }
  else { u = [0, -1, 0]; v = [0, 0, -1]; }
  return {
    kind: "text",
    text,
    matrix: planeMatrix(c, at, u, v),
    size,
    tone,
    anchor: o.anchor ?? "middle",
    weight: o.weight,
    mono: o.mono ?? true,
    layer: o.layer ?? 0,
    key: o.key ?? depthOf(c, at) + 0.01,
    id: o.id,
  };
}

export function halo(c: Cam, plan: Plan, grow = 4, layer = -1): HaloItem {
  const pts = inset(plan, -grow).pts.map(([x, y]) => proj(c, [x, y, 0]));
  return { kind: "halo", d: pathOf(pts, true), layer, key: -1e9 };
}

// ---------- detail helpers ----------

/** Screws as dots with a ring, at the inset corners of a plate top. */
export function screws(c: Cam, x: number, y: number, w: number, d: number, z: number, k = 3, layer = 0): DotItem {
  return dotsItem(c, [[x + k, y + k, z], [x + w - k, y + k, z], [x + w - k, y + d - k, z], [x + k, y + d - k, z]], 0.55, "mid", layer, true);
}

/** Tick ruler along x on a top face. */
export function ticksX(c: Cam, x0: number, x1: number, y: number, z: number, step: number, len: number, majorEvery = 5, layer = 0): LineItem[] {
  let minor = "", major = "";
  let i = 0;
  for (let x = x0; x <= x1 + 1e-6; x += step, i++) {
    const big = i % majorEvery === 0;
    const seg = line3(c, [[x, y, z], [x, y + (big ? len : len * 0.55), z]]);
    if (big) major += seg; else minor += seg;
  }
  return [
    { kind: "line", d: minor, tone: "lo", w: 0.35, layer, key: depthOf(c, [x0, y, z]) },
    { kind: "line", d: major, tone: "mid", w: 0.45, layer, key: depthOf(c, [x0, y, z]) },
  ];
}

/** Ticks along y on a top face. */
export function ticksY(c: Cam, y0: number, y1: number, x: number, z: number, step: number, len: number, majorEvery = 5, layer = 0): LineItem[] {
  let minor = "", major = "";
  let i = 0;
  for (let y = y0; y <= y1 + 1e-6; y += step, i++) {
    const big = i % majorEvery === 0;
    const seg = line3(c, [[x, y, z], [x + (big ? len : len * 0.55), y, z]]);
    if (big) major += seg; else minor += seg;
  }
  return [
    { kind: "line", d: minor, tone: "lo", w: 0.35, layer, key: depthOf(c, [x, y0, z]) },
    { kind: "line", d: major, tone: "mid", w: 0.45, layer, key: depthOf(c, [x, y0, z]) },
  ];
}

/** Label plate: a thin inlay with three engraved rule lines. */
export function labelPlate(c: Cam, x: number, y: number, z: number, w: number, d: number, layer = 0): Item[] {
  const plate = box(c, x, y, z, w, d, 0.6, "mid", { layer, r: 0.8 });
  const rules: V3[][] = [0.3, 0.5, 0.7].map((t, i) => [
    [x + 2, y + d * t, z + 0.6],
    [x + w - 2 - (i === 2 ? w * 0.35 : 0), y + d * t, z + 0.6],
  ]);
  const d0 = rules.map((r) => line3(c, r)).join("");
  return [plate, { kind: "line", d: d0, tone: "lo", w: 0.4, layer, key: plate.key + 0.01 }];
}

/** Knurl lines around a vertical cylinder's visible side. */
export function knurl(c: Cam, cx: number, cy: number, z: number, r: number, h: number, n = 22, layer = 0): LineItem {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const nx = Math.cos(a), ny = Math.sin(a);
    const toward = nx * c.sa + ny * c.ca;
    if (toward < 0.15) continue;
    d += line3(c, [[cx + r * nx, cy + r * ny, z + 0.4], [cx + r * nx, cy + r * ny, z + h - 0.4]]);
  }
  return { kind: "line", d, tone: "lo", w: 0.35, layer, key: depthOf(c, [cx, cy, z]) + r };
}

export function sortItems<T extends Item>(items: T[]): T[] {
  return [...items].sort((a, b) => a.layer - b.layer || a.key - b.key);
}

export function boundsOf(items: Item[], pad = 8): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const take = (d: string) => {
    const nums = d.match(/-?\d+(\.\d+)?/g);
    if (!nums) return;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = +nums[i], y = +nums[i + 1];
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  };
  for (const it of items) {
    if (it.kind === "solid") take(it.outline);
    else if (it.kind === "halo") take(it.d);
  }
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}
