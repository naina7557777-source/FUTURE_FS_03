import { BUSINESS } from "../config/business";

const QUICK_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Menu", href: "#menu" },
  { label: "Reservations", href: "#reservations" },
  { label: "About", href: "#about" },
];

// Index matches Date.getDay(): 0 = Sunday ... 6 = Saturday
const OPENING_HOURS = [
  { day: "Sunday", hours: "8:00 AM – 9:00 PM" },
  { day: "Monday", hours: "7:00 AM – 10:00 PM" },
  { day: "Tuesday", hours: "7:00 AM – 10:00 PM" },
  { day: "Wednesday", hours: "7:00 AM – 10:00 PM" },
  { day: "Thursday", hours: "7:00 AM – 10:00 PM" },
  { day: "Friday", hours: "7:00 AM – 11:00 PM" },
  { day: "Saturday", hours: "8:00 AM – 11:00 PM" },
];

export default function Footer() {
  const todayIndex = new Date().getDay();
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="scroll-mt-20 bg-stone-950 px-4 pt-16 text-stone-400 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-12 pb-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <a href="#home" className="flex items-center gap-3" aria-label={`${BUSINESS.name} home`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-xl">
              ☕
            </span>
            <span className="font-serif text-xl font-bold text-white">
              {BUSINESS.brand.first}
              <span className="text-amber-400"> {BUSINESS.brand.rest}</span>
            </span>
          </a>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Premium coffee, thoughtful plates and a place to slow down in the heart of{" "}
            {BUSINESS.city}.
          </p>
        </div>

        {/* Opening hours */}
        <div>
          <h3 className="mb-4 text-base font-semibold text-white">Opening hours</h3>
          <div className="grid gap-1 text-sm">
            {OPENING_HOURS.map((entry, index) => {
              const isToday = index === todayIndex;
              return (
                <div
                  key={entry.day}
                  className={`flex justify-between gap-4 rounded-md px-2 py-1.5 ${
                    isToday ? "bg-amber-500/10 text-amber-300" : ""
                  }`}
                >
                  <span className={isToday ? "font-semibold" : ""}>{entry.day}</span>
                  <span>{entry.hours}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="mb-4 text-base font-semibold text-white">Quick links</h3>
          <ul className="space-y-3 text-sm">
            {QUICK_LINKS.map((link) => (
              <li key={link.label}>
                <a href={link.href} className="transition-colors duration-200 hover:text-amber-400">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Location */}
        <div>
          <h3 className="mb-4 text-base font-semibold text-white">Find us</h3>

          {BUSINESS.mapEmbedUrl ? (
            <iframe
              title={`${BUSINESS.name} on the map`}
              src={BUSINESS.mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-32 w-full rounded-xl border-0"
            />
          ) : (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-stone-700 bg-stone-900 text-center">
              <span className="text-3xl" aria-hidden="true">📍</span>
              <span className="mt-1 text-xs text-stone-500">Map placeholder</span>
            </div>
          )}

          <address className="mt-4 text-sm not-italic leading-relaxed">
            {BUSINESS.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            {BUSINESS.phone && (
              <a
                href={`tel:${BUSINESS.phone.replace(/[^\d+]/g, "")}`}
                className="mt-2 inline-block transition-colors hover:text-amber-400"
              >
                {BUSINESS.phone}
              </a>
            )}
          </address>
        </div>
      </div>

      <div className="border-t border-stone-800 py-6 text-center text-xs text-stone-500">
        © {year} {BUSINESS.name}. All rights reserved.
      </div>
    </footer>
  );
}
