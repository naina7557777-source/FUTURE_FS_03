import { useState, useEffect, useCallback } from "react";
import { STATUS_STYLES, formatDisplayDate, formatRupees, slotLabel } from "../lib/reservations";
import { staffLogin, staffGetReservations, staffCheckIn } from "../lib/api";
import { BUSINESS } from "../config/business";

// Staff check-in screen. Open the site with ?view=staff to see it.
// The staff login is verified by the server. The login token lives only in memory, so leaving
// this page or refreshing it asks for the login again.
export default function Staff() {
  const [token, setToken] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [reservations, setReservations] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [message, setMessage] = useState(null);

  // Returns true when the error was an expired session, and sends the staff member back to the login
  const handleSessionError = useCallback((error) => {
    if (error.status !== 401) return false;
    setToken(null);
    setLoginError("Your session expired. Please log in again.");
    return true;
  }, []);

  const loadList = useCallback(async () => {
    try {
      setReservations(await staffGetReservations(token));
      setLoadError("");
    } catch (error) {
      if (!handleSessionError(error)) setLoadError(error.message);
    }
  }, [token, handleSessionError]);

  // Load the list after login and refresh it every few seconds, so new bookings appear on their own
  useEffect(() => {
    if (!token) return undefined;
    loadList();
    const timer = setInterval(loadList, 4000);
    return () => clearInterval(timer);
  }, [token, loadList]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (isLoggingIn) return;

    setIsLoggingIn(true);
    setLoginError("");
    try {
      const data = await staffLogin(loginForm.username.trim(), loginForm.password);
      setToken(data.token);
      setLoginForm({ username: "", password: "" });
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setReservations([]);
    setMessage(null);
    setCodeInput("");
  };

  const checkInByCode = async (rawCode) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      setMessage({ type: "error", text: "Enter a booking code." });
      return;
    }

    try {
      const item = await staffCheckIn(token, code);
      setMessage({
        type: "success",
        text: `${item.name} checked in: ${item.guests} ${Number(item.guests) === 1 ? "guest" : "guests"} at ${slotLabel(item.time)}.`,
      });
      setCodeInput("");
      loadList();
    } catch (error) {
      if (!handleSessionError(error)) setMessage({ type: "error", text: error.message });
    }
  };

  const handleCodeSubmit = (event) => {
    event.preventDefault();
    checkInByCode(codeInput);
  };

  // ---------- Login screen ----------
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 px-4 font-sans text-stone-200">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl bg-stone-900 p-8 ring-1 ring-white/10"
        >
          <p className="text-sm text-amber-400">{BUSINESS.name}</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-white">Staff login</h1>
          <p className="mt-2 text-sm text-stone-400">Sign in to check customers in.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-semibold text-stone-300">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={loginForm.username}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
                className="w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-stone-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {loginError && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="mt-6 w-full rounded-lg bg-amber-500 px-6 py-3 font-semibold text-stone-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoggingIn ? "Logging in..." : "Log in"}
          </button>
          <a
            href="/"
            className="mt-4 block text-center text-sm text-stone-400 transition hover:text-amber-400"
          >
            Back to website
          </a>
        </form>
      </div>
    );
  }

  // ---------- Staff dashboard ----------
  const sorted = [...reservations].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );
  const todays = reservations.filter((item) => item.isToday);

  const stats = [
    { label: "Bookings today", value: todays.length },
    { label: "Guests expected today", value: todays.reduce((sum, item) => sum + Number(item.guests), 0) },
    { label: "Checked in", value: reservations.filter((item) => item.status === "visited").length },
    { label: "Deposits collected", value: formatRupees(reservations.reduce((sum, item) => sum + Number(item.deposit || 0), 0)) },
  ];

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-10 font-sans text-stone-200 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-amber-400">{BUSINESS.name}</p>
            <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl">Staff check-in</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-stone-300 transition hover:border-red-400 hover:text-red-400"
            >
              Log out
            </button>
            <a
              href="/"
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-stone-300 transition hover:border-amber-400 hover:text-amber-400"
            >
              Back to website
            </a>
          </div>
        </div>

        {loadError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {loadError}
          </p>
        )}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-stone-900 p-5 ring-1 ring-white/10">
              <p className="font-serif text-2xl font-bold text-amber-400 sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm text-stone-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Check in by code */}
        <form onSubmit={handleCodeSubmit} className="mt-8 rounded-2xl bg-stone-900 p-6 ring-1 ring-white/10">
          <label htmlFor="code" className="block text-sm font-semibold text-white">
            Customer's booking code
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="code"
              type="text"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              placeholder="AUR-XXXXX"
              autoComplete="off"
              className="flex-1 rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 font-mono tracking-widest text-white placeholder-stone-600 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-stone-950 transition hover:bg-amber-400"
            >
              Check in
            </button>
          </div>
          {message && (
            <p
              role="status"
              className={`mt-3 text-sm ${message.type === "success" ? "text-green-400" : "text-red-400"}`}
            >
              {message.text}
            </p>
          )}
        </form>

        {/* All reservations */}
        <h2 className="mt-10 font-serif text-2xl font-bold text-white">All reservations</h2>

        {sorted.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-stone-700 px-6 py-10 text-center text-stone-500">
            No reservations yet. When a customer books a table, it appears here.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {sorted.map((item) => {
              const style = STATUS_STYLES[item.status];
              const canCheckIn = item.status === "upcoming" && item.isToday;
              return (
                <li
                  key={item.code}
                  className="grid items-center gap-4 rounded-xl bg-stone-900 p-5 ring-1 ring-white/10 sm:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-sm font-bold tracking-widest text-amber-300">{item.code}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}>
                        {style.label}
                      </span>
                      {item.isToday && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-stone-300">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="mt-2 truncate font-semibold text-white">
                      {item.name} <span className="font-normal text-stone-400">· {item.email}</span>
                    </p>
                    <p className="mt-1 text-sm text-stone-400">
                      {formatDisplayDate(item.date)}, {slotLabel(item.time)} · {item.guests}{" "}
                      {Number(item.guests) === 1 ? "guest" : "guests"} · Deposit {formatRupees(item.deposit)}
                    </p>
                  </div>

                  {canCheckIn && (
                    <button
                      type="button"
                      onClick={() => checkInByCode(item.code)}
                      className="rounded-lg bg-green-500/15 px-5 py-2.5 text-sm font-semibold text-green-400 transition hover:bg-green-500/25"
                    >
                      Mark as visited
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
