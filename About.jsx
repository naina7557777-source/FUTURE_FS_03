import { BUSINESS } from "../config/business";

const HIGHLIGHTS = [
  { icon: "🌱", title: "Locally sourced", text: "Produce and dairy from farms around Uttar Pradesh." },
  { icon: "🔥", title: "Small-batch roast", text: "Beans roasted in-house every morning." },
  { icon: "🥐", title: "Baked fresh", text: "Pastries and desserts made from scratch daily." },
];

export default function About() {
  return (
    <section id="about" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
      <div className="grid items-center gap-12 md:grid-cols-2 lg:gap-16">
        <div
          className="flex h-72 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-200 via-orange-100 to-stone-200 text-7xl shadow-xl sm:h-96 sm:text-8xl"
          aria-hidden="true"
        >
          ☕🥐
        </div>

        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl">
            More than just a café
          </h2>
          <p className="mt-5 leading-relaxed text-stone-600">
            {BUSINESS.name} opened in 2014 with one idea: good coffee and honest food bring
            people together. We work directly with growers, bake every morning and plate
            every dish to be enjoyed slowly.
          </p>
          <p className="mt-4 leading-relaxed text-stone-600">
            Whether you stop by for a quiet morning latte or book a candlelit dinner, we
            want the room to feel like yours.
          </p>

          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm ring-1 ring-stone-200">
                  {item.icon}
                </span>
                <div>
                  <p className="font-semibold text-stone-900">{item.title}</p>
                  <p className="text-sm text-stone-500">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
