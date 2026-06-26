/* Aminy motion helpers — shared across UI kits. Honors prefers-reduced-motion.
   Attaches window.AminyMotion: { useCountUp, Reveal, Thinking, useInView }. */
(function () {
  const R = React;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Animate a number from 0 → target once it mounts (or when `play` flips true).
  function useCountUp(target, { duration = 900, play = true, decimals = 0 } = {}) {
    const [val, setVal] = R.useState(reduce ? target : 0);
    R.useEffect(() => {
      if (!play) return;
      if (reduce) { setVal(target); return; }
      let raf, start;
      const tick = (t) => {
        if (start == null) start = t;
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        setVal(target * eased);
        if (p < 1) raf = requestAnimationFrame(tick);
        else setVal(target);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [target, play, duration]);
    return decimals ? Number(val).toFixed(decimals) : Math.round(val);
  }

  // Fade/rise a block in on mount, with optional stagger delay.
  function Reveal({ children, delay = 0, y = 8, style = {}, as = "div", ...rest }) {
    const Tag = as;
    const base = reduce
      ? {}
      : { animation: `aminy-rise var(--dur-slow) var(--ease-lift) both`, animationDelay: `${delay}ms` };
    return <Tag style={{ ...base, ...style }} {...rest}>{children}</Tag>;
  }

  // The "Aminy is thinking" dot pulse — calm, not a spinner.
  function Thinking({ color = "var(--aminy-teal-500)", label = "Aminy is thinking" }) {
    return (
      <div role="status" aria-label={label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 7, height: 7, borderRadius: 999, background: color,
            animation: reduce ? "none" : `aminy-think 1s ease-in-out ${i * 0.18}s infinite`,
            opacity: reduce ? 0.6 : undefined }} />
        ))}
      </div>
    );
  }

  // Fire `onEnter` once the node scrolls into view (for count-ups in scroll regions).
  function useInView(opts) {
    const ref = R.useRef(null);
    const [seen, setSeen] = R.useState(false);
    R.useEffect(() => {
      if (reduce || !ref.current || !("IntersectionObserver" in window)) { setSeen(true); return; }
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, opts || { threshold: 0.4 });
      io.observe(ref.current);
      return () => io.disconnect();
    }, []);
    return [ref, seen];
  }

  window.AminyMotion = { useCountUp, Reveal, Thinking, useInView, reduce };
})();
