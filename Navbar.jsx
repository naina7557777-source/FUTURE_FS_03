import { useState, useEffect } from "react";
import { BUSINESS } from "../config/business";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Menu", href: "#menu" },
  { label: "Reservations", href: "#reservations" },
  { label: "About", href: "#about" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Add a solid background once the page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu automatically when resizing to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled || open
          ? "border-white/10 bg-stone-950/95 shadow-lg backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        {/* Logo */}
        <a href="#home" className="flex items-center gap-3" aria-label={`${BUSINESS.name} home`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-xl shadow-md shadow-amber-500/30">
            ☕
          </span>
          <span className="font-serif text-xl font-bold tracking-wide text-white sm:text-2xl">
            {BUSINESS.brand.first}
            <span className="text-amber-400"> {BUSINESS.brand.rest}</span>
          </span>
        </a>

        {/* Desktop menu */}
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium tracking-wide text-stone-300 transition-colors duration-200 hover:text-amber-400"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/?view=staff"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-stone-300 transition duration-200 hover:border-amber-400 hover:text-amber-400"
          >
            Staff
          </a>
          <a
            href="#reservations"
            className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-stone-950 shadow-md shadow-amber-500/20 transition duration-200 hover:-translate-y-0.5 hover:bg-amber-400"
          >
            Book a Table
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="relative flex h-10 w-10 items-center justify-center rounded-md text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 lg:hidden"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          <span
            className={`absolute block h-0.5 w-6 bg-current transition-all duration-300 ${
              open ? "rotate-45" : "-translate-y-2"
            }`}
          />
          <span
            className={`absolute block h-0.5 w-6 bg-current transition-all duration-300 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute block h-0.5 w-6 bg-current transition-all duration-300 ${
              open ? "-rotate-45" : "translate-y-2"
            }`}
          />
        </button>
      </div>

      {/* Mobile menu panel */}
      <div
        id="mobile-menu"
        className={`overflow-hidden transition-all duration-300 ease-in-out lg:hidden ${
          open ? "max-h-[28rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col gap-1 px-4 pb-6 pt-2 sm:px-6" aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-base font-medium text-stone-200 transition-colors hover:bg-white/5 hover:text-amber-400"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/?view=staff"
            className="rounded-lg px-3 py-3 text-base font-medium text-stone-400 transition-colors hover:bg-white/5 hover:text-amber-400"
          >
            Staff login
          </a>
          <a
            href="#reservations"
            onClick={() => setOpen(false)}
            className="mt-3 rounded-full bg-amber-500 px-6 py-3 text-center text-base font-semibold text-stone-950 transition hover:bg-amber-400"
          >
            Book a Table
          </a>
        </nav>
      </div>
    </header>
  );
}
