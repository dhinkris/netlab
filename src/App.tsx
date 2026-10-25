import { Suspense, useEffect, useMemo, useState } from "react";
import { CURRICULUM, flatLessons } from "./content/curriculum";
import { LESSONS } from "./lessons";

type Route = { topic?: string; lesson?: string };

function parseHash(): Route {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { topic: parts[0], lesson: parts[1] };
}

const store = {
  get(k: string) {
    try { return window.localStorage.getItem(k); } catch { return null; }
  },
  set(k: string, v: string) {
    try { window.localStorage.setItem(k, v); } catch { /* storage unavailable */ }
  },
};

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash);
  const [theme, setTheme] = useState<string>(() => store.get("netlab.theme") ?? "dark");
  const [done, setDone] = useState<Set<string>>(() => new Set(JSON.parse(store.get("netlab.done") ?? "[]")));
  const [open, setOpen] = useState<Set<string>>(() => new Set(["fundamentals"]));
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const on = () => { setRoute(parseHash()); setMenu(false); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    store.set("netlab.theme", theme);
  }, [theme]);

  useEffect(() => {
    if (route.topic) setOpen((o) => new Set(o).add(route.topic!));
  }, [route.topic]);

  const flat = useMemo(() => flatLessons(), []);
  const key = route.topic && route.lesson ? `${route.topic}/${route.lesson}` : "";
  const idx = flat.findIndex((f) => `${f.topic.slug}/${f.lesson.slug}` === key);

  const markDone = (k: string, v = true) => {
    setDone((d) => {
      const n = new Set(d);
      if (v) n.add(k); else n.delete(k);
      store.set("netlab.done", JSON.stringify([...n]));
      return n;
    });
  };

  const total = flat.length;
  const nDone = flat.filter((f) => done.has(`${f.topic.slug}/${f.lesson.slug}`)).length;
  const ql = q.trim().toLowerCase();

  const sidebar = (
    <nav className={`side${menu ? " open" : ""}`} aria-label="Topics">
      <a className="brand" href="#/" style={{ textDecoration: "none" }}>
        <BrandMark />
        <div><b>NetLab</b><small>Networking, end to end</small></div>
      </a>
      <input className="side-search" placeholder="Search lessons…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search lessons" />
      {CURRICULUM.map((t, ti) => {
        const lessons = t.lessons.filter((l) => !ql || l.title.toLowerCase().includes(ql) || l.blurb.toLowerCase().includes(ql));
        if (ql && !lessons.length && !t.title.toLowerCase().includes(ql)) return null;
        const isOpen = open.has(t.slug) || !!ql;
        return (
          <div className="topic" key={t.slug}>
            <button
              className="topic-btn"
              onClick={() => {
                if (!t.ready) { window.location.hash = `#/${t.slug}`; return; }
                setOpen((o) => { const n = new Set(o); if (n.has(t.slug)) n.delete(t.slug); else n.add(t.slug); return n; });
              }}
              aria-expanded={t.ready ? isOpen : undefined}
            >
              <span className={`topic-num c-${t.hue}`}>{String(ti + 1).padStart(2, "0")}</span>
              <span className="topic-name">{t.title}</span>
              {t.ready ? <span className={`chev${isOpen ? " open" : ""}`}>▶</span> : <span className="topic-soon">soon</span>}
            </button>
            {t.ready && isOpen && (
              <ul className="lessons">
                {lessons.map((l) => {
                  const k = `${t.slug}/${l.slug}`;
                  return (
                    <li key={l.slug}>
                      <a href={`#/${k}`} className={k === key ? "active" : ""} aria-current={k === key ? "page" : undefined} style={{ "--accent": `var(--c-${l.hue})` } as React.CSSProperties}>
                        <span className={`tick${done.has(k) ? " done" : ""}`} />
                        {l.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
      <div className="side-foot">
        <div className="progress">
          {nDone}/{total} lessons done
          <div className="progress-bar"><span style={{ width: `${(nDone / Math.max(1, total)) * 100}%` }} /></div>
        </div>
        <button className="pill-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
          {theme === "dark" ? "☀ Light" : "☾ Dark"}
        </button>
      </div>
    </nav>
  );

  let body: React.ReactNode;
  const topic = CURRICULUM.find((t) => t.slug === route.topic);
  if (idx >= 0) {
    const f = flat[idx];
    const Lesson = LESSONS[key];
    const prev = flat[idx - 1], next = flat[idx + 1];
    body = (
      <article className="lesson" style={{ "--accent": `var(--c-${f.lesson.hue})` } as React.CSSProperties}>
        <div className="crumbs"><a href="#/">Topics</a> / <a href={`#/${f.topic.slug}`}>{f.topic.title}</a> / {f.lesson.title}</div>
        {Lesson ? <Suspense fallback={<p className="lede">Loading lesson…</p>}><Lesson /></Suspense> : <p>Coming soon.</p>}
        <div style={{ marginTop: 32 }}>
          <button className="pill-btn" onClick={() => markDone(key, !done.has(key))}>
            {done.has(key) ? "✓ Marked as done" : "Mark lesson as done"}
          </button>
        </div>
        <div className="pager">
          {prev ? <a href={`#/${prev.topic.slug}/${prev.lesson.slug}`}><small>← Previous</small>{prev.lesson.title}</a> : <span style={{ flex: 1 }} />}
          {next ? <a className="next" href={`#/${next.topic.slug}/${next.lesson.slug}`}><small>Next →</small>{next.lesson.title}</a> : <span style={{ flex: 1 }} />}
        </div>
      </article>
    );
  } else if (topic) {
    body = (
      <article className="lesson">
        <div className="crumbs"><a href="#/">Topics</a> / {topic.title}</div>
        <h1>{topic.title}</h1>
        <p className="lede">{topic.blurb}</p>
        {topic.ready ? (
          <div className="grid">
            {topic.lessons.map((l, i) => (
              <a className="tile" key={l.slug} href={`#/${topic.slug}/${l.slug}`} style={{ "--tile-c": `var(--c-${l.hue})` } as React.CSSProperties}>
                <span className="k">Lesson {i + 1}{done.has(`${topic.slug}/${l.slug}`) ? " · ✓ done" : ""}</span>
                <h3>{l.title}</h3>
                <p>{l.blurb}</p>
              </a>
            ))}
          </div>
        ) : (
          <div className="callout">This topic is on the roadmap. Start with <a href="#/fundamentals">Fundamentals</a>.</div>
        )}
      </article>
    );
  } else {
    body = (
      <article className="lesson">
        <h1>Networking, end to end</h1>
        <p className="lede">
          From bits on a wire to cloud virtual networks. Each lesson is built around an interactive machine you can play with: the way it moves is the way the network works.
        </p>
        <div className="grid">
          {CURRICULUM.map((t, i) => (
            <a className={`tile${t.ready ? "" : " soon"}`} key={t.slug} href={t.ready ? `#/${t.slug}/${t.lessons[0].slug}` : `#/${t.slug}`} style={{ "--tile-c": `var(--c-${t.hue})` } as React.CSSProperties}>
              <span className="k">{String(i + 1).padStart(2, "0")} · {t.ready ? `${t.lessons.length} lessons` : "coming soon"}</span>
              <h3>{t.title}</h3>
              <p>{t.blurb}</p>
            </a>
          ))}
        </div>
      </article>
    );
  }

  return (
    <div className="app">
      {sidebar}
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <div style={{ minWidth: 0 }}>
        <div className="topbar">
          <button className="pill-btn" onClick={() => setMenu(true)} aria-label="Open menu">☰</button>
          <b>NetLab</b>
        </div>
        <main className="main">{body}</main>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 26 26" aria-hidden>
      <path d="M13 2 L24 8 L13 14 L2 8 Z" fill="var(--hi-t)" stroke="var(--edge)" strokeWidth="0.8" />
      <path d="M2 8 L13 14 L13 24 L2 18 Z" fill="var(--mid-l)" stroke="var(--edge)" strokeWidth="0.8" />
      <path d="M24 8 L13 14 L13 24 L24 18 Z" fill="var(--mid-d)" stroke="var(--edge)" strokeWidth="0.8" />
      <circle cx="13" cy="8" r="1.6" fill="var(--accent)" />
    </svg>
  );
}
