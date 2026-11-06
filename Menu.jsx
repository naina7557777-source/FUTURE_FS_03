import { useState } from "react";

const CATEGORIES = ["All", "Coffee", "Desserts", "Mains"];

const MENU_ITEMS = [
  { id: 1, name: "Velvet Espresso", category: "Coffee", price: 180, emoji: "☕", desc: "Double-shot single-origin espresso with a silky crema and notes of dark cocoa." },
  { id: 2, name: "Honey Lavender Latte", category: "Coffee", price: 260, emoji: "🌸", desc: "Steamed oat milk, wildflower honey and house lavender syrup over a ristretto." },
  { id: 3, name: "Cold Brew Reserve", category: "Coffee", price: 240, emoji: "🧊", desc: "Steeped for 18 hours and served over hand-cut ice with a twist of orange peel." },
  { id: 4, name: "Salted Caramel Tart", category: "Desserts", price: 320, emoji: "🥧", desc: "Buttery shortcrust, molten salted caramel and dark chocolate ganache." },
  { id: 5, name: "Pistachio Tiramisu", category: "Desserts", price: 380, emoji: "🍰", desc: "Espresso-soaked sponge layered with mascarpone cream and roasted pistachio." },
  { id: 6, name: "Vanilla Crème Brûlée", category: "Desserts", price: 340, emoji: "🍮", desc: "Madagascan vanilla custard beneath a perfectly caramelised sugar crust." },
  { id: 7, name: "Truffle Mushroom Risotto", category: "Mains", price: 640, emoji: "🍄", desc: "Creamy arborio rice, wild mushrooms, parmesan and shaved black truffle." },
  { id: 8, name: "Herb-Crusted Salmon", category: "Mains", price: 780, emoji: "🐟", desc: "Pan-seared salmon with lemon beurre blanc and seasonal garden greens." },
  { id: 9, name: "Signature Wagyu Burger", category: "Mains", price: 720, emoji: "🍔", desc: "Wagyu patty, aged cheddar and caramelised onion jam on a toasted brioche bun." },
];

const formatPrice = (amount) => `₹${amount.toLocaleString("en-IN")}`;

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState("All");

  const visibleItems =
    activeCategory === "All"
      ? MENU_ITEMS
      : MENU_ITEMS.filter((item) => item.category === activeCategory);

  const countFor = (category) =>
    category === "All"
      ? MENU_ITEMS.length
      : MENU_ITEMS.filter((item) => item.category === category).length;

  return (
    <section id="menu" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-3xl font-bold text-stone-900 sm:text-5xl">
          Our menu
        </h2>
        <p className="mt-4 text-stone-500">
          From the first espresso of the morning to the last dessert of the night, these are
          the dishes our guests come back for.
        </p>
      </div>

      {/* Category filters */}
      <div
        className="mt-10 flex flex-wrap justify-center gap-3"
        role="tablist"
        aria-label="Filter menu by category"
      >
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(category)}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                isActive
                  ? "bg-stone-900 text-amber-400 shadow-md"
                  : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
              }`}
            >
              {category}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isActive ? "bg-amber-400/20 text-amber-300" : "bg-stone-100 text-stone-500"
                }`}
              >
                {countFor(category)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Menu grid */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => (
          <article
            key={item.id}
            className="group overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-stone-100 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-amber-100 via-orange-50 to-stone-100">
              <span className="text-6xl transition duration-300 group-hover:scale-110" aria-hidden="true">
                {item.emoji}
              </span>
              <span className="absolute right-4 top-4 rounded-full bg-stone-900 px-3 py-1 text-sm font-bold text-amber-400 shadow-lg">
                {formatPrice(item.price)}
              </span>
            </div>
            <div className="p-6">
              <p className="text-sm font-medium text-amber-700">{item.category}</p>
              <h3 className="mt-1 font-serif text-xl font-bold text-stone-900">{item.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">{item.desc}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
