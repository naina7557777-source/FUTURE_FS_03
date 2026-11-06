import express from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// ---------- Configuration ----------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data", "reservations.json");
const PORT = process.env.PORT || 5050;

// Staff login. Change these (or set the environment variables) before showing it to anyone.
const STAFF_USERNAME = process.env.STAFF_USERNAME || "staff";
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || "aurora123";
const SESSION_MS = 8 * 60 * 60 * 1000; // staff stay logged in for 8 hours

// Keep these in sync with src/lib/reservations.js (the website uses them to show prices and slots).
const TIME_SLOTS = ["12:00", "14:00", "17:00", "19:00", "21:00"];
const SLOT_CAPACITY = 24; // seats available in each time slot
const MAX_GUESTS = 10;
const PRICING = { standardRate: 100, familyRate: 80, familyMinGuests: 4 };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Storage (a JSON file; swap this for MongoDB later) ----------

const loadReservations = () => {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const reservations = loadReservations();

const saveReservations = () => {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(reservations, null, 2));
};

// ---------- Helpers ----------

const toDateString = (date) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().split("T")[0];
};

const todayString = () => toDateString(new Date());

const maxDateString = () => {
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() + 1);
  return toDateString(limit);
};

const isValidDateString = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

const formatLongDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const calcDeposit = (guests) => {
  const rate = guests >= PRICING.familyMinGuests ? PRICING.familyRate : PRICING.standardRate;
  return rate * guests;
};

// Demo numbers that stand in for other customers' bookings, so some slots look busy or full.
const demoOccupiedSeats = (date, slotId) => {
  const day = new Date(`${date}T00:00:00`);
  const weekday = day.getDay();
  const dayOfMonth = day.getDate();
  const slotIndex = TIME_SLOTS.indexOf(slotId);

  if ((weekday === 5 || weekday === 6) && (slotId === "19:00" || slotId === "21:00")) {
    return SLOT_CAPACITY; // Friday and Saturday evenings are sold out
  }
  if (dayOfMonth % 5 === 0 && slotId === "19:00") return SLOT_CAPACITY;

  return ((dayOfMonth * 7 + slotIndex * 13) % 10) * 2; // 0 to 18 seats taken
};

const seatsLeft = (date, slotId) => {
  const bookedHere = reservations
    .filter((item) => item.date === date && item.time === slotId)
    .reduce((sum, item) => sum + Number(item.guests), 0);
  return Math.max(SLOT_CAPACITY - demoOccupiedSeats(date, slotId) - bookedHere, 0);
};

const generateCode = () => {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alike characters (0/O, 1/I)
  let code;
  do {
    code =
      "AUR-" +
      Array.from({ length: 5 }, () => characters[crypto.randomInt(characters.length)]).join("");
  } while (reservations.some((item) => item.code === code));
  return code;
};

// visited = staff checked the customer in; no-show = date passed without a check-in
const present = (item) => {
  const today = todayString();
  let status = "upcoming";
  if (item.checkedInAt) status = "visited";
  else if (item.date < today) status = "no-show";
  return { ...item, status, isToday: item.date === today };
};

const validateBooking = (body) => {
  const errors = {};
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const date = String(body.date ?? "");
  const time = String(body.time ?? "");
  const guests = Number(body.guests);

  if (name.length < 2) errors.name = "Name must be at least 2 characters.";
  if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";

  if (!isValidDateString(date)) errors.date = "Choose a reservation date.";
  else if (date < todayString()) errors.date = "Choose today or a future date.";
  else if (date > maxDateString()) errors.date = "Reservations open up to one year ahead.";

  if (!TIME_SLOTS.includes(time)) errors.time = "Choose a time slot.";

  if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS) {
    errors.guests = `Choose between 1 and ${MAX_GUESTS} guests.`;
  }

  return { errors, values: { name, email, date, time, guests } };
};

// ---------- Staff sessions ----------

const sessions = new Map(); // token -> expiry time

const requireStaff = (req, res, next) => {
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const expires = sessions.get(token);
  if (!expires || expires < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: "Please log in again." });
  }
  return next();
};

// ---------- App ----------

const app = express();
app.use(express.json());

// Customer: seats left in every time slot for one date
app.get("/api/availability", (req, res) => {
  const date = String(req.query.date ?? "");
  if (!isValidDateString(date)) return res.status(400).json({ error: "Invalid date." });

  const slots = Object.fromEntries(TIME_SLOTS.map((slotId) => [slotId, seatsLeft(date, slotId)]));
  return res.json({ date, slots });
});

// Customer: create a booking (called after the deposit payment succeeds)
app.post("/api/reservations", (req, res) => {
  const { errors, values } = validateBooking(req.body ?? {});
  if (Object.keys(errors).length > 0) return res.status(400).json({ error: "Please check the form.", errors });

  if (seatsLeft(values.date, values.time) < values.guests) {
    return res.status(409).json({
      error: "Those seats were just taken.",
      errors: { time: "Those seats were just taken. Please choose another time." },
    });
  }

  const booking = {
    id: crypto.randomUUID(),
    code: generateCode(),
    ...values,
    deposit: calcDeposit(values.guests),
    paidAt: new Date().toISOString(),
    checkedInAt: null,
  };

  reservations.unshift(booking);
  saveReservations();
  return res.status(201).json(present(booking));
});

// Customer: fetch only their own bookings, using the codes saved on their device
app.get("/api/reservations/lookup", (req, res) => {
  const codes = String(req.query.codes ?? "")
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50);

  return res.json(reservations.filter((item) => codes.includes(item.code)).map(present));
});

// Customer: cancel a booking (the deposit is not refunded)
app.delete("/api/reservations/:code", (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const index = reservations.findIndex((item) => item.code === code);
  if (index === -1) return res.status(404).json({ error: "Booking not found." });

  const item = reservations[index];
  if (item.checkedInAt) return res.status(409).json({ error: "This booking is already checked in." });
  if (item.date < todayString()) return res.status(409).json({ error: "This booking date has passed." });

  reservations.splice(index, 1);
  saveReservations();
  return res.json({ ok: true });
});

// Staff: login
app.post("/api/staff/login", (req, res) => {
  const { username, password } = req.body ?? {};
  if (username !== STAFF_USERNAME || password !== STAFF_PASSWORD) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }

  const token = crypto.randomUUID();
  sessions.set(token, Date.now() + SESSION_MS);
  return res.json({ token });
});

// Staff: every booking
app.get("/api/staff/reservations", requireStaff, (req, res) => {
  res.json(reservations.map(present));
});

// Staff: check a customer in using their booking code
app.post("/api/staff/checkin", requireStaff, (req, res) => {
  const code = String(req.body?.code ?? "").trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "Enter a booking code." });

  const item = reservations.find((entry) => entry.code === code);
  if (!item) return res.status(404).json({ error: `No booking found for ${code}.` });
  if (item.checkedInAt) return res.status(409).json({ error: `${item.name} is already checked in.` });
  if (item.date !== todayString()) {
    return res.status(409).json({ error: `This booking is for ${formatLongDate(item.date)}, not today.` });
  }

  item.checkedInAt = new Date().toISOString();
  saveReservations();
  return res.json(present(item));
});

app.listen(PORT, () => {
  console.log(`Cardamom & Crema API running on http://localhost:${PORT}`);
});
