import { useState, useEffect } from "react";
import { BUSINESS } from "../config/business";

/**
 * Animates a number from 0 to `target`.
 * Respects the user's "reduced motion" preference by jumping straight to the target.
 */
function useCountUp(target, duration = 1800, decimals = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setValue(target);
      return undefined;
    }

    let frameId;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(target * eased);
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return decimals > 0
    ? value.toFixed(decimals)
    : Math.round(value).toLocaleString("en-IN");
}

function Stat({ target, suffix = "", decimals = 0, label }) {
  const count = useCountUp(target, 1800, decimals);

  return (
    <div className="text-center">
      <p className="font-serif text-3xl font-bold text-amber-400 sm:text-4xl">
        {count}
        {suffix}
      </p>
      <p className="mt-1 text-xs font-medium tracking-wide text-stone-400 sm:text-sm">{label}</p>
    </div>
  );
}

const STATS = [
  { target: 12, suffix: "+", label: "Years of craft" },
  { target: 4.9, suffix: "★", decimals: 1, label: "Guest rating" },
  { target: 30, suffix: "+", label: "Signature dishes" },
  { target: 5000, suffix: "+", label: "Happy guests" },
];

export default function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen scroll-mt-20 items-center justify-center overflow-hidden bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 px-4 pb-16 pt-28 sm:px-6"
    >
      {/* Floating background gradients */}
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 animate-pulse rounded-full bg-amber-500/20 blur-3xl sm:h-96 sm:w-96" />
      <div className="pointer-events-none absolute -right-24 bottom-16 h-72 w-72 animate-pulse rounded-full bg-orange-700/25 blur-3xl delay-1000 sm:h-96 sm:w-96" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-yellow-600/10 blur-3xl delay-500 sm:h-[28rem] sm:w-[28rem]" />

      <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
        <p className="mb-5 inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-medium tracking-wide text-amber-300 sm:text-sm">
          Freshly roasted daily in {BUSINESS.city}
        </p>

        <h1 className="font-serif text-4xl font-bold leading-tight text-white sm:text-6xl md:text-7xl">
          Where every cup
          <br className="hidden sm:block" /> tells a story
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-stone-300 sm:text-lg">
          Hand-roasted single-origin coffee, seasonal plates and slow-baked desserts, served
          in a warm space made for long conversations.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#reservations"
            className="w-full rounded-full bg-amber-500 px-8 py-4 text-base font-semibold text-stone-950 shadow-lg shadow-amber-500/30 transition duration-200 hover:-translate-y-0.5 hover:bg-amber-400 sm:w-auto"
          >
            Book a Table
          </a>
          <a
            href="#menu"
            className="w-full rounded-full border border-white/30 px-8 py-4 text-base font-semibold text-white transition duration-200 hover:border-amber-400 hover:text-amber-400 sm:w-auto"
          >
            View the Menu
          </a>
        </div>

        {/* Stats counters */}
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 border-t border-white/10 pt-10 sm:grid-cols-4">
          {STATS.map((stat) => (
            <Stat key={stat.label} {...stat} />
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#menu"
        aria-label="Scroll to menu"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 animate-bounce text-stone-400 transition-colors hover:text-amber-400 sm:block"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </a>
    </section>
  );
}
