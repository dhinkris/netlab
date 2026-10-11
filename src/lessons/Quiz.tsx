import { useState } from "react";

export type Q = { q: string; options: string[]; answer: number; why: string };

export function Quiz({ items }: { items: Q[] }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => items.map(() => null));
  const score = picked.filter((p, i) => p === items[i].answer).length;
  const answered = picked.filter((p) => p !== null).length;
  return (
    <div className="quiz">
      {items.map((it, i) => (
        <div className="q" key={i}>
          <p>{i + 1}. {it.q}</p>
          <div className="opts">
            {it.options.map((o, j) => {
              const p = picked[i];
              const cls = p === null ? "" : j === it.answer ? " right" : j === p ? " wrong" : "";
              return (
                <button
                  key={j}
                  className={`opt${cls}`}
                  disabled={p !== null}
                  onClick={() => setPicked((a) => a.map((x, k) => (k === i ? j : x)))}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {picked[i] !== null && <div className="why">{picked[i] === it.answer ? "✓ " : "✗ "}{it.why}</div>}
        </div>
      ))}
      {answered === items.length && (
        <p style={{ marginTop: 12 }}>
          Score: <b>{score}/{items.length}</b>{" "}
          <button className="pill-btn" onClick={() => setPicked(items.map(() => null))}>Retry</button>
        </p>
      )}
    </div>
  );
}
