import { useEffect, useRef, useState } from "react";

export function useReducedMotion() {
  const [r, setR] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

export function useInView<T extends Element>(ref: React.RefObject<T | null>) {
  const [v, setV] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setV(e.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return v;
}

/** rAF loop; cb gets (seconds since start, dt). Stops offscreen. */
export function useLoop(cb: (t: number, dt: number) => void, active: boolean) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const t0 = last;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cbRef.current((now - t0) / 1000, dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

/** exponential follow: move cur toward target with time constant tau (s). */
export function follow(cur: number, target: number, dt: number, tau = 0.18) {
  return target + (cur - target) * Math.exp(-dt / tau);
}

/**
 * Idle tour: calls step() every `every` seconds when nobody has touched
 * the figure for `idle` seconds. Returns poke() to mark interaction.
 */
export function useTour(step: () => void, active: boolean, every = 3.2, idle = 7) {
  const lastTouch = useRef(-1e9);
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      if (performance.now() - lastTouch.current > idle * 1000) stepRef.current();
    }, every * 1000);
    return () => window.clearInterval(id);
  }, [active, every, idle]);
  return () => {
    lastTouch.current = performance.now();
  };
}
