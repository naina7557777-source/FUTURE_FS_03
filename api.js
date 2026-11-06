// Thin wrappers around the café API. Requests go to /api/..., which the Vite dev server
// forwards to the Node server (see the proxy setting in vite.config.js).

export class ApiError extends Error {
  constructor(message, status = 0, fieldErrors = null) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const request = async (url, options = {}) => {
  const { headers, ...rest } = options;
  let response;

  try {
    response = await fetch(url, {
      ...rest,
      headers: { "Content-Type": "application/json", ...headers },
    });
  } catch {
    throw new ApiError("Cannot reach the server. Make sure it is running (npm run server).");
  }

  const isJson = (response.headers.get("content-type") ?? "").includes("application/json");
  const data = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    // A 5xx with no JSON body usually means the Vite proxy could not reach the Node server
    const fallback =
      response.status >= 500
        ? "Cannot reach the server. Make sure it is running (npm run server)."
        : "Something went wrong. Please try again.";
    throw new ApiError(data.error || fallback, response.status, data.errors ?? null);
  }

  // A normal page instead of JSON means /api is not being forwarded to the Node server
  if (!isJson) {
    throw new ApiError(
      "The website could not reach the API. Check the proxy setting in vite.config.js and restart npm run dev."
    );
  }

  return data;
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

// Customer
export const getAvailability = (date) =>
  request(`/api/availability?date=${encodeURIComponent(date)}`);

export const createReservation = (payload) =>
  request("/api/reservations", { method: "POST", body: JSON.stringify(payload) });

export const lookupReservations = (codes) =>
  codes.length > 0
    ? request(`/api/reservations/lookup?codes=${encodeURIComponent(codes.join(","))}`)
    : Promise.resolve([]);

export const cancelReservation = (code) =>
  request(`/api/reservations/${encodeURIComponent(code)}`, { method: "DELETE" });

// Staff
export const staffLogin = (username, password) =>
  request("/api/staff/login", { method: "POST", body: JSON.stringify({ username, password }) });

export const staffGetReservations = (token) =>
  request("/api/staff/reservations", { headers: auth(token) });

export const staffCheckIn = (token, code) =>
  request("/api/staff/checkin", { method: "POST", headers: auth(token), body: JSON.stringify({ code }) });
