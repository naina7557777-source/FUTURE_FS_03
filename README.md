**CIN ID:** FIT/OCT26/FS21724
# Cardamom & Crema: Local Business Website

**Internship Track:** Full Stack Web Development (FS)
**Task:** 3, Local Business Website & Live Pitch Project
**Submission folder:** `FUTURE_FS_03`

A modern, fully responsive website for a café and restaurant in Lucknow, built with React, Tailwind CSS and a small Node/Express API. Customers browse the menu, pick a time slot with live seat availability, pay a booking deposit and receive a booking code. Café staff log in on a separate screen and check customers in with that code.

## Features

**Customer website**
- Responsive navbar with a mobile menu, a "Book a Table" button and a Staff login button.
- Hero section with floating gradients and animated stats counters.
- Menu with category filters (All, Coffee, Desserts, Mains) and price badges in ₹.
- Reservation form with live validation, time slots that show seats left (or "Full"), and a non-refundable deposit that is shown live while booking.
  - ₹100 per person, or ₹80 per person for parties of 4 or more (family offer).
- Demo payment step, then a success pop-up with a booking code.
- "Your reservations" list that shows only the bookings made on that customer's device, with a status of Upcoming, Visited or No-show.
- About section and a footer with opening hours, address, phone and map.

**Staff screen** (`/?view=staff`)
- Login checked by the server.
- Check customers in by entering their booking code, or with a "Mark as visited" button.
- Live list of all bookings, today's guests and total deposits collected.

## Tech Stack

| Layer | Technology |
| --- | --- |
| UI | React |
| Build tool | Vite |
| Styling | Tailwind CSS v4 |
| API | Node.js with Express |
| Data storage | JSON file (`server/data/reservations.json`) |

## Project Structure

```
FUTURE_FS_03/
├── server/
│   └── index.js            Express API (bookings, seats, staff login)
├── src/
│   ├── components/
│   │   ├── About.jsx
│   │   ├── Footer.jsx
│   │   ├── Hero.jsx
│   │   ├── Menu.jsx
│   │   ├── Navbar.jsx
│   │   ├── Reservation.jsx
│   │   └── Staff.jsx
│   ├── config/
│   │   └── business.js     Name, address, phone and map of the business
│   ├── lib/
│   │   ├── api.js          Calls to the API
│   │   └── reservations.js Pricing, time slots and formatting helpers
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm

### Install and run

```bash
npm install
```

The website and the API run as two separate processes, so open **two terminals** in the project folder and keep both running:

```bash
# Terminal 1: the API (http://localhost:5050)
npm run server

# Terminal 2: the website (http://localhost:5175)
npm run dev
```

On Windows PowerShell, if `npm run` is blocked by a security message, use `npm.cmd run server` instead, or run the commands in Command Prompt.

### Required settings

`package.json` needs this script:

```json
"server": "node server/index.js"
```

`vite.config.js` forwards `/api` requests to the Node server:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5175,
    strictPort: true,
    proxy: { "/api": "http://localhost:5050" },
  },
});
```

Restart `npm run dev` after changing this file.

### Using it from a phone

With `host: true`, Vite prints a `Network:` address such as `http://192.168.x.x:5175`. Open it on a phone connected to the same WiFi to book as a customer, while the staff screen stays open on the laptop.

### Staff login

Open the website and use the **Staff** button, or go to `/?view=staff`.

| Username | Password |
| --- | --- |
| `staff` | `aurora123` |

Change them in `server/index.js`, or set the `STAFF_USERNAME` and `STAFF_PASSWORD` environment variables before starting the server.

### Resetting test bookings

Stop the API (`Ctrl + C` in its terminal), delete `server/data/reservations.json`, then start it again.

## Customizing the Business

Edit `src/config/business.js` to change the name, city, address, phone number and Google Maps embed link. The navbar, footer, hero, about section and staff screen update automatically. Also update the `<title>` in `index.html`.

Menu items and prices are in `src/components/Menu.jsx`, opening hours in `src/components/Footer.jsx`, and deposit rates and time slots in `src/lib/reservations.js` (keep them in sync with the same values at the top of `server/index.js`).

## Notes and Limits

- **Payment is simulated.** The payment window says "Demo payment" and no money is charged. A real version would use a gateway such as Razorpay and confirm the payment on the server before creating a booking.
- **Seat counts include demo numbers.** Some slots (for example Friday and Saturday evenings) are marked full on purpose so the full state can be shown.
- **Storage is a JSON file.** It can be replaced with a database such as MongoDB.
- **Staff login is basic.** It is enough for a demo; a production system would use hashed passwords, HTTPS and proper sessions.

## Author

Built by **NAINA** as part of the Full Stack Web Development internship, Task 3.
