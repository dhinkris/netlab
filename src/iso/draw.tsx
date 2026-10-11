import type { ReactNode } from "react";
import type { Item } from "./kit";

export function Items({ items }: { items: Item[] }) {
  return <>{items.map((it, i) => <ItemView key={i} it={it} />)}</>;
}

export function ItemView({ it }: { it: Item }) {
  switch (it.kind) {
    case "solid":
      return (
        <g>
          {it.faces.map((f, i) => (
            <path key={i} d={f.d} style={{ fill: f.fill, stroke: f.fill }} strokeWidth={0.35} strokeLinejoin="round" />
          ))}
          <path d={it.creases} className="iso-crease" />
          <path d={it.outline} className="iso-edge" />
        </g>
      );
    case "line":
      return <path d={it.d} className={`iso-ln t-${it.tone}`} strokeWidth={it.w} strokeDasharray={it.dash} />;
    case "dots":
      return (
        <g className={`iso-dot t-${it.tone}`}>
          {it.pts.map(([x, y], i) =>
            it.ring ? (
              <g key={i}>
                <circle cx={x} cy={y} r={it.r * 1.9} className="iso-ring" />
                <circle cx={x} cy={y} r={it.r} />
              </g>
            ) : (
              <circle key={i} cx={x} cy={y} r={it.r} />
            ),
          )}
        </g>
      );
    case "text":
      return (
        <text
          transform={it.matrix}
          fontSize={it.size}
          textAnchor={it.anchor}
          dominantBaseline="central"
          className={`iso-tx t-${it.tone}${it.mono ? " mono" : ""}`}
          fontWeight={it.weight}
        >
          {it.text}
        </text>
      );
    case "halo":
      return <path d={it.d} className="iso-halo" />;
  }
}

export function Card({
  n,
  title,
  hint,
  readout,
  viewBox,
  children,
  label,
  onKeyDown,
  svgRef,
}: {
  n: number;
  title: string;
  hint: string;
  readout: ReactNode;
  viewBox: string;
  children: ReactNode;
  label: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  svgRef?: React.Ref<SVGSVGElement>;
}) {
  return (
    <figure className="iso-card">
      <div className="iso-card-head">
        <span>Fig {n}</span>
        <span>{title}</span>
      </div>
      <svg
        ref={svgRef}
        className="iso-svg"
        viewBox={viewBox}
        role="img"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <defs>
          <filter id="iso-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        {children}
      </svg>
      <div className="iso-card-foot">
        <span className="iso-hint">{hint}</span>
        <span className="iso-readout" aria-live="polite">{readout}</span>
      </div>
    </figure>
  );
}

export function Legend({ items }: { items: { swatch: string; text: string }[] }) {
  return (
    <ul className="iso-legend">
      {items.map((it) => (
        <li key={it.text}>
          <span className={`sw sw-${it.swatch}`} />
          {it.text}
        </li>
      ))}
    </ul>
  );
}
