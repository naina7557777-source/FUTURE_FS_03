// Constants and helpers used by the website. Bookings themselves live on the server (see server/index.js).
// Keep TIME_SLOTS, MAX_GUESTS and PRICING in sync with the same values in server/index.js.

export const TIME_SLOTS = [
  { id: "12:00", label: "12:00 PM" },
  { id: "14:00", label: "2:00 PM" },
  { id: "17:00", label: "5:00 PM" },
  { id: "19:00", label: "7:00 PM" },
  { id: "21:00", label: "9:00 PM" },
];

export const MAX_GUESTS = 10;

// Non-refundable deposit, charged per person when booking.
export const PRICING = {
  standardRate: 100, // ₹ per person for small parties
  familyRate: 80, // ₹ per person once the party reaches familyMinGuests
  familyMinGuests: 4,
};

export const calcDeposit = (guests) => {
  const count = Number(guests);
  if (!count || count < 1) return { rate: 0, total: 0, isFamilyOffer: false };
  const isFamilyOffer = count >= PRICING.familyMinGuests;
  const rate = isFamilyOffer ? PRICING.familyRate : PRICING.standardRate;
  return { rate, total: rate * count, isFamilyOffer };
};

// ---------- Formatting ----------

export const formatRupees = (amount) => `₹${Number(amount).toLocaleString("en-IN")}`;

export const slotLabel = (slotId) => TIME_SLOTS.find((slot) => slot.id === slotId)?.label ?? slotId;

// Returns a YYYY-MM-DD string in the user's local time zone
export const toDateInputValue = (date) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().split("T")[0];
};

export const formatDisplayDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// ---------- This device's booking codes ----------
// A customer's device remembers its own booking codes, so each customer only sees their own bookings.

const MY_CODES_KEY = "aurora-my-booking-codes";

export const loadMyCodes = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MY_CODES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveMyCodes = (codes) => {
  try {
    window.localStorage.setItem(MY_CODES_KEY, JSON.stringify(codes));
  } catch {
    // Storage can be unavailable (private mode or full); bookings still exist on the server.
  }
};

// ---------- Status badges ----------
// The server decides the status of each booking: upcoming, visited (checked in) or no-show.

export const STATUS_STYLES = {
  upcoming: { label: "Upcoming", className: "bg-amber-500/15 text-amber-300" },
  visited: { label: "✓ Visited", className: "bg-green-500/15 text-green-400" },
  "no-show": { label: "No-show", className: "bg-red-500/15 text-red-400" },
};
