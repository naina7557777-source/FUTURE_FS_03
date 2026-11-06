import { useState, useEffect, useCallback } from "react";
import {
  TIME_SLOTS,
  MAX_GUESTS,
  PRICING,
  STATUS_STYLES,
  calcDeposit,
  loadMyCodes,
  saveMyCodes,
  toDateInputValue,
  formatDisplayDate,
  formatRupees,
  slotLabel,
} from "../lib/reservations";
import { getAvailability, createReservation, lookupReservations, cancelReservation } from "../lib/api";

const INITIAL_FORM = { name: "", email: "", date: "", time: "", guests: "2", agree: false };
const GUEST_OPTIONS = Array.from({ length: MAX_GUESTS }, (_, index) => index + 1);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Reservation() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [myBookings, setMyBookings] = useState([]);
  const [availability, setAvailability] = useState(null); // seats left per slot for the chosen date
  const [availabilityError, setAvailabilityError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [booking, setBooking] = useState(null);

  const today = toDateInputValue(new Date());
  const maxDateObj = new Date();
  maxDateObj.setFullYear(maxDateObj.getFullYear() + 1);
  const maxDate = toDateInputValue(maxDateObj);

  const dateIsValid = Boolean(form.date) && form.date >= today && form.date <= maxDate;
  const deposit = calcDeposit(form.guests);
  const guestCount = Number(form.guests);

  // Seat availability for every time slot on the chosen date
  const slotInfos = TIME_SLOTS.map((slot) => {
    const left = availability ? availability[slot.id] ?? 0 : 0;
    if (left === 0) return { slot, disabled: true, note: "Full" };
    if (left < guestCount) return { slot, disabled: true, note: `Only ${left} left` };
    return { slot, disabled: false, note: `${left} seats left` };
  });
  const everySlotUnavailable = Boolean(availability) && slotInfos.every((info) => info.disabled);

  // Load this customer's own bookings from the server, and refresh every few seconds
  // so a staff check-in shows up as "Visited" automatically.
  const refreshMyBookings = useCallback(async () => {
    const codes = loadMyCodes();
    try {
      const list = await lookupReservations(codes);
      setMyBookings(list);
      setServerError("");

      // Forget codes the server no longer knows (for example, after a reset)
      const found = new Set(list.map((item) => item.code));
      const stale = codes.filter((code) => !found.has(code));
      if (stale.length > 0) {
        saveMyCodes(loadMyCodes().filter((code) => !stale.includes(code)));
      }
    } catch (error) {
      setServerError(error.message);
    }
  }, []);

  useEffect(() => {
    refreshMyBookings();
    const timer = setInterval(refreshMyBookings, 5000);
    return () => clearInterval(timer);
  }, [refreshMyBookings]);

  // Load live seat availability whenever the date changes, and refresh while it stays selected
  useEffect(() => {
    setAvailability(null);
    setAvailabilityError("");
    if (!dateIsValid) return undefined;

    let cancelled = false;
    const load = async () => {
      try {
        const data = await getAvailability(form.date);
        if (!cancelled) {
          setAvailability(data.slots);
          setAvailabilityError("");
        }
      } catch (error) {
        if (!cancelled) setAvailabilityError(error.message);
      }
    };

    load();
    const timer = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [form.date, dateIsValid]);

  // Close modals with Escape and lock page scroll while one is open
  const modalOpen = showPayment || showSuccess;
  useEffect(() => {
    if (!modalOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (showSuccess) setShowSuccess(false);
      else if (!isPaying) setShowPayment(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen, showSuccess, isPaying]);

  const validate = (values) => {
    const result = {};

    if (!values.name.trim()) result.name = "Enter your full name.";
    else if (values.name.trim().length < 2) result.name = "Name must be at least 2 characters.";

    if (!values.email.trim()) result.email = "Enter your email address.";
    else if (!EMAIL_PATTERN.test(values.email.trim()))
      result.email = "Enter a valid email address, like name@example.com.";

    if (!values.date) result.date = "Choose a reservation date.";
    else if (values.date < today) result.date = "Choose today or a future date.";
    else if (values.date > maxDate) result.date = "Reservations open up to one year ahead.";

    if (!values.time) result.time = "Choose a time slot.";

    const guests = Number(values.guests);
    if (!values.guests || Number.isNaN(guests) || guests < 1 || guests > MAX_GUESTS)
      result.guests = `Choose between 1 and ${MAX_GUESTS} guests.`;

    if (!values.agree) result.agree = "Please accept the non-refundable deposit to continue.";

    return result;
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

    setForm((prev) => {
      const next = { ...prev, [name]: nextValue };
      // A new date means new availability, so the time must be chosen again
      if (name === "date") next.time = "";
      // Drop the chosen time if the new guest count leaves too few seats
      if (name === "guests" && next.time && availability && (availability[next.time] ?? 0) < Number(next.guests)) {
        next.time = "";
      }
      return next;
    });

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const selectSlot = (slotId) => {
    setForm((prev) => ({ ...prev, time: slotId }));
    if (errors.time) setErrors((prev) => ({ ...prev, time: "" }));
  };

  // Step 1: validate the form, then open the (demo) payment window
  const handleSubmit = (event) => {
    event.preventDefault();
    if (isPaying) return;

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setServerError("");
    setShowPayment(true);
  };

  // Step 2: simulated payment, then the server creates the booking
  const handlePay = async () => {
    if (isPaying) return;
    setIsPaying(true);

    try {
      // Simulated payment. A real version would open Razorpay Checkout here and the server
      // would verify the payment before creating the booking.
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const created = await createReservation({
        name: form.name.trim(),
        email: form.email.trim(),
        date: form.date,
        time: form.time,
        guests: Number(form.guests),
      });

      saveMyCodes([created.code, ...loadMyCodes()]);
      setMyBookings((prev) => [created, ...prev]);
      setBooking(created);
      setShowPayment(false);
      setShowSuccess(true);
      setForm(INITIAL_FORM);
      setErrors({});
    } catch (error) {
      setShowPayment(false);

      if (error.fieldErrors) {
        setErrors(error.fieldErrors);
        if (error.fieldErrors.time) {
          // The slot filled up while the customer was paying: refresh seats and clear the choice
          setForm((prev) => ({ ...prev, time: "" }));
          getAvailability(form.date)
            .then((data) => setAvailability(data.slots))
            .catch(() => {});
        }
      } else {
        setServerError(error.message);
      }
    } finally {
      setIsPaying(false);
    }
  };

  const handleCancel = async (item) => {
    const confirmed = window.confirm(
      `Cancel this reservation? Your deposit of ${formatRupees(item.deposit)} is non-refundable.`
    );
    if (!confirmed) return;

    try {
      await cancelReservation(item.code);
      saveMyCodes(loadMyCodes().filter((code) => code !== item.code));
      setMyBookings((prev) => prev.filter((entry) => entry.code !== item.code));
      setServerError("");
    } catch (error) {
      setServerError(error.message);
    }
  };

  const fieldClass = (field) =>
    `w-full rounded-lg border bg-white px-4 py-3 text-stone-800 placeholder-stone-400 shadow-sm outline-none transition focus:ring-2 ${
      errors[field]
        ? "border-red-400 focus:ring-red-400"
        : "border-stone-300 focus:border-amber-500 focus:ring-amber-500"
    }`;

  const slotClass = (info, selected) => {
    if (info.disabled) return "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400";
    if (selected) return "border-amber-500 bg-amber-50 text-stone-900 ring-2 ring-amber-500";
    return "border-stone-300 bg-white text-stone-700 hover:border-amber-500";
  };

  return (
    <section
      id="reservations"
      className="scroll-mt-20 bg-stone-900 px-4 py-20 sm:px-6 sm:py-24"
    >
      <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left column: copy */}
        <div className="lg:pt-6">
          <h2 className="font-serif text-3xl font-bold text-white sm:text-5xl">
            Reserve your table
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-stone-300">
            Planning a quiet dinner or a celebration with friends? Pick a time, pay a small
            deposit and your table is ours to keep until you arrive.
          </p>
          <ul className="mt-8 space-y-4 text-stone-300">
            {[
              "Live seat availability for every time slot",
              `Deposit of ${formatRupees(PRICING.standardRate)} per person, non-refundable`,
              `Family offer: ${formatRupees(PRICING.familyRate)} per person for ${PRICING.familyMinGuests} or more guests`,
              "Show your booking code at the entrance to check in",
            ].map((text) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm text-amber-400">✓</span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Right column: form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-2xl bg-stone-50 p-6 shadow-2xl sm:p-8"
          aria-label="Table reservation form"
        >
          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-stone-700">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Aarav Sharma"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : undefined}
                className={fieldClass("name")}
              />
              {errors.name && (
                <p id="name-error" role="alert" className="mt-1.5 text-sm text-red-600">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-stone-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="aarav@example.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                className={fieldClass("email")}
              />
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1.5 text-sm text-red-600">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="date" className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Date
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  min={today}
                  max={maxDate}
                  value={form.date}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.date)}
                  aria-describedby={errors.date ? "date-error" : undefined}
                  className={fieldClass("date")}
                />
                {errors.date && (
                  <p id="date-error" role="alert" className="mt-1.5 text-sm text-red-600">
                    {errors.date}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="guests" className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Guests
                </label>
                <select
                  id="guests"
                  name="guests"
                  value={form.guests}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.guests)}
                  aria-describedby={errors.guests ? "guests-error" : undefined}
                  className={fieldClass("guests")}
                >
                  {GUEST_OPTIONS.map((count) => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </select>
                {errors.guests && (
                  <p id="guests-error" role="alert" className="mt-1.5 text-sm text-red-600">
                    {errors.guests}
                  </p>
                )}
              </div>
            </div>

            {/* Time slots with live seat availability */}
            <fieldset>
              <legend className="mb-1.5 block text-sm font-semibold text-stone-700">Time</legend>

              {!dateIsValid ? (
                <p className="rounded-lg border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500">
                  Pick a valid date to see available times.
                </p>
              ) : availabilityError ? (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {availabilityError}
                </p>
              ) : !availability ? (
                <p className="rounded-lg border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500">
                  Checking availability...
                </p>
              ) : (
                <div
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                  role="radiogroup"
                  aria-label="Choose a time slot"
                >
                  {slotInfos.map((info) => {
                    const selected = form.time === info.slot.id;
                    return (
                      <button
                        key={info.slot.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={info.disabled}
                        onClick={() => selectSlot(info.slot.id)}
                        className={`rounded-lg border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${slotClass(info, selected)}`}
                      >
                        <span className="block text-sm font-semibold">{info.slot.label}</span>
                        <span className={`block text-xs ${info.disabled ? "text-red-500" : "text-stone-500"}`}>
                          {info.note}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {everySlotUnavailable && (
                <p className="mt-2 text-sm text-red-600">
                  No tables are available on this date for {guestCount}{" "}
                  {guestCount === 1 ? "guest" : "guests"}. Please try another date.
                </p>
              )}
              {errors.time && (
                <p role="alert" className="mt-1.5 text-sm text-red-600">
                  {errors.time}
                </p>
              )}
            </fieldset>

            {/* Deposit summary */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-stone-700">
                  Booking deposit ({guestCount} × {formatRupees(deposit.rate)})
                </span>
                <span className="font-serif text-xl font-bold text-stone-900">
                  {formatRupees(deposit.total)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                {deposit.isFamilyOffer
                  ? `Family offer applied: ${formatRupees(PRICING.familyRate)} per person instead of ${formatRupees(PRICING.standardRate)}.`
                  : `Book for ${PRICING.familyMinGuests} or more guests and pay only ${formatRupees(PRICING.familyRate)} per person.`}
              </p>
            </div>

            <div>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-stone-600">
                <input
                  type="checkbox"
                  name="agree"
                  checked={form.agree}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.agree)}
                  className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-amber-500"
                />
                <span>
                  I understand the deposit is <strong>non-refundable</strong>, even if I cancel
                  or don't show up.
                </span>
              </label>
              {errors.agree && (
                <p role="alert" className="mt-1.5 text-sm text-red-600">
                  {errors.agree}
                </p>
              )}
            </div>

            {serverError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-amber-500 px-6 py-4 font-semibold text-stone-950 shadow-lg transition duration-200 hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
            >
              Pay {formatRupees(deposit.total)} &amp; confirm
            </button>
          </div>
        </form>
      </div>

      {/* This customer's own reservations */}
      {myBookings.length > 0 && (
        <div className="mx-auto mt-16 max-w-6xl">
          <h3 className="font-serif text-2xl font-bold text-white">
            Your reservations{" "}
            <span className="ml-1 rounded-full bg-amber-500/20 px-3 py-1 text-sm font-semibold text-amber-300">
              {myBookings.length}
            </span>
          </h3>
          <p className="mt-2 text-sm text-stone-400">
            Show your booking code to our staff at the entrance. Your status changes to
            "Visited" once you're checked in.
          </p>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myBookings.map((item) => {
              const style = STATUS_STYLES[item.status];
              return (
                <li key={item.code} className="rounded-xl bg-stone-800 p-5 ring-1 ring-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{item.name}</p>
                      <p className="truncate text-sm text-stone-400">{item.email}</p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}>
                      {style.label}
                    </span>
                  </div>

                  <p className="mt-4 rounded-lg bg-stone-900 px-3 py-2 text-center font-mono text-lg font-bold tracking-widest text-amber-300">
                    {item.code}
                  </p>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-stone-500">Date</dt>
                      <dd className="mt-0.5 font-medium text-stone-200">{formatDisplayDate(item.date)}</dd>
                    </div>
                    <div>
                      <dt className="text-stone-500">Time</dt>
                      <dd className="mt-0.5 font-medium text-stone-200">{slotLabel(item.time)}</dd>
                    </div>
                    <div>
                      <dt className="text-stone-500">Guests</dt>
                      <dd className="mt-0.5 font-medium text-stone-200">{item.guests}</dd>
                    </div>
                    <div>
                      <dt className="text-stone-500">Deposit paid</dt>
                      <dd className="mt-0.5 font-medium text-stone-200">{formatRupees(item.deposit)}</dd>
                    </div>
                  </dl>

                  {item.status === "upcoming" && (
                    <button
                      type="button"
                      onClick={() => handleCancel(item)}
                      aria-label={`Cancel reservation for ${item.name}`}
                      className="mt-4 w-full rounded-md border border-white/10 px-3 py-2 text-sm text-stone-400 transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    >
                      Cancel reservation
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Demo payment modal */}
      {showPayment && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-title"
          onClick={() => {
            if (!isPaying) setShowPayment(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
              Demo payment. No real money is charged.
            </p>

            <h3 id="payment-title" className="mt-5 font-serif text-2xl font-bold text-stone-900">
              Pay your booking deposit
            </h3>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Table for</dt>
                <dd className="text-right font-medium text-stone-900">
                  {guestCount} {guestCount === 1 ? "guest" : "guests"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">When</dt>
                <dd className="text-right font-medium text-stone-900">
                  {form.date && formatDisplayDate(form.date)}, {slotLabel(form.time)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Rate</dt>
                <dd className="text-right font-medium text-stone-900">
                  {formatRupees(deposit.rate)} per person{deposit.isFamilyOffer ? " (family offer)" : ""}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-stone-200 pt-3">
                <dt className="font-semibold text-stone-900">Total deposit</dt>
                <dd className="font-serif text-2xl font-bold text-stone-900">{formatRupees(deposit.total)}</dd>
              </div>
            </dl>

            <p className="mt-4 text-xs leading-relaxed text-stone-500">
              This deposit is non-refundable, including cancellations and no-shows.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
              <button
                type="button"
                onClick={handlePay}
                disabled={isPaying}
                className="flex flex-1 items-center justify-center gap-3 rounded-lg bg-amber-500 px-6 py-3 font-semibold text-stone-950 transition hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPaying ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  `Pay ${formatRupees(deposit.total)}`
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowPayment(false)}
                disabled={isPaying}
                className="rounded-lg border border-stone-300 px-6 py-3 font-semibold text-stone-700 transition hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success modal */}
      {showSuccess && booking && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-title"
          onClick={() => setShowSuccess(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 id="success-title" className="mt-5 font-serif text-2xl font-bold text-stone-900">
              Reservation Success!
            </h3>

            <p className="mt-3 leading-relaxed text-stone-600">
              Thank you, <span className="font-semibold text-stone-900">{booking.name}</span>.
              Your table for{" "}
              <span className="font-semibold text-stone-900">
                {booking.guests} {Number(booking.guests) === 1 ? "guest" : "guests"}
              </span>{" "}
              on{" "}
              <span className="font-semibold text-stone-900">{formatDisplayDate(booking.date)}</span>{" "}
              at <span className="font-semibold text-stone-900">{slotLabel(booking.time)}</span> is
              confirmed. Deposit paid: {formatRupees(booking.deposit)}.
            </p>

            <p className="mt-5 text-xs font-medium uppercase tracking-widest text-stone-500">
              Your booking code
            </p>
            <p className="mt-1 rounded-lg bg-stone-900 px-4 py-3 font-mono text-2xl font-bold tracking-widest text-amber-300">
              {booking.code}
            </p>
            <p className="mt-3 text-sm text-stone-500">
              Show this code to our staff at the entrance to check in.
            </p>

            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="mt-7 w-full rounded-lg bg-stone-900 px-6 py-3 font-semibold text-amber-400 transition hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
