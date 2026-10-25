import { useRef, useState } from "react";
import { frameAt, totalOf, type Seg } from "./kit";
import { useLoop } from "./live";

/**
 * Plays a scripted timeline: whenever `runKey` changes the clock restarts,
 * and the current frame is returned. Stops updating once the script ends.
 */
export function useScript<F>(segs: Seg<F>[], runKey: unknown, active: boolean, reduced: boolean, initial: F) {
  const [fr, setFr] = useState<F>(initial);
  const live = useRef({ t: 0, key: undefined as unknown, done: false });
  useLoop((_t, dt) => {
    const L = live.current;
    if (L.key !== runKey) { L.key = runKey; L.t = 0; L.done = false; }
    if (L.done) return;
    const T = totalOf(segs);
    L.t = reduced ? T : Math.min(T, L.t + dt);
    setFr(frameAt(segs, L.t).fr);
    if (L.t >= T) L.done = true;
  }, active);
  return fr;
}

/** Split "Headline · detail · detail" into a bold headline and the rest. */
export function splitSay(say: string) {
  const [head, ...rest] = say.split(" · ");
  return { head, rest };
}
